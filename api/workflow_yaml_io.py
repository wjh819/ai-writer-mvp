from __future__ import annotations

import os
import shutil
from typing import Any

import yaml

from app_errors import NotFoundError, WorkflowLoadError
from api.workflow_paths import ensure_workflow_exists, get_canvas_dir, get_canvas_workflow_path


def load_yaml_workflow(path: str) -> dict[str, Any]:
    """
    严格读取 workflow YAML 原始内容。
    """

    ensure_workflow_exists(path)

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except Exception as exc:
        raise WorkflowLoadError(f"Workflow YAML parse failed: {exc}") from exc

    if data is None:
        raise WorkflowLoadError("Workflow YAML is empty")

    if not isinstance(data, dict):
        raise WorkflowLoadError("Workflow YAML root must be an object")

    return data


def dump_yaml_workflow(path: str, workflow: dict[str, Any]) -> None:
    """
    将原始 YAML object 写回指定路径。
    """

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(
            workflow,
            f,
            allow_unicode=True,
            sort_keys=False,
        )


def dump_canvas_workflow(canvas_id: str, workflow: dict[str, Any]) -> None:
    """
    写回正式 workflow.yaml。
    """

    dump_yaml_workflow(get_canvas_workflow_path(canvas_id), workflow)


def delete_canvas_files(canvas_id: str) -> None:
    """
    删除指定 canvas 的正式目录内容。
    """

    workflow_path = get_canvas_workflow_path(canvas_id)
    ensure_workflow_exists(workflow_path)

    canvas_dir = get_canvas_dir(canvas_id)

    try:
        shutil.rmtree(canvas_dir)
    except FileNotFoundError as exc:
        raise NotFoundError("Workflow not found") from exc
    except Exception as exc:
        raise WorkflowLoadError(f"Canvas delete failed: {exc}") from exc
