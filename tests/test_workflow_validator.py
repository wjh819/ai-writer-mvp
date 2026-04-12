from __future__ import annotations

import pathlib
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app_errors import InvalidInputError
from api.routes import run_routes, workflow_routes
from api.run_http_schemas import BatchRunRequest, RunDraftRequest, SubgraphTestRequest
from api.workflow_validator import validate_workflow_editor_data


class _ModelDumpResult:
    def __init__(self, payload):
        self.payload = payload

    def model_dump(self):
        return self.payload


def test_validate_workflow_editor_data_runs_structure_before_dependency(monkeypatch):
    workflow = object()
    calls: list[tuple[str, object]] = []

    def fake_structure(arg):
        calls.append(("structure", arg))

    def fake_dependency(arg):
        calls.append(("dependency", arg))

    monkeypatch.setattr("api.workflow_validator.validate_workflow_structure", fake_structure)
    monkeypatch.setattr(
        "api.workflow_validator.validate_workflow_dependencies",
        fake_dependency,
    )

    validate_workflow_editor_data(workflow)

    assert calls == [
        ("structure", workflow),
        ("dependency", workflow),
    ]


def test_validate_workflow_editor_data_prefers_structure_error_over_dependency(monkeypatch):
    structure_error = InvalidInputError("structure broken")

    def fake_structure(_workflow):
        raise structure_error

    def fail_dependency(_workflow):
        raise AssertionError("dependency validation must not run after structure failure")

    monkeypatch.setattr("api.workflow_validator.validate_workflow_structure", fake_structure)
    monkeypatch.setattr(
        "api.workflow_validator.validate_workflow_dependencies",
        fail_dependency,
    )

    with pytest.raises(InvalidInputError) as exc_info:
        validate_workflow_editor_data(object())

    assert exc_info.value is structure_error


