from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query

from app_errors import AppError, InvalidInputError, NotFoundError
from api.error_translator import to_http_exception
from api.workflow_converter import editor_schema_to_yaml
from api.workflow_loader import (
    delete_canvas_files,
    delete_canvas_sidecar_if_exists,
    dump_canvas_metadata,
    dump_canvas_sidecar,
    dump_canvas_workflow,
    get_canvas_metadata_path,
    get_canvas_workflow_path,
    has_persistable_workflow_sidecar,
    list_canvas_summaries,
    load_workflow_for_editor_by_canvas_id,
    normalize_canvas_id,
    normalize_workflow_sidecar_data,
)
from api.workflow_normalizer import normalize_workflow_editor_data
from api.workflow_validator import validate_workflow_editor_data
from api.routes.route_helpers import split_save_workflow_payload

router = APIRouter()


@router.get("/workflows")
def list_workflows():
    return list_canvas_summaries()


@router.get("/workflows/{canvas_id}")
def get_workflow(canvas_id: str):
    try:
        workflow, sidecar, warnings = load_workflow_for_editor_by_canvas_id(canvas_id)
        return {
            "workflow": workflow.model_dump(),
            "sidecar": sidecar.model_dump(exclude_none=True),
            "warnings": warnings,
        }
    except AppError as exc:
        raise to_http_exception(exc) from exc


@router.post("/workflows/{canvas_id}")
def save_workflow(
    canvas_id: str,
    workflow: Any = Body(...),
    reject_if_exists: bool = Query(False),
):
    try:
        normalized_canvas_id = normalize_canvas_id(canvas_id)
        workflow_path = get_canvas_workflow_path(normalized_canvas_id)

        if reject_if_exists and os.path.exists(workflow_path):
            raise InvalidInputError(
                f"Canvas id already exists: {normalized_canvas_id}"
            )

        workflow_payload, sidecar_payload, has_explicit_sidecar = (
            split_save_workflow_payload(workflow)
        )

        normalized_workflow = normalize_workflow_editor_data(workflow_payload)
        validate_workflow_editor_data(normalized_workflow)

        metadata_path = get_canvas_metadata_path(normalized_canvas_id)

        yaml_data = editor_schema_to_yaml(normalized_workflow)
        dump_canvas_workflow(normalized_canvas_id, yaml_data)

        if not os.path.exists(metadata_path):
            dump_canvas_metadata(
                normalized_canvas_id,
                {"label": normalized_canvas_id},
            )

        if has_explicit_sidecar:
            normalized_sidecar = normalize_workflow_sidecar_data(
                sidecar_payload,
                normalized_workflow,
            )

            if has_persistable_workflow_sidecar(normalized_sidecar):
                dump_canvas_sidecar(normalized_canvas_id, normalized_sidecar)
            else:
                delete_canvas_sidecar_if_exists(normalized_canvas_id)

        return {"status": "saved"}
    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.delete("/workflows/{canvas_id}")
def delete_workflow(canvas_id: str):
    try:
        normalized_canvas_id = normalize_canvas_id(canvas_id)
        workflow_path = get_canvas_workflow_path(normalized_canvas_id)

        if not os.path.exists(workflow_path):
            raise NotFoundError("Workflow not found")

        formal_canvas_ids = [item["canvas_id"] for item in list_canvas_summaries()]

        if normalized_canvas_id not in formal_canvas_ids:
            raise NotFoundError("Workflow not found")

        if len(formal_canvas_ids) <= 1:
            raise InvalidInputError("Cannot delete the last formal canvas")

        delete_canvas_files(normalized_canvas_id)
        return {"status": "deleted"}
    except AppError as exc:
        raise to_http_exception(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Internal server error") from exc
