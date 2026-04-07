from __future__ import annotations

import os
from typing import Any

import yaml

from app_errors import (
    InvalidInputError,
    WorkflowLoadError,
    WorkflowSidecarLoadError,
)
from api.workflow_paths import get_canvas_sidecar_path, normalize_canvas_id
from api.workflow_yaml_io import dump_yaml_workflow
from contracts.workflow_contracts import PromptNodeConfig, WorkflowEditorData
from contracts.workflow_sidecar_contracts import (
    WorkflowSidecarData,
    WorkflowSidecarNodeAssets,
)


def _build_sidecar_load_error_detail(
    *,
    code: str,
    message: str,
    canvas_id: str | None = None,
    path: str | None = None,
    node_id: str | None = None,
    field: str | None = None,
) -> dict[str, Any]:
    detail: dict[str, Any] = {
        "code": code,
        "message": message,
    }

    if canvas_id:
        detail["canvasId"] = canvas_id
    if path:
        detail["path"] = path
    if node_id:
        detail["nodeId"] = node_id
    if field:
        detail["field"] = field

    return detail


def _raise_sidecar_error(
    *,
    mode: str,
    message: str,
    canvas_id: str | None = None,
    path: str | None = None,
    node_id: str | None = None,
    field: str | None = None,
) -> None:
    if mode == "save":
        raise InvalidInputError(f"Workflow sidecar invalid: {message}")

    raise WorkflowSidecarLoadError(
        _build_sidecar_load_error_detail(
            code="workflow_sidecar_load_failed",
            message=message,
            canvas_id=canvas_id,
            path=path,
            node_id=node_id,
            field=field,
        )
    )


def _trim_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _has_sidecar_node_assets(assets: WorkflowSidecarNodeAssets) -> bool:
    return bool(
        assets.pinnedInputs
        or assets.pinnedPromptContext is not None
        or assets.metadata
    )


def has_persistable_workflow_sidecar(sidecar: WorkflowSidecarData) -> bool:
    """
    判断 sidecar 是否真的包含应写盘的 node assets。
    """

    return bool(sidecar.nodes)


def normalize_workflow_sidecar_data(
    sidecar_payload: Any,
    workflow: WorkflowEditorData,
) -> WorkflowSidecarData:
    """
    将保存请求中的 sidecar payload 收敛为正式 sidecar model。
    """

    return _normalize_workflow_sidecar_data(
        sidecar_payload,
        workflow,
        mode="save",
        canvas_id=None,
        path=None,
    )


def _normalize_workflow_sidecar_data(
    sidecar_payload: Any,
    workflow: WorkflowEditorData,
    *,
    mode: str,
    canvas_id: str | None,
    path: str | None,
) -> WorkflowSidecarData:
    if sidecar_payload is None:
        return WorkflowSidecarData()

    if not isinstance(sidecar_payload, dict):
        _raise_sidecar_error(
            mode=mode,
            message="Workflow sidecar root must be an object",
            canvas_id=canvas_id,
            path=path,
        )

    allowed_root_keys = {"nodes"}
    extra_root_keys = sorted(set(sidecar_payload.keys()) - allowed_root_keys)
    if extra_root_keys:
        _raise_sidecar_error(
            mode=mode,
            message=f"Workflow sidecar contains unsupported root keys: {extra_root_keys}",
            canvas_id=canvas_id,
            path=path,
        )

    raw_nodes = sidecar_payload.get("nodes", {})
    if raw_nodes is None:
        raw_nodes = {}

    if not isinstance(raw_nodes, dict):
        _raise_sidecar_error(
            mode=mode,
            message="Workflow sidecar field 'nodes' must be an object",
            canvas_id=canvas_id,
            path=path,
            field="nodes",
        )

    workflow_node_map = {_trim_text(node.id): node for node in workflow.nodes}
    normalized_nodes: dict[str, WorkflowSidecarNodeAssets] = {}

    for raw_node_id, raw_assets in raw_nodes.items():
        node_id = _trim_text(raw_node_id)
        if not node_id:
            _raise_sidecar_error(
                mode=mode,
                message="Workflow sidecar contains an empty node id",
                canvas_id=canvas_id,
                path=path,
                field="nodes",
            )

        if node_id not in workflow_node_map:
            _raise_sidecar_error(
                mode=mode,
                message=f"Workflow sidecar references unknown node '{node_id}'",
                canvas_id=canvas_id,
                path=path,
                node_id=node_id,
                field="nodes",
            )

        if raw_assets is None:
            raw_assets = {}

        if not isinstance(raw_assets, dict):
            _raise_sidecar_error(
                mode=mode,
                message=f"Workflow sidecar node '{node_id}' assets must be an object",
                canvas_id=canvas_id,
                path=path,
                node_id=node_id,
            )

        allowed_asset_keys = {"pinnedInputs", "pinnedPromptContext", "metadata"}
        extra_asset_keys = sorted(set(raw_assets.keys()) - allowed_asset_keys)
        if extra_asset_keys:
            _raise_sidecar_error(
                mode=mode,
                message=(
                    f"Workflow sidecar node '{node_id}' contains unsupported fields: "
                    f"{extra_asset_keys}"
                ),
                canvas_id=canvas_id,
                path=path,
                node_id=node_id,
            )

        try:
            parsed_assets = WorkflowSidecarNodeAssets.model_validate(raw_assets)
        except Exception as exc:
            _raise_sidecar_error(
                mode=mode,
                message=f"Workflow sidecar node '{node_id}' is invalid: {exc}",
                canvas_id=canvas_id,
                path=path,
                node_id=node_id,
            )
            raise AssertionError("unreachable")

        normalized_pinned_inputs: dict[str, Any] = {}
        for raw_input_key, value in dict(parsed_assets.pinnedInputs or {}).items():
            input_key = _trim_text(raw_input_key)
            if not input_key:
                _raise_sidecar_error(
                    mode=mode,
                    message=f"Workflow sidecar node '{node_id}' contains an empty pinnedInputs key",
                    canvas_id=canvas_id,
                    path=path,
                    node_id=node_id,
                    field="pinnedInputs",
                )
            normalized_pinned_inputs[input_key] = value

        normalized_metadata: dict[str, Any] = {}
        for raw_meta_key, value in dict(parsed_assets.metadata or {}).items():
            meta_key = _trim_text(raw_meta_key)
            if not meta_key:
                _raise_sidecar_error(
                    mode=mode,
                    message=f"Workflow sidecar node '{node_id}' contains an empty metadata key",
                    canvas_id=canvas_id,
                    path=path,
                    node_id=node_id,
                    field="metadata",
                )
            normalized_metadata[meta_key] = value

        normalized_prompt_context = (
            dict(parsed_assets.pinnedPromptContext)
            if parsed_assets.pinnedPromptContext is not None
            else None
        )

        workflow_node = workflow_node_map[node_id]
        if (
            normalized_prompt_context is not None
            and not isinstance(workflow_node.config, PromptNodeConfig)
        ):
            _raise_sidecar_error(
                mode=mode,
                message=(
                    f"Workflow sidecar node '{node_id}' must be a prompt node to use pinnedPromptContext"
                ),
                canvas_id=canvas_id,
                path=path,
                node_id=node_id,
                field="pinnedPromptContext",
            )

        normalized_assets = WorkflowSidecarNodeAssets(
            pinnedInputs=normalized_pinned_inputs,
            pinnedPromptContext=normalized_prompt_context,
            metadata=normalized_metadata,
        )

        if _has_sidecar_node_assets(normalized_assets):
            normalized_nodes[node_id] = normalized_assets

    return WorkflowSidecarData(nodes=normalized_nodes)


