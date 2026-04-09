from __future__ import annotations

import os
import re

from app_errors import NotFoundError

WORKFLOW_DIR = "workflows"
WORKFLOW_FILE_NAME = "workflow.yaml"
METADATA_FILE_NAME = "metadata.yaml"
SIDECAR_FILE_NAME = "sidecar.yaml"
OUTPUTS_DIR_NAME = "outputs"

PROMPTS_DIR_NAME = "prompts"
PROMPT_FILE_SUFFIX = ".prompt.md"

CANVAS_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
NODE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def normalize_canvas_id(canvas_id: str) -> str:
    """
    canvas_id 规范化与合法性检查入口。

    只负责：
    - 要求输入原本是 str
    - 做最小 strip
    - 校验当前正式 canvas_id 命名规则

    不负责：
    - 路径存在性检查
    - metadata / workflow / sidecar / prompt 文件存在性检查

    注意：
    - 当前非法 canvas_id 一律映射为 NotFoundError，
      目的是不向外暴露更细路径信息
    """

    if not isinstance(canvas_id, str):
        raise NotFoundError("Workflow not found")

    normalized = canvas_id.strip()
    if not normalized or not CANVAS_ID_RE.match(normalized):
        raise NotFoundError("Workflow not found")

    return normalized


def normalize_node_id(node_id: str) -> str:
    """
    node_id 规范化与合法性检查入口。

    正式规则：
    - 当前 prompt sidecar 文件名直接使用 node.id
    - node_id 命名规则与 canvas_id 当前保持一致

    注意：
    - 非法值同样映射为 NotFoundError，避免暴露更细路径信息
    """

    if not isinstance(node_id, str):
        raise NotFoundError("Workflow not found")

    normalized = node_id.strip()
    if not normalized or not NODE_ID_RE.match(normalized):
        raise NotFoundError("Workflow not found")

    return normalized


def get_canvas_dir(canvas_id: str) -> str:
    """
    根据 canvas_id 返回正式 workflow 目录路径。

    正式规则：
    - 路径唯一来源为 workflows/<canvas_id>/
    - 调用方不应自行重复拼接目录路径
    """

    normalized = normalize_canvas_id(canvas_id)
    return os.path.join(WORKFLOW_DIR, normalized)


def get_canvas_workflow_path(canvas_id: str) -> str:
    """
    返回正式 workflow 文件路径。

    正式路径：
    - workflows/<canvas_id>/workflow.yaml
    """

    return os.path.join(get_canvas_dir(canvas_id), WORKFLOW_FILE_NAME)


def get_canvas_metadata_path(canvas_id: str) -> str:
    """
    返回正式 metadata 文件路径。

    正式路径：
    - workflows/<canvas_id>/metadata.yaml
    """

    return os.path.join(get_canvas_dir(canvas_id), METADATA_FILE_NAME)


def get_canvas_sidecar_path(canvas_id: str) -> str:
    """
    返回正式 sidecar 文件路径。

    正式路径：
    - workflows/<canvas_id>/sidecar.yaml
    """

    return os.path.join(get_canvas_dir(canvas_id), SIDECAR_FILE_NAME)


def get_canvas_outputs_dir(canvas_id: str) -> str:
    """
    返回当前 canvas 的 output 导出根目录。

    正式路径：
    - workflows/<canvas_id>/outputs/
    """

    return os.path.join(get_canvas_dir(canvas_id), OUTPUTS_DIR_NAME)


def get_canvas_prompts_dir(canvas_id: str) -> str:
    """
    返回当前 canvas 的 prompt 正文目录。

    正式路径：
    - workflows/<canvas_id>/prompts/
    """

    return os.path.join(get_canvas_dir(canvas_id), PROMPTS_DIR_NAME)


def build_prompt_file_name(node_id: str) -> str:
    """
    根据 node_id 构造正式 prompt 文件名。

    正式文件名：
    - <node-id>.prompt.md
    """

    normalized_node_id = normalize_node_id(node_id)
    return f"{normalized_node_id}{PROMPT_FILE_SUFFIX}"


def get_canvas_prompt_path(canvas_id: str, node_id: str) -> str:
    """
    返回当前 canvas 下指定 prompt 节点的正式 prompt 文件路径。

    正式路径：
    - workflows/<canvas_id>/prompts/<node-id>.prompt.md
    """

    return os.path.join(
        get_canvas_prompts_dir(canvas_id),
        build_prompt_file_name(node_id),
    )


def get_sibling_sidecar_path_from_workflow_path(workflow_path: str) -> str:
    """
    根据 workflow.yaml 路径得到同目录 sidecar.yaml 路径。
    """

    return os.path.join(os.path.dirname(workflow_path), SIDECAR_FILE_NAME)


def get_sibling_prompts_dir_from_workflow_path(workflow_path: str) -> str:
    """
    根据 workflow.yaml 路径得到同目录 prompts/ 目录路径。
    """

    return os.path.join(os.path.dirname(workflow_path), PROMPTS_DIR_NAME)


def ensure_workflow_exists(path: str) -> None:
    """
    断言指定 workflow 文件路径存在。

    只负责：
    - 路径存在性检查

    不负责：
    - 文件内容合法性
    """

    if not os.path.exists(path):
        raise NotFoundError("Workflow not found")