def test_save_workflow_uses_validator_facade(monkeypatch):
    workflow_payload = {"nodes": []}
    normalized_workflow = object()
    validator_calls: list[object] = []

    monkeypatch.setattr(
        workflow_routes,
        "normalize_canvas_id",
        lambda canvas_id: canvas_id,
    )
    monkeypatch.setattr(
        workflow_routes,
        "get_canvas_workflow_path",
        lambda _canvas_id: "/tmp/workflow.yaml",
    )
    monkeypatch.setattr(
        workflow_routes,
        "get_canvas_metadata_path",
        lambda _canvas_id: "/tmp/metadata.yaml",
    )
    monkeypatch.setattr(
        workflow_routes,
        "split_save_workflow_payload",
        lambda workflow: (workflow, {}, False),
    )
    monkeypatch.setattr(
        workflow_routes,
        "normalize_workflow_editor_data",
        lambda workflow: normalized_workflow,
    )
    monkeypatch.setattr(
        workflow_routes,
        "validate_workflow_editor_data",
        lambda workflow: validator_calls.append(workflow),
    )
    monkeypatch.setattr(workflow_routes, "dump_canvas_prompt_files", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(workflow_routes, "editor_schema_to_yaml", lambda workflow: workflow)
    monkeypatch.setattr(workflow_routes, "dump_canvas_workflow", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        workflow_routes,
        "delete_orphan_canvas_prompt_files",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(workflow_routes, "dump_canvas_metadata", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(workflow_routes.os.path, "exists", lambda _path: False)

    result = workflow_routes.save_workflow("canvas-a", workflow_payload)

    assert result == {"status": "saved"}
    assert validator_calls == [normalized_workflow]


def test_run_draft_uses_validator_facade(monkeypatch):
    normalized_workflow = object()
    validator_calls: list[object] = []
    executed: dict[str, object] = {}

    monkeypatch.setattr(
        run_routes,
        "normalize_workflow_editor_data",
        lambda workflow: normalized_workflow,
    )
    monkeypatch.setattr(
        run_routes,
        "validate_workflow_editor_data",
        lambda workflow: validator_calls.append(workflow),
    )

    def fake_execute(**kwargs):
        executed.update(kwargs)
        return {"execution": "draft"}

    monkeypatch.setattr(run_routes, "execute_draft_workflow", fake_execute)
    monkeypatch.setattr(
        run_routes,
        "build_run_outcome_response",
        lambda execution: {"execution": execution},
    )

    result = run_routes.run_workflow_draft(
        "canvas-a",
        RunDraftRequest(workflow={"nodes": []}, input_state={"x": 1}, prompt_overrides={"p": "v"}),
    )

    assert validator_calls == [normalized_workflow]
    assert executed["workflow"] is normalized_workflow
    assert result == {"execution": {"execution": "draft"}}


def test_run_live_uses_validator_facade(monkeypatch):
    normalized_workflow = object()
    validator_calls: list[object] = []
    started: dict[str, object] = {}

    monkeypatch.setattr(run_routes, "_batch_store", SimpleNamespace(has_active_batch=lambda: False))
    monkeypatch.setattr(
        run_routes,
        "normalize_workflow_editor_data",
        lambda workflow: normalized_workflow,
    )
    monkeypatch.setattr(
        run_routes,
        "validate_workflow_editor_data",
        lambda workflow: validator_calls.append(workflow),
    )

    def fake_start_live_draft_workflow(**kwargs):
        started.update(kwargs)
        return _ModelDumpResult({"run_id": "run-1", "status": "running"})

    monkeypatch.setattr(run_routes, "start_live_draft_workflow", fake_start_live_draft_workflow)

    result = run_routes.run_workflow_live(
        "canvas-a",
        RunDraftRequest(workflow={"nodes": []}),
    )

    assert validator_calls == [normalized_workflow]
    assert started["workflow"] is normalized_workflow
    assert result == {"run_id": "run-1", "status": "running"}


def test_run_batch_uses_validator_facade(monkeypatch):
    normalized_workflow = object()
    validator_calls: list[object] = []
    started: dict[str, object] = {}

    monkeypatch.setattr(
        run_routes,
        "normalize_workflow_editor_data",
        lambda workflow: normalized_workflow,
    )
    monkeypatch.setattr(
        run_routes,
        "validate_workflow_editor_data",
        lambda workflow: validator_calls.append(workflow),
    )

    def fake_start_batch_run(**kwargs):
        started.update(kwargs)
        return _ModelDumpResult({"batch_id": "batch-1", "status": "running"})

    monkeypatch.setattr(run_routes, "start_batch_run", fake_start_batch_run)

    result = run_routes.run_workflow_batch(
        "canvas-a",
        BatchRunRequest(workflow={"nodes": []}, input_values=["a"]),
    )

    assert validator_calls == [normalized_workflow]
    assert started["workflow"] is normalized_workflow
    assert result == {"batch_id": "batch-1", "status": "running"}


def test_test_subgraph_uses_partial_execution_validator_facade(monkeypatch):
    normalized_workflow = object()
    partial_validator_calls: list[tuple[object, str, list[str]]] = []
    executed: dict[str, object] = {}

    monkeypatch.setattr(
        run_routes,
        "normalize_workflow_editor_data",
        lambda workflow: normalized_workflow,
    )
    monkeypatch.setattr(
        run_routes,
        "validate_workflow_editor_data",
        lambda _workflow: pytest.fail("test-subgraph must not use full validator facade"),
    )

    def fake_validate_partial(workflow, *, start_node_id, end_node_ids):
        partial_validator_calls.append((workflow, start_node_id, end_node_ids))
        return start_node_id, end_node_ids

    def fake_execute_partial_workflow(**kwargs):
        executed.update(kwargs)
        return {"execution": "subgraph"}

    monkeypatch.setattr(
        run_routes,
        "validate_partial_execution_workflow",
        fake_validate_partial,
    )
    monkeypatch.setattr(run_routes, "execute_partial_workflow", fake_execute_partial_workflow)
    monkeypatch.setattr(
        run_routes,
        "build_run_outcome_response",
        lambda execution: {"execution": execution},
    )

    result = run_routes.test_workflow_subgraph(
        "canvas-a",
        SubgraphTestRequest(
            workflow={"nodes": []},
            start_node_id="start",
            end_node_ids=["end"],
            test_state={"x": 1},
            prompt_overrides={"p": "v"},
        ),
    )

    assert partial_validator_calls == [
        (normalized_workflow, "start", ["end"]),
    ]
    assert executed["workflow"] is normalized_workflow
    assert executed["start_node_id"] == "start"
    assert executed["end_node_ids"] == ["end"]
    assert result == {"execution": {"execution": "subgraph"}}