def load_canvas_sidecar_or_empty(
    canvas_id: str,
    workflow: WorkflowEditorData,
) -> WorkflowSidecarData:
    """
    读取 canvas sidecar；若文件不存在则返回空 sidecar。
    """

    normalized_canvas_id = normalize_canvas_id(canvas_id)
    path = get_canvas_sidecar_path(normalized_canvas_id)
    return _load_sidecar_from_path_or_empty(
        path,
        workflow,
        canvas_id=normalized_canvas_id,
    )


def _load_sidecar_from_path_or_empty(
    path: str,
    workflow: WorkflowEditorData,
    *,
    canvas_id: str | None,
) -> WorkflowSidecarData:
    if not os.path.exists(path):
        return WorkflowSidecarData()

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except Exception as exc:
        raise WorkflowSidecarLoadError(
            _build_sidecar_load_error_detail(
                code="workflow_sidecar_yaml_parse_failed",
                message=f"Workflow sidecar YAML parse failed: {exc}",
                canvas_id=canvas_id,
                path=path,
            )
        ) from exc

    if data is None:
        raise WorkflowSidecarLoadError(
            _build_sidecar_load_error_detail(
                code="workflow_sidecar_empty",
                message="Workflow sidecar YAML is empty",
                canvas_id=canvas_id,
                path=path,
            )
        )

    if not isinstance(data, dict):
        raise WorkflowSidecarLoadError(
            _build_sidecar_load_error_detail(
                code="workflow_sidecar_root_invalid",
                message="Workflow sidecar YAML root must be an object",
                canvas_id=canvas_id,
                path=path,
            )
        )

    return _normalize_workflow_sidecar_data(
        data,
        workflow,
        mode="load",
        canvas_id=canvas_id,
        path=path,
    )


def dump_canvas_sidecar(
    canvas_id: str,
    sidecar: WorkflowSidecarData | dict[str, Any],
) -> None:
    """
    写回正式 sidecar.yaml。
    """

    if isinstance(sidecar, WorkflowSidecarData):
        payload = sidecar.model_dump(exclude_none=True)
    elif isinstance(sidecar, dict):
        payload = sidecar
    else:
        raise ValueError("Workflow sidecar must be an object")

    dump_yaml_workflow(get_canvas_sidecar_path(canvas_id), payload)


def delete_canvas_sidecar_if_exists(canvas_id: str) -> None:
    """
    删除指定 canvas 的 sidecar 文件（若存在）。
    """

    path = get_canvas_sidecar_path(canvas_id)
    if not os.path.exists(path):
        return

    try:
        os.remove(path)
    except FileNotFoundError:
        return
    except Exception as exc:
        raise WorkflowLoadError(f"Canvas sidecar delete failed: {exc}") from exc
