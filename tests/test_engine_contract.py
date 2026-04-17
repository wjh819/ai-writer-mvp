from __future__ import annotations

import pathlib
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from contracts.workflow_contracts import (
    InputNodeConfig,
    LLMConfig,
    NodeOutputSpec,
    OutputNodeConfig,
    Position,
    PromptNodeConfig,
    WorkflowContextLink,
    WorkflowEdge,
    WorkflowEditorData,
    WorkflowNode,
)
from backend_workflow_engine import WorkflowEngine
from backend_workflow_engine.execution_types import WorkflowRunError


def _position() -> Position:
    return Position(x=0, y=0)


def _llm_config() -> LLMConfig:
    return LLMConfig(temperature=0, timeout=30, max_retries=0)


def _input_node(node_id: str, *, input_key: str, state_key: str, default_value: str) -> WorkflowNode:
    return WorkflowNode(
        id=node_id,
        position=_position(),
        config=InputNodeConfig(
            type="input",
            inputKey=input_key,
            outputs=[NodeOutputSpec(name="value", stateKey=state_key)],
            defaultValue=default_value,
        ),
    )


def _prompt_node(
    node_id: str,
    *,
    prompt_text: str,
    output_name: str = "text",
    state_key: str,
) -> WorkflowNode:
    return WorkflowNode(
        id=node_id,
        position=_position(),
        config=PromptNodeConfig(
            type="prompt",
            promptText=prompt_text,
            modelResourceId="model-a",
            llm=_llm_config(),
            outputs=[NodeOutputSpec(name=output_name, stateKey=state_key)],
        ),
    )


def _output_node(node_id: str, *, state_key: str) -> WorkflowNode:
    return WorkflowNode(
        id=node_id,
        position=_position(),
        config=OutputNodeConfig(
            type="output",
            outputs=[NodeOutputSpec(name="result", stateKey=state_key)],
        ),
    )


def _edge(source: str, source_output: str, target: str, target_input: str) -> WorkflowEdge:
    return WorkflowEdge(
        source=source,
        sourceOutput=source_output,
        target=target,
        targetInput=target_input,
    )


def _context_link(link_id: str, source: str, target: str, mode: str) -> WorkflowContextLink:
    return WorkflowContextLink(
        id=link_id,
        source=source,
        target=target,
        mode=mode,
    )


def _workflow(*, nodes: list[WorkflowNode], edges: list[WorkflowEdge] | None = None, context_links: list[WorkflowContextLink] | None = None) -> WorkflowEditorData:
    return WorkflowEditorData(
        nodes=nodes,
        edges=list(edges or []),
        contextLinks=list(context_links or []),
    )


def _patch_engine_runtime(monkeypatch, responses_or_callable):
    model_resource_registry = {
        "model-a": {
            "provider": "openai_compatible",
            "api_key": "test-key",
            "model": "test-model",
            "base_url": "http://example.test",
        }
    }

    def resolve_model_resource_port(model_resource_id: str):
        normalized_id = str(model_resource_id or "").strip()
        if not normalized_id:
            raise ValueError("Prompt node modelResourceId is required for run")

        if normalized_id not in model_resource_registry:
            raise ValueError(f"Unknown model resource id: {normalized_id}")

        return model_resource_registry[normalized_id]

    monkeypatch.setattr(
        "backend_workflow_engine.engine._unconfigured_model_resource_resolver",
        resolve_model_resource_port,
    )
    monkeypatch.setattr("backend_workflow_engine.engine._unconfigured_llm_factory", lambda **_kwargs: object())

    if callable(responses_or_callable):
        invoke = responses_or_callable
    else:
        remaining = list(responses_or_callable)

        def invoke(_llm, *, messages=None, prompt=None):
            _ = prompt
            response = remaining.pop(0)
            if isinstance(response, Exception):
                raise response
            return SimpleNamespace(content=response)

    monkeypatch.setattr("backend_workflow_engine.engine._unconfigured_llm_invoker", invoke)


