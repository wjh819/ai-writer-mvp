from __future__ import annotations

import json
import logging
import re
from typing import Any

from langchain_core.messages import HumanMessage

from contracts.workflow_contracts import (
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
    WorkflowNode,
)
from backend_workflow_engine.engine_runtime import WorkflowRunRuntime
from backend_workflow_engine.engine_prompt_window import (
    _commit_prompt_window,
    _resolve_prompt_window_runtime,
)
from backend_workflow_engine.engine_step_builders import (
    _build_published_state,
    _get_output_spec_map,
    _get_primary_state_key,
    _get_single_output_spec,
)

_SINGLE_OUTPUT_OUTER_FENCE_RE = re.compile(
    r"^\s*```(?:json|markdown|md|text)?\s*\n(?P<body>[\s\S]*?)\n```\s*$",
    re.IGNORECASE,
)
logger = logging.getLogger(__name__)


def _strip_outer_fence(text: str) -> str:
    match = _SINGLE_OUTPUT_OUTER_FENCE_RE.match(text.strip())
    if not match:
        return text
    return match.group("body")


def _coerce_single_output_text(
    *,
    node: WorkflowNode,
    output_name: str,
    raw_text: str,
    bound_inputs: dict[str, Any],
    rendered_prompt: str,
    window_runtime: dict[str, Any],
    structured_output_error_cls: type[Exception],
) -> str:
    original = raw_text if isinstance(raw_text, str) else str(raw_text)
    unfenced = _strip_outer_fence(original).strip()

    looks_like_wrapped_json = (
        unfenced.startswith("{")
        or original.strip().lower().startswith("```json")
    )

    if looks_like_wrapped_json:
        try:
            parsed = json.loads(unfenced)
        except Exception as exc:
            raise structured_output_error_cls(
                f"Node '{node.id}' single-output prompt returned invalid or incomplete JSON wrapper. "
                f"Return plain text only for '{output_name}', or return a valid single-key JSON object.",
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                window_mode=window_runtime["window_mode"],
                window_source_node_id=window_runtime["window_source_node_id"],
                window_id=window_runtime["window_id"],
                window_parent_id=window_runtime["window_parent_id"],
            ) from exc

        if not isinstance(parsed, dict):
            raise structured_output_error_cls(
                f"Node '{node.id}' single-output prompt must return plain text, "
                f"or a JSON object containing only '{output_name}'",
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                window_mode=window_runtime["window_mode"],
                window_source_node_id=window_runtime["window_source_node_id"],
                window_id=window_runtime["window_id"],
                window_parent_id=window_runtime["window_parent_id"],
            )

        actual_keys = set(parsed.keys())
        expected_keys = {output_name}
        if actual_keys != expected_keys:
            raise structured_output_error_cls(
                f"Node '{node.id}' single-output prompt returned JSON keys {sorted(actual_keys)}, "
                f"expected only {sorted(expected_keys)}",
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                window_mode=window_runtime["window_mode"],
                window_source_node_id=window_runtime["window_source_node_id"],
                window_id=window_runtime["window_id"],
                window_parent_id=window_runtime["window_parent_id"],
            )

        value = parsed[output_name]
        if value is None:
            return ""

        if isinstance(value, str):
            return value

        return json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
            default=str,
        )

    return original


def _safe_preview_text(value: Any, limit: int = 200) -> str:
    text = value if isinstance(value, str) else str(value)
    text = text.replace("\r", "\\r").replace("\n", "\\n")
    if len(text) <= limit:
        return text
    return text[:limit] + "...<truncated>"


def _extract_llm_debug_metadata(response: Any) -> dict[str, Any]:
    response_metadata = getattr(response, "response_metadata", None)
    usage_metadata = getattr(response, "usage_metadata", None)
    content = getattr(response, "content", None)
    additional_kwargs = getattr(response, "additional_kwargs", None)
    message_id = getattr(response, "id", None)

    finish_reason = None
    model_name = None

    if isinstance(response_metadata, dict):
        finish_reason = (
            response_metadata.get("finish_reason")
            or response_metadata.get("stop_reason")
            or response_metadata.get("finishReason")
        )
        model_name = (
            response_metadata.get("model_name")
            or response_metadata.get("model")
        )

    return {
        "message_id": message_id,
        "content_type": type(content).__name__,
        "content_preview": _safe_preview_text(content, limit=300),
        "content_length": len(content) if isinstance(content, str) else None,
        "finish_reason": finish_reason,
        "model_name": model_name,
        "response_metadata": response_metadata if isinstance(response_metadata, dict) else response_metadata,
        "usage_metadata": usage_metadata if isinstance(usage_metadata, dict) else usage_metadata,
        "additional_kwargs": additional_kwargs if isinstance(additional_kwargs, dict) else additional_kwargs,
    }


