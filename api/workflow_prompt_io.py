from __future__ import annotations

import os
from typing import Any, Iterable

from app_errors import WorkflowLoadError
from contracts.workflow_contracts import WorkflowEditorData
from api.workflow_paths import (
    PROMPT_FILE_SUFFIX,
    build_prompt_file_name,
    get_canvas_prompt_path,
    get_canvas_prompts_dir,
    get_sibling_prompts_dir_from_workflow_path,
    normalize_node_id,
)


def load_prompt_text_file(path: str) -> str:
    """
    严格读取单个 prompt 正文文件。

    正式规则：
    - 文件不存在 -> WorkflowLoadError
    - 文件不可读 -> WorkflowLoadError
    - 空文件 -> WorkflowLoadError

    注意：
    - 这里只做文件系统层读写，不做 prompt 业务语义裁决
    - “只有空白字符”的正文仍交给 validator 做正式裁决
    """

    if not os.path.exists(path):
        raise WorkflowLoadError(
            f"Prompt file not found: {os.path.basename(path)}"
        )

    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception as exc:
        raise WorkflowLoadError(f"Prompt file read failed: {exc}") from exc

    if text == "":
        raise WorkflowLoadError(
            f"Prompt file is empty: {os.path.basename(path)}"
        )

    return text


def dump_prompt_text_file(path: str, prompt_text: str) -> None:
    """
    将单个 prompt 正文写回指定路径。

    只负责：
    - 建目录
    - 以 utf-8 写回原始文本

    不负责：
    - promptText 业务合法性裁决
    - 自动 trim / normalize
    """

    os.makedirs(os.path.dirname(path), exist_ok=True)

    text = prompt_text if isinstance(prompt_text, str) else str(prompt_text)

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def load_canvas_prompt_text(canvas_id: str, node_id: str) -> str:
    """
    读取当前 canvas 下指定 prompt 节点的正文文件。
    """

    return load_prompt_text_file(get_canvas_prompt_path(canvas_id, node_id))


def dump_canvas_prompt_text(canvas_id: str, node_id: str, prompt_text: str) -> None:
    """
    写回当前 canvas 下指定 prompt 节点的正文文件。
    """

    dump_prompt_text_file(
        get_canvas_prompt_path(canvas_id, node_id),
        prompt_text,
    )


def delete_canvas_prompt_if_exists(canvas_id: str, node_id: str) -> None:
    """
    删除当前 canvas 下指定 prompt 节点的正文文件（若存在）。
    """

    path = get_canvas_prompt_path(canvas_id, node_id)
    if os.path.exists(path):
        os.remove(path)


def list_canvas_prompt_file_node_ids(canvas_id: str) -> list[str]:
    """
    列出当前 canvas prompts/ 目录下可识别的 prompt 文件 node id。

    规则：
    - 只识别 *.prompt.md
    - 文件名主体必须满足当前正式 node_id 规则
    - 返回结果按字典序排序
    """

    prompts_dir = get_canvas_prompts_dir(canvas_id)
    if not os.path.isdir(prompts_dir):
        return []

    result: list[str] = []

    for entry in os.listdir(prompts_dir):
        entry_path = os.path.join(prompts_dir, entry)
        if not os.path.isfile(entry_path):
            continue
        if not entry.endswith(PROMPT_FILE_SUFFIX):
            continue

        raw_node_id = entry[: -len(PROMPT_FILE_SUFFIX)]
        try:
            normalized_node_id = normalize_node_id(raw_node_id)
        except Exception:
            continue

        result.append(normalized_node_id)

    return sorted(set(result))


def dump_canvas_prompt_files(canvas_id: str, workflow: WorkflowEditorData) -> None:
    """
    将当前 workflow 中所有 prompt 节点的 promptText 写回正式 prompt 文件。

    正式规则：
    - 只有 prompt 节点参与 .prompt.md 读写
    - 文件名直接使用 node.id
    - 文本内容直接使用 config.promptText
    """

    for node in workflow.nodes:
        config = node.config
        if config.type != "prompt":
            continue

        dump_canvas_prompt_text(
            canvas_id=canvas_id,
            node_id=node.id,
            prompt_text=config.promptText,
        )


def delete_orphan_canvas_prompt_files(
    canvas_id: str,
    keep_node_ids: Iterable[str],
) -> None:
    """
    清理当前 canvas prompts/ 目录下不再属于当前正式节点集合的 orphan prompt 文件。

    正式规则：
    - save 时，当前 workflow 中已不存在的 prompt 节点，其同名 .prompt.md 应一并删除
    """

    prompts_dir = get_canvas_prompts_dir(canvas_id)
    if not os.path.isdir(prompts_dir):
        return

    keep_file_names = {
        build_prompt_file_name(node_id)
        for node_id in keep_node_ids
    }

    for entry in os.listdir(prompts_dir):
        entry_path = os.path.join(prompts_dir, entry)
        if not os.path.isfile(entry_path):
            continue
        if not entry.endswith(PROMPT_FILE_SUFFIX):
            continue
        if entry in keep_file_names:
            continue

        os.remove(entry_path)


def load_prompt_text_from_workflow_dir(workflow_path: str, node_id: str) -> str:
    """
    根据 workflow.yaml 所在目录，读取对应 prompt 节点的正文文件。

    正式路径：
    - <workflow_dir>/prompts/<node-id>.prompt.md
    """

    prompts_dir = get_sibling_prompts_dir_from_workflow_path(workflow_path)
    file_name = build_prompt_file_name(node_id)
    return load_prompt_text_file(os.path.join(prompts_dir, file_name))


def attach_prompt_texts_to_raw_editor_shape(
    raw_shape: Any,
    workflow_path: str,
) -> dict[str, Any]:
    """
    在 normalize 之前，将 prompt 正文从独立 .prompt.md 文件回填到 canonical raw shape。

    输入：
    - raw_shape: converter 产出的 canonical raw shape
    - workflow_path: 当前 workflow.yaml 的路径

    输出：
    - 已为每个 prompt 节点补齐 config.promptText 的 raw shape

    正式规则：
    - prompt 正文不再来自 workflow.yaml
    - 每个 prompt 节点都必须有同名 .prompt.md
    - 缺文件 / 空文件 / 不可读，统一视为 load 失败
    """

    if not isinstance(raw_shape, dict):
        raise WorkflowLoadError("Workflow raw shape must be an object")

    raw_nodes = raw_shape.get("nodes")
    if not isinstance(raw_nodes, list):
        raise WorkflowLoadError("Workflow raw shape nodes must be a list")

    next_nodes: list[dict[str, Any]] = []

    for index, raw_node in enumerate(raw_nodes):
        if not isinstance(raw_node, dict):
            raise WorkflowLoadError(
                f"Workflow raw node at index {index} must be an object"
            )

        node_id = raw_node.get("id")
        if not isinstance(node_id, str) or not node_id.strip():
            raise WorkflowLoadError(
                f"Workflow raw node at index {index} must include a valid id"
            )

        config = raw_node.get("config")
        if not isinstance(config, dict):
            raise WorkflowLoadError(
                f"Workflow raw node '{node_id}' must include config"
            )

        if config.get("type") != "prompt":
            next_nodes.append(raw_node)
            continue

        prompt_text = load_prompt_text_from_workflow_dir(
            workflow_path=workflow_path,
            node_id=node_id,
        )

        next_config = dict(config)
        next_config["promptText"] = prompt_text

        next_node = dict(raw_node)
        next_node["config"] = next_config
        next_nodes.append(next_node)

    next_raw_shape = dict(raw_shape)
    next_raw_shape["nodes"] = next_nodes
    return next_raw_shape