from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app_errors import AppError
from api.error_translator import to_http_exception
from api.run_http_schemas import RunDraftRequest, SubgraphTestRequest
from api.run_outcome import build_run_outcome_response
from api.workflow_normalizer import normalize_workflow_editor_data
from api.workflow_run_service import execute_draft_workflow, execute_partial_workflow
from api.workflow_validator import (
    validate_partial_execution_workflow,
    validate_workflow_editor_data,
)
from api.run_http_schemas import (
    LiveRunSnapshot,
    LiveRunStartResponse,
    RunDraftRequest,
    SubgraphTestRequest,
)
from api.run_live_store import (
    LiveRunAlreadyActiveError,
    get_run_live_store,
)
from api.workflow_run_service import (
    execute_draft_workflow,
    execute_partial_workflow,
    start_live_draft_workflow,
)

router = APIRouter()
_live_store = get_run_live_store()

@router.post("/workflows/{canvas_id}/run-draft")
def run_workflow_draft(canvas_id: str, req: RunDraftRequest):

    try:
        normalized_workflow = normalize_workflow_editor_data(req.workflow)
        validate_workflow_editor_data(normalized_workflow)

        execution = execute_draft_workflow(
            canvas_id=canvas_id,
            workflow=normalized_workflow,
            input_state=dict(req.input_state or {}),
            prompt_overrides=dict(req.prompt_overrides or {}),
            run_scope="full",
        )
        return build_run_outcome_response(execution)
    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/workflows/{canvas_id}/test-subgraph")
def test_workflow_subgraph(canvas_id: str, req: SubgraphTestRequest):
    _ = canvas_id

    try:
        normalized_workflow = normalize_workflow_editor_data(req.workflow)
        start_node_id, end_node_ids = validate_partial_execution_workflow(
            normalized_workflow,
            start_node_id=req.start_node_id,
            end_node_ids=req.end_node_ids,
        )

        execution = execute_partial_workflow(
            workflow=normalized_workflow,
            start_node_id=start_node_id,
            end_node_ids=end_node_ids,
            test_state=dict(req.test_state or {}),
            prompt_overrides=dict(req.prompt_overrides or {}),
        )
        return build_run_outcome_response(execution)

    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.post("/workflows/{canvas_id}/run-live", status_code=status.HTTP_202_ACCEPTED)
def run_workflow_live(canvas_id: str, req: RunDraftRequest):
    try:
        normalized_workflow = normalize_workflow_editor_data(req.workflow)
        validate_workflow_editor_data(normalized_workflow)

        response = start_live_draft_workflow(
            canvas_id=canvas_id,
            workflow=normalized_workflow,
            input_state=dict(req.input_state or {}),
            prompt_overrides=dict(req.prompt_overrides or {}),
            live_store=_live_store,
        )
        return response.model_dump()

    except LiveRunAlreadyActiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/runs/active")
def get_active_live_run():
    snapshot = _live_store.get_active_snapshot()
    return snapshot.model_dump()