def test_run_success_baseline(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="cats"),
            _prompt_node("prompt_1", prompt_text="Write about {topic}", state_key="draft"),
            _output_node("output_1", state_key="final_text"),
        ],
        edges=[
            _edge("input_1", "value", "prompt_1", "topic"),
            _edge("prompt_1", "text", "output_1", "body"),
        ],
    )
    _patch_engine_runtime(monkeypatch, ["draft about cats"])

    final_state, steps = WorkflowEngine(workflow).run({})

    assert [step.node_id for step in steps] == ["input_1", "prompt_1", "output_1"]
    assert [step.status for step in steps] == ["success", "success", "success"]
    assert steps[0].published_state == {"topic": "cats"}
    assert steps[1].published_state == {"draft": "draft about cats"}
    assert steps[2].published_state == {"final_text": "draft about cats"}
    assert final_state == {
        "topic": "cats",
        "draft": "draft about cats",
        "final_text": "draft about cats",
    }


def test_run_failed_baseline_preserves_partial_state(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="cats"),
            _prompt_node("prompt_1", prompt_text="Write about {topic}", state_key="draft"),
            _output_node("output_1", state_key="final_text"),
        ],
        edges=[
            _edge("input_1", "value", "prompt_1", "topic"),
            _edge("prompt_1", "text", "output_1", "body"),
        ],
    )
    _patch_engine_runtime(monkeypatch, [RuntimeError("llm boom")])

    with pytest.raises(WorkflowRunError) as exc_info:
        WorkflowEngine(workflow).run({})

    error = exc_info.value
    assert error.error_type == "node_execution_failed"
    assert error.failure_stage == "execution"
    assert error.partial_state == {"topic": "cats"}
    assert [step.node_id for step in error.steps] == ["input_1", "prompt_1"]
    assert [step.status for step in error.steps] == ["success", "failed"]
    assert error.steps[1].bound_inputs == {"topic": "cats"}
    assert error.steps[1].rendered_prompt == "Write about cats"


def test_success_path_notifies_after_state_publish_and_step_append(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="cats"),
        ],
    )
    _patch_engine_runtime(monkeypatch, [])

    events: list[tuple[str, object]] = []

    class ProgressCallback:
        def on_node_succeeded(self, *, current_state, steps):
            events.append(("notify", dict(current_state), [step.node_id for step in steps]))

    engine = WorkflowEngine(workflow, progress_callback=ProgressCallback())
    final_state, steps = engine.run({})

    assert events == [("notify", {"topic": "cats"}, ["input_1"])]
    assert final_state == {"topic": "cats"}
    assert [step.node_id for step in steps] == ["input_1"]


def test_run_subgraph_limits_execution_scope(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="unused"),
            _prompt_node("prompt_a", prompt_text="A:{topic}", state_key="draft_a"),
            _prompt_node("prompt_b", prompt_text="B", state_key="draft_b"),
            _prompt_node("prompt_side", prompt_text="SIDE", state_key="draft_side"),
            _output_node("output_1", state_key="final_text"),
        ],
        edges=[
            _edge("input_1", "value", "prompt_a", "topic"),
            _edge("prompt_a", "text", "prompt_b", "upstream"),
            _edge("prompt_a", "text", "prompt_side", "upstream"),
            _edge("prompt_b", "text", "output_1", "body"),
        ],
    )
    _patch_engine_runtime(monkeypatch, ["from-a", "from-b"])

    final_state, steps = WorkflowEngine(workflow).run_subgraph(
        start_node_id="prompt_a",
        end_node_ids=["prompt_b"],
        state={"topic": "cats"},
    )

    assert [step.node_id for step in steps] == ["prompt_a", "prompt_b"]
    assert "draft_side" not in final_state
    assert "final_text" not in final_state
    assert final_state == {
        "topic": "cats",
        "draft_a": "from-a",
        "draft_b": "from-b",
    }


