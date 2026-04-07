from __future__ import annotations

import os
from typing import Any

from app_errors import WorkflowLoadError, WorkflowSidecarLoadError
from api.workflow_converter import yaml_to_editor_schema
from api.workflow_normalizer import normalize_workflow_editor_data
from api.workflow_paths import (
    ensure_workflow_exists,
    get_canvas_workflow_path,
    get_sibling_sidecar_path_from_workflow_path,
)
from api.workflow_sidecar_io import _load_sidecar_from_path_or_empty
from api.workflow_validator import (
    collect_context_source_outbound_rule_errors,
    validate_workflow_structure,
)
from api.workflow_yaml_io import load_yaml_workflow
from contracts.workflow_contracts import WorkflowEditorData
from contracts.workflow_sidecar_contracts import WorkflowSidecarData


def _extract_error_message(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, str) and detail:
        return detail
    return str(exc)


def _build_warning(
    *,
    code: str,
    message: str,
    node_id: str | None = None,
    resource_id: str | None = None,
    prompt_name: str | None = None,
) -> dict[str, Any]:
    warning: dict[str, Any] = {
        "code": code,
        "level": "warning",
        "message": message,
    }

    if node_id:
        warning["nodeId"] = node_id
    if resource_id:
        warning["resourceId"] = resource_id
    if prompt_name:
        warning["promptName"] = prompt_name

    return warning


def load_workflow_for_editor(
    path: str,
) -> tuple[WorkflowEditorData, WorkflowSidecarData, list[dict[str, Any]]]:
    """
    从 YAML 文件加载 workflow，返回 editor load response 所需内容。
    """

    raw_data = load_yaml_workflow(path)

    try:
        raw_shape = yaml_to_editor_schema(raw_data)
        workflow = normalize_workflow_editor_data(raw_shape)

        validate_workflow_structure(
            workflow,
            enforce_source_outbound_rules=False,
        )

        warnings: list[dict[str, Any]] = []
        outbound_rule_errors = collect_context_source_outbound_rule_errors(workflow)
        for message in outbound_rule_errors:
            warnings.append(
                _build_warning(
                    code="context_source_outbound_rule_invalid",
                    message=message,
                )
            )

        sidecar = _load_sidecar_from_path_or_empty(
            get_sibling_sidecar_path_from_workflow_path(path),
            workflow,
            canvas_id=os.path.basename(os.path.dirname(path)) or None,
        )

        return workflow, sidecar, warnings
    except (WorkflowLoadError, WorkflowSidecarLoadError):
        raise
    except Exception as exc:
        raise WorkflowLoadError(
            f"Workflow is invalid: {_extract_error_message(exc)}"
        ) from exc


def load_workflow_for_editor_by_canvas_id(
    canvas_id: str,
) -> tuple[WorkflowEditorData, WorkflowSidecarData, list[dict[str, Any]]]:
    """
    editor load 的 canvas_id 入口。
    """

    path = get_canvas_workflow_path(canvas_id)
    ensure_workflow_exists(path)
    return load_workflow_for_editor(path)
