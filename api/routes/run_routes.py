from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app_errors import AppError
from api.error_translator import to_http_exception
from api.run_batch_store import (
    BatchItemDetailUnavailableError,
    BatchItemNotFoundError,
    BatchRunAlreadyActiveError,
    BatchRunNotCancellableError,
    BatchRunNotFoundError,
    get_batch_run_store,
)
from contracts.run_contracts import (
    BatchRunRequest,
    RunDraftRequest,
    SubgraphTestRequest,
)
from api.run_live_store import LiveRunAlreadyActiveError, get_run_live_store
from api.run_outcome import build_run_outcome_response
from api.workflow_batch_run_service import (
    BatchRunBlockedByActiveLiveRunError,
    cancel_batch_run,
    get_batch_item_detail,
    get_batch_summary,
    start_batch_run,
)
from api.workflow_normalizer import normalize_workflow_editor_data
from api.workflow_run_service import (
    execute_draft_workflow,
    execute_partial_workflow,
    start_live_draft_workflow,
)
from backend_workflow_canonical import (
    set_model_resource_registry_provider,
    validate_partial_execution_workflow,
    validate_workflow_editor_data,
)
from core.model_resource_registry import load_model_resource_registry

router = APIRouter()

_live_store = get_run_live_store()
_batch_store = get_batch_run_store()

set_model_resource_registry_provider(load_model_resource_registry)


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
        if _batch_store.has_active_batch():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A batch run is already active",
            )

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


@router.post(
    "/workflows/{canvas_id}/run-batch",
    status_code=status.HTTP_202_ACCEPTED,
)
def run_workflow_batch(canvas_id: str, req: BatchRunRequest):
    try:
        normalized_workflow = normalize_workflow_editor_data(req.workflow)
        validate_workflow_editor_data(normalized_workflow)

        summary = start_batch_run(
            canvas_id=canvas_id,
            workflow=normalized_workflow,
            input_values=list(req.input_values or []),
            max_parallel=req.max_parallel,
            batch_store=_batch_store,
            live_store=_live_store,
        )
        return summary.model_dump()

    except BatchRunBlockedByActiveLiveRunError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except BatchRunAlreadyActiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/run-batches/{batch_id}")
def get_workflow_batch_summary(batch_id: str):
    try:
        summary = get_batch_summary(
            batch_id=batch_id,
            batch_store=_batch_store,
        )
        return summary.model_dump()

    except BatchRunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get("/run-batches/{batch_id}/items/{item_id}")
def get_workflow_batch_item_detail(batch_id: str, item_id: str):
    try:
        detail = get_batch_item_detail(
            batch_id=batch_id,
            item_id=item_id,
            batch_store=_batch_store,
        )
        return detail.model_dump()

    except BatchRunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except BatchItemNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except BatchItemDetailUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post("/run-batches/{batch_id}/cancel")
def cancel_workflow_batch(batch_id: str):
    try:
        summary = cancel_batch_run(
            batch_id=batch_id,
            batch_store=_batch_store,
        )
        return summary.model_dump()

    except BatchRunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except BatchRunNotCancellableError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