def test_subgraph_downgrades_external_context_source_to_new_window(monkeypatch):
    workflow = _workflow(
        nodes=[
            _prompt_node("prompt_root", prompt_text="ROOT", state_key="root_text"),
            _prompt_node("prompt_child", prompt_text="CHILD", state_key="child_text"),
        ],
        context_links=[
            _context_link("link_1", "prompt_root", "prompt_child", "continue"),
        ],
    )
    _patch_engine_runtime(monkeypatch, ["child-answer"])

    final_state, steps = WorkflowEngine(workflow).run_subgraph(
        start_node_id="prompt_child",
        state={},
    )

    assert final_state == {"child_text": "child-answer"}
    assert [step.node_id for step in steps] == ["prompt_child"]
    assert steps[0].window_mode == "new_window"
    assert steps[0].window_source_node_id is None
    assert steps[0].window_parent_id is None


def test_prompt_window_continue_and_branch_use_different_histories(monkeypatch):
    workflow = _workflow(
        nodes=[
            _prompt_node("prompt_source", prompt_text="SOURCE", state_key="source_text"),
            _prompt_node("prompt_continue", prompt_text="CONTINUE", state_key="continue_text"),
            _prompt_node("prompt_branch", prompt_text="BRANCH", state_key="branch_text"),
        ],
        context_links=[
            _context_link("link_continue", "prompt_source", "prompt_continue", "continue"),
            _context_link("link_branch", "prompt_source", "prompt_branch", "branch"),
        ],
    )

    seen_messages: list[list[str]] = []
    responses = iter(["source-answer", "continue-answer", "branch-answer"])

    def invoke(_llm, *, messages=None, prompt=None):
        _ = prompt
        seen_messages.append([getattr(message, "content", None) for message in list(messages or [])])
        return SimpleNamespace(content=next(responses))

    _patch_engine_runtime(monkeypatch, invoke)

    _final_state, steps = WorkflowEngine(workflow).run({})

    assert [step.node_id for step in steps] == [
        "prompt_source",
        "prompt_continue",
        "prompt_branch",
    ]
    assert steps[0].window_mode == "new_window"
    assert steps[1].window_mode == "continue"
    assert steps[2].window_mode == "branch"
    assert steps[1].window_id == steps[0].window_id
    assert steps[2].window_id != steps[0].window_id
    assert steps[2].window_parent_id == steps[0].window_id

    assert seen_messages[0] == ["SOURCE"]
    assert seen_messages[1] == ["SOURCE", "source-answer", "CONTINUE"]
    assert seen_messages[2] == ["SOURCE", "source-answer", "BRANCH"]


def test_same_engine_second_run_does_not_reuse_prompt_window_history(monkeypatch):
    workflow = _workflow(
        nodes=[
            _prompt_node("prompt_source", prompt_text="SOURCE", state_key="source_text"),
            _prompt_node("prompt_continue", prompt_text="CONTINUE", state_key="continue_text"),
        ],
        context_links=[
            _context_link("link_continue", "prompt_source", "prompt_continue", "continue"),
        ],
    )

    seen_messages: list[list[str]] = []
    responses = iter(["source-1", "continue-1", "source-2", "continue-2"])

    def invoke(_llm, *, messages=None, prompt=None):
        _ = prompt
        seen_messages.append([getattr(message, "content", None) for message in list(messages or [])])
        return SimpleNamespace(content=next(responses))

    _patch_engine_runtime(monkeypatch, invoke)

    engine = WorkflowEngine(workflow)
    engine.run({})
    engine.run({})

    assert seen_messages[0] == ["SOURCE"]
    assert seen_messages[1] == ["SOURCE", "source-1", "CONTINUE"]
    assert seen_messages[2] == ["SOURCE"]
    assert seen_messages[3] == ["SOURCE", "source-2", "CONTINUE"]


