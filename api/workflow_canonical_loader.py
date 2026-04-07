from __future__ import annotations

from app_errors import WorkflowLoadError
from api.workflow_converter import yaml_to_editor_schema
from api.workflow_normalizer import normalize_workflow_editor_data
from api.workflow_paths import ensure_workflow_exists, get_canvas_workflow_path
from api.workflow_validator import validate_workflow_editor_data
from api.workflow_yaml_io import load_yaml_workflow
from contracts.workflow_contracts import WorkflowEditorData


def _extract_error_message(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, str) and detail:
        return detail
    return str(exc)


def load_canonical_workflow_from_canvas_id(canvas_id: str) -> WorkflowEditorData:
    """
    canonical load 的严格 canvas_id 入口。
    """

    path = get_canvas_workflow_path(canvas_id)
    ensure_workflow_exists(path)

    try:
        raw_data = load_yaml_workflow(path)
        raw_shape = yaml_to_editor_schema(raw_data)
        workflow = normalize_workflow_editor_data(raw_shape)
        validate_workflow_editor_data(workflow)
        return workflow
    except WorkflowLoadError:
        raise
    except Exception as exc:
        raise WorkflowLoadError(
            f"Workflow is invalid: {_extract_error_message(exc)}"
        ) from exc
