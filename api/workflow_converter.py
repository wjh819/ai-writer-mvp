from __future__ import annotations

from typing import Any, Dict, List

from contracts.workflow_contracts import WorkflowEditorData


"""
workflow persistent YAML shape 与 canonical raw shape 的转换层。

本文件角色：
- 只做 shape mapping
- 不做业务解释
- 作为 save/load 链中 YAML 持久化结构与 canonical raw shape 之间的中间转换层

负责：
- YAML 持久化结构 -> canonical raw shape
- canonical workflow model -> YAML 持久化结构

不负责：
- 默认值补齐
- 合法性判断
- dependency check
- 旧字段迁移
- 静默跳过非法数据

上下游：
- 上游由 loader 提供 raw YAML dict，或由 route/save 链提供 canonical workflow model
- 下游由 normalize 消费 raw shape，或由 loader/save 链写回 YAML

当前限制 / 待收口点：
- 当前持久化 nodes 为 dict，而 canonical nodes 为 list；如持久化布局变化，本文件必须联动
- converter 不理解 config 内部业务语义；只抽出 position，其余 config 字段按节点类型白名单收口后交给 normalize 阶段处理
"""


def _require_string(value: Any, label: str) -> str:
    """
    轻量字符串辅助。

    只负责：
    - 要求输入原本就是字符串
    - 做最小 strip

    不负责：
    - 任意类型 str() 强转
    - 空字符串之外的业务合法性判断
    """

    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    return value.strip()


def yaml_to_editor_schema(data: Any) -> dict:
    """
    将 YAML 持久化结构转换为 canonical raw shape。

    输入：
    - data: 从 YAML 读取出的原始顶层对象

    输出：
    - 可交给 normalize 的 canonical raw shape：
      {
          "nodes": [...],
          "edges": [...],
          "contextLinks": [...],
      }

    正式口径：
    - 只接受当前正式 YAML shape
    - 顶层必须显式包含 nodes / edges / contextLinks
    - prompt 正文不再属于 workflow.yaml
    - 不再兼容旧的 promptMode / prompt / inlinePrompt 残留 shape
    - 不静默跳过非法 node / edge / contextLink / 顶层结构

    不负责：
    - 默认值补齐
    - 合法性裁决
    - 旧字段兼容迁移
    - 依赖检查
    """

    if not isinstance(data, dict):
        raise ValueError("Workflow YAML root must be an object")

    if "nodes" not in data:
        raise ValueError("Workflow YAML must include 'nodes'")
    if "edges" not in data:
        raise ValueError("Workflow YAML must include 'edges'")
    if "contextLinks" not in data:
        raise ValueError("Workflow YAML must include 'contextLinks'")

    raw_nodes = data.get("nodes")
    raw_edges = data.get("edges")
    raw_context_links = data.get("contextLinks")

    if not isinstance(raw_nodes, dict):
        raise ValueError("Workflow YAML 'nodes' must be an object")

    if not isinstance(raw_edges, list):
        raise ValueError("Workflow YAML 'edges' must be a list")

    if not isinstance(raw_context_links, list):
        raise ValueError("Workflow YAML 'contextLinks' must be a list")

    nodes: List[Dict[str, Any]] = []
    for node_id, raw_node in raw_nodes.items():
        node_id_str = _require_string(node_id, "Workflow node id")
        if not node_id_str:
            raise ValueError("Workflow node id cannot be empty")

        if not isinstance(raw_node, dict):
            raise ValueError(f"Workflow node '{node_id_str}' must be an object")

        if "position" not in raw_node:
            raise ValueError(f"Workflow node '{node_id_str}' must declare position")

        position = raw_node.get("position")
        if not isinstance(position, dict):
            raise ValueError(
                f"Workflow node '{node_id_str}' position must be an object"
            )

        node_type = _require_string(
            raw_node.get("type"),
            f"Workflow node '{node_id_str}'.type",
        )

        if node_type == "input":
            config = {
                "type": "input",
                "inputKey": raw_node.get("inputKey"),
                "outputs": raw_node.get("outputs"),
                "defaultValue": raw_node.get("defaultValue"),
                "comment": raw_node.get("comment"),
            }

        elif node_type == "prompt":
            invalid_prompt_keys = [
                key
                for key in ("promptMode", "prompt", "inlinePrompt", "promptText")
                if key in raw_node
            ]
            if invalid_prompt_keys:
                raise ValueError(
                    f"Workflow node '{node_id_str}' prompt config contains invalid persisted fields: "
                    f"{', '.join(invalid_prompt_keys)}"
                )

            config = {
                "type": "prompt",
                "promptText": "",
                "comment": raw_node.get("comment"),
                "modelResourceId": raw_node.get("modelResourceId"),
                "llm": raw_node.get("llm"),
                "outputs": raw_node.get("outputs"),
            }

        elif node_type == "output":
            config = {
                "type": "output",
                "outputs": raw_node.get("outputs"),
                "comment": raw_node.get("comment"),
            }

        else:
            raise ValueError(
                f"Workflow node '{node_id_str}' has unsupported type: {node_type}"
            )

        nodes.append(
            {
                "id": node_id_str,
                "config": config,
                "position": {
                    "x": position.get("x"),
                    "y": position.get("y"),
                },
            }
        )

    edges: List[Dict[str, str]] = []
    for index, item in enumerate(raw_edges):
        if not isinstance(item, dict):
            raise ValueError(f"Workflow edge at index {index} must be an object")

        edges.append(
            {
                "source": _require_string(
                    item.get("source"),
                    f"Workflow edge[{index}].source",
                ),
                "sourceOutput": _require_string(
                    item.get("sourceOutput"),
                    f"Workflow edge[{index}].sourceOutput",
                ),
                "target": _require_string(
                    item.get("target"),
                    f"Workflow edge[{index}].target",
                ),
                "targetInput": _require_string(
                    item.get("targetInput"),
                    f"Workflow edge[{index}].targetInput",
                ),
            }
        )

    context_links: List[Dict[str, str]] = []
    for index, item in enumerate(raw_context_links):
        if not isinstance(item, dict):
            raise ValueError(
                f"Workflow contextLink at index {index} must be an object"
            )

        context_links.append(
            {
                "id": _require_string(
                    item.get("id"),
                    f"Workflow contextLink[{index}].id",
                ),
                "source": _require_string(
                    item.get("source"),
                    f"Workflow contextLink[{index}].source",
                ),
                "target": _require_string(
                    item.get("target"),
                    f"Workflow contextLink[{index}].target",
                ),
                "mode": _require_string(
                    item.get("mode"),
                    f"Workflow contextLink[{index}].mode",
                ),
            }
        )

    return {
        "nodes": nodes,
        "edges": edges,
        "contextLinks": context_links,
    }