def test_failed_prompt_does_not_commit_window_or_pollute_next_run_branch_baseline(monkeypatch):
    import backend_workflow_engine.engine_node_runners as engine_node_runners

    workflow = _workflow(
        nodes=[
            _prompt_node("prompt_source", prompt_text="SOURCE", state_key="source_text"),
            _prompt_node("prompt_continue", prompt_text="CONTINUE", state_key="continue_text"),
            _prompt_node("prompt_branch", prompt_text="BRANCH", state_key="branch_text"),
        ],
        context_links=[
            _context_link("link_continue", "prompt_source", "prompt_continue", "continue"),
            _context_link("link_branch", "prompt_source", "prompt_branch", "branch"),
        ],
    )

    seen_messages: list[list[str]] = []
    responses = iter(
        [
            "source-run-1",
            RuntimeError("continue boom"),
            "source-run-2",
            "continue-run-2",
            "branch-run-2",
        ]
    )
    committed_node_ids: list[str] = []

    original_commit_prompt_window = engine_node_runners._commit_prompt_window

    def tracked_commit_prompt_window(**kwargs):
        committed_node_ids.append(kwargs["node_id"])
        return original_commit_prompt_window(**kwargs)

    def invoke(_llm, *, messages=None, prompt=None):
        _ = prompt
        seen_messages.append([getattr(message, "content", None) for message in list(messages or [])])
        response = next(responses)
        if isinstance(response, Exception):
            raise response
        return SimpleNamespace(content=response)

    monkeypatch.setattr(engine_node_runners, "_commit_prompt_window", tracked_commit_prompt_window)
    _patch_engine_runtime(monkeypatch, invoke)

    engine = WorkflowEngine(workflow)

    with pytest.raises(WorkflowRunError):
        engine.run({})

    assert committed_node_ids == ["prompt_source"]

    engine.run({})

    assert seen_messages[2] == ["SOURCE"]
    assert seen_messages[3] == ["SOURCE", "source-run-2", "CONTINUE"]
    assert seen_messages[4] == ["SOURCE", "source-run-2", "BRANCH"]


def test_failed_path_notifies_after_failed_step_append(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="cats"),
            _prompt_node("prompt_1", prompt_text="Write about {topic}", state_key="draft"),
        ],
        edges=[
            _edge("input_1", "value", "prompt_1", "topic"),
        ],
    )
    _patch_engine_runtime(monkeypatch, [RuntimeError("llm boom")])

    events: list[tuple[str, list[str], list[str], str | None]] = []

    class ProgressCallback:
        def on_node_failed(self, *, steps, error_type, **_kwargs):
            events.append(
                (
                    "failed",
                    [step.node_id for step in steps],
                    [step.status for step in steps],
                    error_type,
                )
            )

    engine = WorkflowEngine(workflow, progress_callback=ProgressCallback())
    with pytest.raises(WorkflowRunError):
        engine.run({})

    assert events == [
        (
            "failed",
            ["input_1", "prompt_1"],
            ["success", "failed"],
            "node_execution_failed",
        )
    ]


def test_missing_inputs_error_classification(monkeypatch):
    workflow = _workflow(
        nodes=[
            _input_node("input_1", input_key="topic_input", state_key="topic", default_value="cats"),
            _prompt_node("prompt_1", prompt_text="Write about {topic}", state_key="draft"),
        ],
        edges=[
            _edge("input_1", "value", "prompt_1", "topic"),
        ],
    )
    _patch_engine_runtime(monkeypatch, [])

    with pytest.raises(WorkflowRunError) as exc_info:
        WorkflowEngine(workflow).run_subgraph(
            start_node_id="prompt_1",
            state={},
        )

    error = exc_info.value
    assert error.error_type == "missing_inputs"
    assert error.failure_stage == "execution"
    assert error.partial_state == {}
    assert [step.node_id for step in error.steps] == ["prompt_1"]
    assert [step.status for step in error.steps] == ["failed"]

