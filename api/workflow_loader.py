from __future__ import annotations

"""
workflow 文件系统入口与加载壳层。

本文件角色：
- workflow 子链的统一导出门面
- 继续作为路径规则 / IO / editor load / canonical load 的稳定导入入口

说明：
- 具体职责已拆到更细模块
- 外部调用方仍优先从本文件导入，避免一次性扩大改动范围
"""

from api.workflow_canonical_loader import load_canonical_workflow_from_canvas_id
from api.workflow_editor_loader import (
    load_workflow_for_editor,
    load_workflow_for_editor_by_canvas_id,
)
from api.workflow_metadata_io import (
    dump_canvas_metadata,
    list_canvas_summaries,
    load_canvas_metadata_or_empty,
)
from api.workflow_paths import (
    CANVAS_ID_RE,
    METADATA_FILE_NAME,
    SIDECAR_FILE_NAME,
    WORKFLOW_DIR,
    WORKFLOW_FILE_NAME,
    ensure_workflow_exists,
    get_canvas_dir,
    get_canvas_metadata_path,
    get_canvas_sidecar_path,
    get_canvas_workflow_path,
    normalize_canvas_id,
)
from api.workflow_sidecar_io import (
    delete_canvas_sidecar_if_exists,
    dump_canvas_sidecar,
    has_persistable_workflow_sidecar,
    load_canvas_sidecar_or_empty,
    normalize_workflow_sidecar_data,
)
from api.workflow_yaml_io import (
    delete_canvas_files,
    dump_canvas_workflow,
    dump_yaml_workflow,
    load_yaml_workflow,
)

__all__ = [
    "CANVAS_ID_RE",
    "WORKFLOW_DIR",
    "WORKFLOW_FILE_NAME",
    "METADATA_FILE_NAME",
    "SIDECAR_FILE_NAME",
    "normalize_canvas_id",
    "get_canvas_dir",
    "get_canvas_workflow_path",
    "get_canvas_metadata_path",
    "get_canvas_sidecar_path",
    "ensure_workflow_exists",
    "delete_canvas_sidecar_if_exists",
    "delete_canvas_files",
    "list_canvas_summaries",
    "load_yaml_workflow",
    "dump_yaml_workflow",
    "load_canvas_metadata_or_empty",
    "dump_canvas_metadata",
    "dump_canvas_workflow",
    "normalize_workflow_sidecar_data",
    "load_canvas_sidecar_or_empty",
    "dump_canvas_sidecar",
    "has_persistable_workflow_sidecar",
    "load_workflow_for_editor",
    "load_workflow_for_editor_by_canvas_id",
    "load_canonical_workflow_from_canvas_id",
]