def editor_schema_to_yaml(workflow: WorkflowEditorData) -> dict:
    """
    将 canonical workflow editor model 转换为 YAML 持久化结构。

    输入：
    - workflow: 已经进入 canonical contract 的 WorkflowEditorData

    输出：
    - 可直接写回 workflow.yaml 的持久化结构

    职责：
    - 只做 shape 转换
    - 按节点类型写回各自合法字段
    - prompt 正文不写入 workflow.yaml
    - edges 只写 data edge
    - contextLinks 单独写顶层窗口关系

    不负责：
    - 默认值补齐
    - 业务修复
    - 旧字段兼容
    - 合法性重新裁决

    当前限制：
    - 本函数默认输入已通过 normalize + validator
    - 若后续持久化布局变化，本函数需与 yaml_to_editor_schema 联动修改
    """

    nodes_dict: Dict[str, Dict[str, Any]] = {}

    for node in workflow.nodes:
        config = node.config

        node_data: Dict[str, Any] = {
            "type": config.type,
            "position": {
                "x": node.position.x,
                "y": node.position.y,
            },
            "outputs": [output.model_dump() for output in config.outputs],
        }

        if getattr(config, "comment", ""):
            node_data["comment"] = config.comment

        if config.type == "input":
            node_data["inputKey"] = config.inputKey
            node_data["defaultValue"] = config.defaultValue

        elif config.type == "prompt":
            node_data["modelResourceId"] = config.modelResourceId
            node_data["llm"] = config.llm.model_dump()

        elif config.type == "output":
            pass

        else:
            raise ValueError(f"Unsupported node config type: {config.type}")

        nodes_dict[node.id] = node_data

    edges_list = [
        {
            "source": edge.source,
            "sourceOutput": edge.sourceOutput,
            "target": edge.target,
            "targetInput": edge.targetInput,
        }
        for edge in workflow.edges
    ]

    context_links_list = [
        {
            "id": link.id,
            "source": link.source,
            "target": link.target,
            "mode": link.mode,
        }
        for link in workflow.contextLinks
    ]

    return {
        "nodes": nodes_dict,
        "edges": edges_list,
        "contextLinks": context_links_list,
    }