def _resolve_bound_inputs(
    self,
    node_id: str,
    state: dict[str, Any],
    *,
    strict: bool = True,
) -> dict[str, Any]:
    resolved: dict[str, Any] = {}

    for edge in self.incoming_edges_by_target.get(node_id, []) or []:
        source_node = self.node_map.get(edge.source)
        if not source_node:
            raise self._workflow_definition_error_cls(
                f"Edge source node not found: {edge.source}"
            )

        source_output_map = _get_output_spec_map(
            source_node,
            definition_error_cls=self._workflow_definition_error_cls,
        )
        source_state_key = source_output_map.get(edge.sourceOutput)
        if not source_state_key:
            raise self._workflow_definition_error_cls(
                f"Edge sourceOutput '{edge.sourceOutput}' not found on node '{edge.source}'"
            )

        if source_state_key not in state:
            if strict:
                raise self._missing_inputs_error_cls(
                    f"Node '{node_id}' missing required input for binding "
                    f"'{edge.targetInput}' from '{edge.source}.{edge.sourceOutput}'"
                )
            continue

        resolved[edge.targetInput] = state[source_state_key]

    return resolved


def _resolve_prompt_text(
    self,
    node: WorkflowNode,
    config: PromptNodeConfig,
) -> str:
    override_prompt_text = self.prompt_overrides.get(node.id)
    if override_prompt_text is not None and str(override_prompt_text).strip():
        return str(override_prompt_text).strip()

    prompt_text = (config.promptText or "").strip()
    if not prompt_text:
        raise self._workflow_definition_error_cls(
            f"Node '{node.id}' prompt text is empty"
        )

    return prompt_text


def run_input_node(self, node: WorkflowNode, state: dict[str, Any]):
    config = node.config
    if not isinstance(config, InputNodeConfig):
        raise self._workflow_definition_error_cls(
            f"Node '{node.id}' is not an input node"
        )

    output_spec = _get_single_output_spec(
        node,
        definition_error_cls=self._workflow_definition_error_cls,
    )
    value = state.get(config.inputKey, config.defaultValue)

    named_outputs = {
        output_spec.name: value,
    }

    step_info = self._input_success_step_cls(
        node_id=node.id,
        primary_state_key=output_spec.stateKey,
        value=value,
        published_state=_build_published_state(
            node=node,
            named_outputs=named_outputs,
            definition_error_cls=self._workflow_definition_error_cls,
        ),
    )

    return step_info, named_outputs


