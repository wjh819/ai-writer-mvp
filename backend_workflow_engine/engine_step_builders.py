from __future__ import annotations

from typing import Any, Callable

from contracts.workflow_contracts import OutputNodeConfig, PromptNodeConfig, WorkflowNode
from backend_workflow_engine.execution_types import (
    ExecutionStep,
    InputFailedExecutionStep,
    OutputFailedExecutionStep,
    PromptFailedExecutionStep,
)


def _get_output_specs(
    node: WorkflowNode,
    *,
    definition_error_cls: type[Exception],
):
    outputs = list(getattr(node.config, "outputs", []) or [])
    if len(outputs) == 0:
        raise definition_error_cls(f"Node '{node.id}' has no outputs")
    return outputs


def _get_output_spec_map(
    node: WorkflowNode,
    *,
    definition_error_cls: type[Exception],
) -> dict[str, str]:
    return {
        spec.name: spec.stateKey
        for spec in _get_output_specs(node, definition_error_cls=definition_error_cls)
    }


def _get_primary_state_key(
    node: WorkflowNode,
    *,
    definition_error_cls: type[Exception],
) -> str:
    outputs = _get_output_specs(node, definition_error_cls=definition_error_cls)
    return outputs[0].stateKey


def _get_single_output_spec(
    node: WorkflowNode,
    *,
    definition_error_cls: type[Exception],
):
    outputs = _get_output_specs(node, definition_error_cls=definition_error_cls)
    if len(outputs) != 1:
        raise definition_error_cls(
            f"Node '{node.id}' must declare exactly one output at runtime"
        )
    return outputs[0]


def _build_published_state(
    *,
    node: WorkflowNode,
    named_outputs: dict[str, Any],
    definition_error_cls: type[Exception],
) -> dict[str, Any]:
    output_map = _get_output_spec_map(node, definition_error_cls=definition_error_cls)
    return {
        state_key: named_outputs[output_name]
        for output_name, state_key in output_map.items()
        if output_name in named_outputs
    }


def _publish_named_outputs(
    *,
    node: WorkflowNode,
    named_outputs: dict[str, Any],
    current_state: dict[str, Any],
    definition_error_cls: type[Exception],
) -> None:
    output_map = _get_output_spec_map(node, definition_error_cls=definition_error_cls)

    expected_names = set(output_map.keys())
    actual_names = set(named_outputs.keys())

    if actual_names != expected_names:
        raise definition_error_cls(
            f"Node '{node.id}' produced outputs {sorted(actual_names)}, "
            f"expected {sorted(expected_names)}"
        )

    for output_name, state_key in output_map.items():
        current_state[state_key] = named_outputs[output_name]


def _finalize_step_timing(
    step: ExecutionStep,
    *,
    started_at: str,
    finished_at: str,
    duration_ms: int,
) -> ExecutionStep:
    step.started_at = started_at
    step.finished_at = finished_at
    step.duration_ms = duration_ms
    return step


def _build_failed_step(
    *,
    node: WorkflowNode,
    state: dict[str, Any],
    error_message: str,
    definition_error_cls: type[Exception],
    resolve_bound_inputs: Callable[..., dict[str, Any]],
    build_prompt_window_metadata_for_failed_step: Callable[..., dict[str, Any]],
    error_detail: str | None = None,
    execution_error: Any | None = None,
    allowed_context_source_node_ids: set[str] | None = None,
) -> ExecutionStep:
    """
    鍩轰簬褰撳墠宸茬煡 execution context 鏋勯€?failed execution step銆?
    姝ｅ紡鍙ｅ緞锛?    - failed step 灏介噺淇濈暀澶辫触鍓嶅凡鐭ョ殑缁撴瀯鍖栦笂涓嬫枃
    - prompt failed step 鍙惡甯?bound_inputs / rendered_prompt / window metadata
    - 澶辫触璺緞瀛楁鍏佽姣?success step 鏇翠笉瀹屾暣

    涓嶈礋璐ｏ細
    - 鐢熸垚 run 绾?failure summary
    """
    config = node.config

    try:
        primary_state_key = _get_primary_state_key(
            node,
            definition_error_cls=definition_error_cls,
        )
    except Exception:
        primary_state_key = None

    if isinstance(config, PromptNodeConfig):
        if execution_error is not None:
            bound_inputs = dict(getattr(execution_error, "bound_inputs", {}) or {})
            rendered_prompt = getattr(execution_error, "rendered_prompt", None)
            window_mode = getattr(execution_error, "window_mode", None)
            window_source_node_id = getattr(
                execution_error,
                "window_source_node_id",
                None,
            )
            window_id = getattr(execution_error, "window_id", None)
            window_parent_id = getattr(execution_error, "window_parent_id", None)
        else:
            try:
                bound_inputs = resolve_bound_inputs(
                    node.id,
                    state,
                    strict=False,
                )
            except Exception:
                bound_inputs = {}

            rendered_prompt = None

            window_metadata = build_prompt_window_metadata_for_failed_step(
                node_id=node.id,
                allowed_source_node_ids=allowed_context_source_node_ids,
            )
            window_mode = window_metadata["window_mode"]
            window_source_node_id = window_metadata["window_source_node_id"]
            window_id = window_metadata["window_id"]
            window_parent_id = window_metadata["window_parent_id"]

        return PromptFailedExecutionStep(
            node_id=node.id,
            primary_state_key=primary_state_key,
            bound_inputs=bound_inputs,
            rendered_prompt=rendered_prompt,
            error_message=error_message,
            error_detail=error_detail or error_message,
            window_mode=window_mode,
            window_source_node_id=window_source_node_id,
            window_id=window_id,
            window_parent_id=window_parent_id,
        )

    if isinstance(config, OutputNodeConfig):
        if execution_error is not None:
            bound_inputs = dict(getattr(execution_error, "bound_inputs", {}) or {})
        else:
            try:
                bound_inputs = resolve_bound_inputs(
                    node.id,
                    state,
                    strict=False,
                )
            except Exception:
                bound_inputs = {}

        return OutputFailedExecutionStep(
            node_id=node.id,
            primary_state_key=primary_state_key,
            bound_inputs=bound_inputs,
            error_message=error_message,
            error_detail=error_detail or error_message,
        )

    return InputFailedExecutionStep(
        node_id=node.id,
        primary_state_key=primary_state_key,
        error_message=error_message,
        error_detail=error_detail or error_message,
    )


