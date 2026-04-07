from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app_errors import AppError, InvalidInputError, NotFoundError
from api.error_translator import to_http_exception
from api.model_resource_http_schemas import (
    CreateModelResourceRequest,
    DeleteModelResourceRequest,
    ModelResourceConfigHealth,
    ModelResourceListItem,
    UpdateModelResourceRequest,
)
from api.model_resource_reference_service import assert_model_resource_deletable
from api.routes.route_helpers import trim_text
from contracts.model_resource_contracts import ModelResourceRecord
from core.model_resource_registry import get_model_resource_registry_health
from storage.model_resource_store import (
    load_model_resource_record_map_or_empty,
    load_model_resource_record_map_or_raise,
    write_model_resource_record_map,
)

router = APIRouter()


@router.get("/model-resources")
def get_model_resources() -> List[dict]:
    try:
        records = load_model_resource_record_map_or_empty()

        items = [
            ModelResourceListItem(
                id=resource_id,
                provider=record.provider,
                model=record.model,
                api_key=record.api_key,
                base_url=record.base_url,
            ).model_dump()
            for resource_id, record in records.items()
        ]

        items.sort(key=lambda item: item["id"])
        return items
    except AppError as exc:
        raise to_http_exception(exc) from exc


@router.get("/model-resources/status")
def get_model_resources_status() -> dict:
    health = get_model_resource_registry_health()
    return ModelResourceConfigHealth(**health).model_dump()


@router.post("/model-resources")
def create_model_resource(payload: CreateModelResourceRequest):
    try:
        resource_id = trim_text(payload.id)
        provider = trim_text(payload.provider)
        provider_model = trim_text(payload.model)
        api_key = trim_text(payload.api_key)
        base_url = trim_text(payload.base_url)

        if not resource_id:
            raise InvalidInputError("Model resource id is required")
        if not provider_model:
            raise InvalidInputError("Provider model is required")
        if not api_key:
            raise InvalidInputError("API key is required")
        if not base_url:
            raise InvalidInputError("Base URL is required")

        records = load_model_resource_record_map_or_empty()

        if resource_id in records:
            raise InvalidInputError(
                f"Model resource id already exists: {resource_id}"
            )

        records[resource_id] = ModelResourceRecord(
            id=resource_id,
            provider=provider,
            model=provider_model,
            api_key=api_key,
            base_url=base_url,
        )
        write_model_resource_record_map(records)

        return {"status": "created"}
    except AppError as exc:
        raise to_http_exception(exc) from exc


@router.put("/model-resources")
def update_model_resource(payload: UpdateModelResourceRequest):
    try:
        resource_id = trim_text(payload.id)
        provider = trim_text(payload.provider)
        provider_model = trim_text(payload.model)
        base_url = trim_text(payload.base_url)

        if not resource_id:
            raise InvalidInputError("Model resource id is required")
        if not provider_model:
            raise InvalidInputError("Provider model is required")
        if not base_url:
            raise InvalidInputError("Base URL is required")

        records = load_model_resource_record_map_or_raise()

        if resource_id not in records:
            raise NotFoundError(
                f"Model resource id not found in file config: {resource_id}"
            )

        old_record = records[resource_id]

        if payload.api_key is None:
            next_api_key = old_record.api_key
        else:
            next_api_key = trim_text(payload.api_key)
            if not next_api_key:
                raise InvalidInputError("API key cannot be empty when provided")

        records[resource_id] = ModelResourceRecord(
            id=resource_id,
            provider=provider,
            model=provider_model,
            api_key=next_api_key,
            base_url=base_url,
        )
        write_model_resource_record_map(records)

        return {"status": "updated"}
    except AppError as exc:
        raise to_http_exception(exc) from exc


@router.delete("/model-resources")
def delete_model_resource(payload: DeleteModelResourceRequest):
    try:
        resource_id = trim_text(payload.id)

        if not resource_id:
            raise InvalidInputError("Model resource id is required")

        records = load_model_resource_record_map_or_raise()

        if resource_id not in records:
            raise NotFoundError(
                f"Model resource id not found in file config: {resource_id}"
            )

        assert_model_resource_deletable(resource_id)

        del records[resource_id]
        write_model_resource_record_map(records)

        return {"status": "deleted"}
    except AppError as exc:
        raise to_http_exception(exc) from exc