def run_prompt_node(
    self,
    node: WorkflowNode,
    state: dict[str, Any],
    *,
    runtime: WorkflowRunRuntime,
    bound_inputs_override: dict[str, Any] | None = None,
    window_runtime_override: dict[str, Any] | None = None,
    allowed_context_source_node_ids: set[str] | None = None,
):
    config = node.config
    if not isinstance(config, PromptNodeConfig):
        raise self._workflow_definition_error_cls(
            f"Node '{node.id}' is not a prompt node"
        )

    bound_inputs = (
        dict(bound_inputs_override)
        if bound_inputs_override is not None
        else self._resolve_bound_inputs(node.id, state, strict=True)
    )
    primary_state_key = _get_primary_state_key(
        node,
        definition_error_cls=self._workflow_definition_error_cls,
    )

    prompt_template = self._resolve_prompt_text(node, config)
    window_runtime = (
        dict(window_runtime_override)
        if window_runtime_override is not None
        else _resolve_prompt_window_runtime(
            node_id=node.id,
            incoming_context_link_by_target=self.incoming_context_link_by_target,
            runtime=runtime,
            definition_error_cls=self._workflow_definition_error_cls,
            allowed_source_node_ids=allowed_context_source_node_ids,
        )
    )

    try:
        rendered_prompt = prompt_template.format(**bound_inputs)
    except KeyError as exc:
        raise self._prompt_render_error_cls(
            f"Node '{node.id}' prompt formatting failed, missing variable: {exc}",
            bound_inputs=bound_inputs,
            rendered_prompt=None,
            window_mode=window_runtime["window_mode"],
            window_source_node_id=window_runtime["window_source_node_id"],
            window_id=window_runtime["window_id"],
            window_parent_id=window_runtime["window_parent_id"],
        ) from exc

    llm_config = config.llm
    try:
        model_resource = self.model_resource_resolver(config.modelResourceId)
    except Exception as exc:
        raise self._workflow_definition_error_cls(
            f"Node '{node.id}' model resource resolve failed: {exc}"
        ) from exc

    llm = self.llm_factory(
        provider=model_resource["provider"],
        api_key=model_resource["api_key"],
        model=model_resource["model"],
        temperature=llm_config.temperature,
        timeout=llm_config.timeout,
        max_retries=llm_config.max_retries,
        base_url=model_resource["base_url"],
    )

    try:
        messages_to_invoke = list(window_runtime["base_messages"] or [])
        messages_to_invoke.append(HumanMessage(content=rendered_prompt))

        response = self.llm_invoker(
            llm,
            messages=messages_to_invoke,
        )

        llm_debug_metadata = _extract_llm_debug_metadata(response)

        logger.warning(
            "LLM debug | node=%s | provider=%s | model=%s | metadata=%s",
            node.id,
            model_resource["provider"],
            model_resource["model"],
            json.dumps(
                llm_debug_metadata,
                ensure_ascii=False,
                default=str,
            ),
        )

        output_text = (
            response.content
            if isinstance(response.content, str)
            else str(response.content)
        )

        output_specs = list(config.outputs or [])

        if len(output_specs) == 1:
            output_name = output_specs[0].name
            normalized_single_output_text = _coerce_single_output_text(
                node=node,
                output_name=output_name,
                raw_text=output_text,
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                window_runtime=window_runtime,
                structured_output_error_cls=self._structured_output_error_cls,
            )
            named_outputs = {
                output_name: normalized_single_output_text,
            }
        else:
            try:
                parsed = json.loads(output_text)
            except Exception as exc:
                raise self._structured_output_error_cls(
                    f"Node '{node.id}' multi-output prompt must return valid JSON object: {exc}",
                    bound_inputs=bound_inputs,
                    rendered_prompt=rendered_prompt,
                    window_mode=window_runtime["window_mode"],
                    window_source_node_id=window_runtime["window_source_node_id"],
                    window_id=window_runtime["window_id"],
                    window_parent_id=window_runtime["window_parent_id"],
                ) from exc

            if not isinstance(parsed, dict):
                raise self._structured_output_error_cls(
                    f"Node '{node.id}' multi-output prompt must return a JSON object",
                    bound_inputs=bound_inputs,
                    rendered_prompt=rendered_prompt,
                    window_mode=window_runtime["window_mode"],
                    window_source_node_id=window_runtime["window_source_node_id"],
                    window_id=window_runtime["window_id"],
                    window_parent_id=window_runtime["window_parent_id"],
                )

            expected_names = {spec.name for spec in output_specs}
            actual_names = set(parsed.keys())

            if actual_names != expected_names:
                raise self._structured_output_error_cls(
                    f"Node '{node.id}' multi-output prompt returned keys {sorted(actual_names)}, "
                    f"expected {sorted(expected_names)}",
                    bound_inputs=bound_inputs,
                    rendered_prompt=rendered_prompt,
                    window_mode=window_runtime["window_mode"],
                    window_source_node_id=window_runtime["window_source_node_id"],
                    window_id=window_runtime["window_id"],
                    window_parent_id=window_runtime["window_parent_id"],
                )

            named_outputs = parsed

    except self._workflow_node_execution_error_cls:
        raise
    except Exception as exc:
        raise self._workflow_node_execution_error_cls(
            str(exc),
            error_detail=str(exc),
            bound_inputs=bound_inputs,
            rendered_prompt=rendered_prompt,
            window_mode=window_runtime["window_mode"],
            window_source_node_id=window_runtime["window_source_node_id"],
            window_id=window_runtime["window_id"],
            window_parent_id=window_runtime["window_parent_id"],
        ) from exc

    _commit_prompt_window(
        node_id=node.id,
        window_runtime=window_runtime,
        rendered_prompt=rendered_prompt,
        output_text=output_text,
        runtime=runtime,
        definition_error_cls=self._workflow_definition_error_cls,
    )

    step_info = self._prompt_success_step_cls(
        node_id=node.id,
        primary_state_key=primary_state_key,
        bound_inputs=bound_inputs,
        rendered_prompt=rendered_prompt,
        raw_output_text=output_text,
        published_state=_build_published_state(
            node=node,
            named_outputs=named_outputs,
            definition_error_cls=self._workflow_definition_error_cls,
        ),
        window_mode=window_runtime["window_mode"],
        window_source_node_id=window_runtime["window_source_node_id"],
        window_id=window_runtime["window_id"],
        window_parent_id=window_runtime["window_parent_id"],
    )

    return step_info, named_outputs


def run_output_node(
    self,
    node: WorkflowNode,
    state: dict[str, Any],
    *,
    bound_inputs_override: dict[str, Any] | None = None,
):
    config = node.config
    if not isinstance(config, OutputNodeConfig):
        raise self._workflow_definition_error_cls(
            f"Node '{node.id}' is not an output node"
        )

    output_spec = _get_single_output_spec(
        node,
        definition_error_cls=self._workflow_definition_error_cls,
    )
    bound_inputs = (
        dict(bound_inputs_override)
        if bound_inputs_override is not None
        else self._resolve_bound_inputs(node.id, state, strict=True)
    )

    if len(bound_inputs) == 1:
        output_value = next(iter(bound_inputs.values()))
    else:
        output_value = dict(bound_inputs)

    if self.output_sink is not None:
        try:
            self.output_sink.export_output(
                node_id=node.id,
                value=output_value,
            )
        except Exception as exc:
            raise self._output_write_error_cls(
                f"Output node '{node.id}' failed to write markdown file",
                error_detail=str(exc),
                bound_inputs=bound_inputs,
            ) from exc

    named_outputs = {
        output_spec.name: output_value,
    }

    step_info = self._output_success_step_cls(
        node_id=node.id,
        primary_state_key=output_spec.stateKey,
        bound_inputs=bound_inputs,
        value=output_value,
        published_state=_build_published_state(
            node=node,
            named_outputs=named_outputs,
            definition_error_cls=self._workflow_definition_error_cls,
        ),
    )

    return step_info, named_outputs

