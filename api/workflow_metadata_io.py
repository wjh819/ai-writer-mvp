from __future__ import annotations

import os
from typing import Any

import yaml

from app_errors import NotFoundError, WorkflowLoadError
from api.workflow_paths import (
    METADATA_FILE_NAME,
    WORKFLOW_DIR,
    WORKFLOW_FILE_NAME,
    get_canvas_metadata_path,
    normalize_canvas_id,
)
from api.workflow_yaml_io import dump_yaml_workflow


def load_canvas_metadata_or_empty(canvas_id: str) -> dict[str, Any]:
    """
    读取 canvas metadata；若文件不存在则返回空 dict。
    """

    path = get_canvas_metadata_path(canvas_id)

    if not os.path.exists(path):
        return {}

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except Exception as exc:
        raise WorkflowLoadError(f"Canvas metadata YAML parse failed: {exc}") from exc

    if data is None:
        return {}

    if not isinstance(data, dict):
        raise WorkflowLoadError("Canvas metadata YAML root must be an object")

    return data


def dump_canvas_metadata(canvas_id: str, metadata: dict[str, Any]) -> None:
    """
    写回 canvas metadata。
    """

    if not isinstance(metadata, dict):
        raise ValueError("Canvas metadata must be an object")

    dump_yaml_workflow(get_canvas_metadata_path(canvas_id), metadata)


def list_canvas_summaries() -> list[dict[str, str]]:
    """
    列出当前正式 workflow 存储链中的全部 canvas 摘要。
    """

    if not os.path.exists(WORKFLOW_DIR):
        return []

    items: list[dict[str, str]] = []

    for entry in os.listdir(WORKFLOW_DIR):
        entry_path = os.path.join(WORKFLOW_DIR, entry)
        if not os.path.isdir(entry_path):
            continue

        try:
            canvas_id = normalize_canvas_id(entry)
        except NotFoundError:
            continue

        workflow_path = os.path.join(entry_path, WORKFLOW_FILE_NAME)
        if not os.path.exists(workflow_path):
            continue

        label = canvas_id
        metadata_path = os.path.join(entry_path, METADATA_FILE_NAME)
        if os.path.exists(metadata_path):
            try:
                metadata = load_canvas_metadata_or_empty(canvas_id)
                raw_label = metadata.get("label")
                if isinstance(raw_label, str) and raw_label.strip():
                    label = raw_label.strip()
            except WorkflowLoadError:
                pass

        items.append({"canvas_id": canvas_id, "label": label})

    items.sort(key=lambda item: item["canvas_id"])
    return items
