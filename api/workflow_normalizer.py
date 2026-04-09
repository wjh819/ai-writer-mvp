from __future__ import annotations

from typing import Any, List

from contracts.workflow_contracts import (
    InputNodeConfig,
    LLMConfig,
    NodeOutputSpec,
    OutputNodeConfig,
    Position,
    PromptNodeConfig,
    WorkflowContextLink,
    WorkflowEdge,
    WorkflowEditorData,
    WorkflowNode,
)


"""
workflow canonical normalize 层。

本文件角色：
- converter 之后、validator 之前的最小格式收敛入口
- canonical WorkflowEditorData 的唯一 normalize 主链

负责：
- 对 position / outputs / llm / contextLinks / 文本字段做最小 shape 收敛
- 通过 canonical model 实例化收口 shape-level 合法值
- 产出 WorkflowEditorData canonical model

不负责：
- 业务默认值补齐
- 非法值纠正
- 旧数据兼容迁移
- 图关系合法性判断
- 外部依赖检查
- 推导 new_window 等运行时窗口语义

上下游：
- 上游输入来自 converter 产出的 raw shape
- 下游由 validator 做结构 / 依赖裁决

当前限制 / 待收口点：
- llm 数值字段当前仍可能受 Pydantic coercion 影响；如需更严格类型，应升级 strict numeric 策略
- normalize 负责的是最小 shape 收敛，不应继续吸收 validator 或兼容迁移职责
"""


def _require_trimmed_string(value: Any, label: str) -> str:
    """
    严格字符串收敛。

    只负责：
    - 要求输入原本就是 str
    - 做最小 strip

    不负责：
    - 任意类型的 str() 强转
    - 空字符串之外的业务合法性判断
    """

    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    return value.strip()


def _normalize_optional_text(value: Any, label: str) -> str:
    """
    可归零文本字段收敛。

    适用场景：
    - comment

    规则：
    - None -> ""
    - str -> strip 后返回
    - 其他类型 -> 报错
    """

    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    return value.strip()


def _normalize_prompt_text(value: Any, label: str) -> str:
    """
    prompt 正文收敛。

    规则：
    - 必须原本就是 str
    - 不做 strip
    - 不在 normalize 阶段裁决“是否为空白正文”

    注意：
    - promptText 属于正文内容，不应在 normalize 阶段静默改写首尾空白
    - “正文是否为空 / 是否只有空白”由 validator 做正式裁决
    """

    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    return value


def _normalize_position(raw_position: Any) -> Position:
    """
    position 严格收敛。

    规则：
    - 必须是 dict
    - x / y 必须显式提供
    - 仅做类型转换，不补 0,0

    注意：
    - 这里只负责最小 shape 收敛
    - position 是否“合理”不在这里继续扩展解释
    """

    if not isinstance(raw_position, dict):
        raise ValueError("Node position must be an object")

    if "x" not in raw_position or "y" not in raw_position:
        raise ValueError("Node position must include both x and y")

    try:
        x = float(raw_position.get("x"))
    except Exception as exc:
        raise ValueError("Node position x must be a number") from exc

    try:
        y = float(raw_position.get("y"))
    except Exception as exc:
        raise ValueError("Node position y must be a number") from exc

    return Position(x=x, y=y)


def _normalize_llm_config(raw_llm: Any) -> LLMConfig:
    """
    llm 最小 shape 收敛。

    规则：
    - 必须是 dict
    - temperature / timeout / max_retries 必须显式提供
    - 不补默认值

    当前限制：
    - 这里依赖 LLMConfig 实例化收口字段 shape
    - 数值字段当前仍可能受 Pydantic coercion 影响，不等于 strict numeric validation
    """

    if not isinstance(raw_llm, dict):
        raise ValueError("Prompt node llm must be an object")

    required_fields = ("temperature", "timeout", "max_retries")
    for field_name in required_fields:
        if field_name not in raw_llm:
            raise ValueError(f"Prompt node llm must include '{field_name}'")

    return LLMConfig(
        temperature=raw_llm.get("temperature"),
        timeout=raw_llm.get("timeout"),
        max_retries=raw_llm.get("max_retries"),
    )


def _normalize_output_specs(raw_outputs: Any) -> List[NodeOutputSpec]:
    """
    outputs 最小 shape 收敛。

    规则：
    - 必须是 list
    - 每项必须是 dict
    - name / stateKey 必须原本就是字符串
    - 不补默认 output name / stateKey

    不负责：
    - output name / stateKey 唯一性
    - 业务级冲突裁决
    """

    if not isinstance(raw_outputs, list):
        raise ValueError("Node outputs must be a list")

    outputs: List[NodeOutputSpec] = []

    for index, raw_output in enumerate(raw_outputs):
        if not isinstance(raw_output, dict):
            raise ValueError(f"Node output spec at index {index} must be an object")

        outputs.append(
            NodeOutputSpec(
                name=_require_trimmed_string(
                    raw_output.get("name"),
                    f"Node output spec[{index}].name",
                ),
                stateKey=_require_trimmed_string(
                    raw_output.get("stateKey"),
                    f"Node output spec[{index}].stateKey",
                ),
            )
        )

    return outputs


def _normalize_node_config(raw_config: Any):
    """
    单节点 config 的最小 normalize 入口。

    规则：
    - config 必须是 dict
    - 只做字段级 shape 收敛与最小文本规范化
    - 不修正非法 type
    - 不补默认 outputs
    - 不补默认 llm
    - 不补 defaultValue
    - 不补 promptText
    - 不补窗口关系默认值

    注意：
    - 这里会直接实例化 canonical model
    - 因此 type 等枚举字段的 shape-level 合法值
      也会在 normalize 阶段被裁决
    - validator 负责的是结构关系、业务规则和依赖规则
    """

    if not isinstance(raw_config, dict):
        raise ValueError("Node config must be an object")

    node_type = _require_trimmed_string(
        raw_config.get("type"),
        "Node config type",
    )
    outputs = _normalize_output_specs(raw_config.get("outputs"))

    if node_type == "input":
        if "defaultValue" not in raw_config:
            raise ValueError("Input node defaultValue must be explicitly provided")

        return InputNodeConfig(
            type="input",
            inputKey=_require_trimmed_string(
                raw_config.get("inputKey"),
                "Input node inputKey",
            ),
            outputs=outputs,
            defaultValue=_require_trimmed_string(
                raw_config.get("defaultValue"),
                "Input node defaultValue",
            ),
            comment=_normalize_optional_text(
                raw_config.get("comment"),
                "Input node comment",
            ),
        )

    if node_type == "prompt":
        if "promptText" not in raw_config:
            raise ValueError("Prompt node promptText must be explicitly provided")

        return PromptNodeConfig(
            type="prompt",
            promptText=_normalize_prompt_text(
                raw_config.get("promptText"),
                "Prompt node promptText",
            ),
            comment=_normalize_optional_text(
                raw_config.get("comment"),
                "Prompt node comment",
            ),
            modelResourceId=_require_trimmed_string(
                raw_config.get("modelResourceId"),
                "Prompt node modelResourceId",
            ),
            llm=_normalize_llm_config(raw_config.get("llm")),
            outputs=outputs,
        )

    if node_type == "output":
        return OutputNodeConfig(
            type="output",
            outputs=outputs,
            comment=_normalize_optional_text(
                raw_config.get("comment"),
                "Output node comment",
            ),
        )

    raise ValueError(f"Invalid node type: {node_type}")


def _normalize_context_links(raw_links: Any) -> List[WorkflowContextLink]:
    """
    contextLinks 最小 shape 收敛。

    规则：
    - 必须是 list
    - 每项必须是 dict
    - id / source / target / mode 必须原本就是字符串
    - 只做 trim

    不在这里裁决：
    - source / target 节点是否存在
    - source / target 是否都是 prompt
    - 每个 target 是否重复
    - source / target model 是否一致
    - 是否形成环

    注意：
    - 这里会直接实例化 WorkflowContextLink canonical model
    - 因此 mode 的 shape-level 合法值也会在 normalize 阶段被裁决
    - 上述图关系业务合法性统一交给 validator
    """

    if not isinstance(raw_links, list):
        raise ValueError("Workflow contextLinks must be a list")

    context_links: List[WorkflowContextLink] = []

    for index, raw_link in enumerate(raw_links):
        if not isinstance(raw_link, dict):
            raise ValueError(f"Workflow contextLink at index {index} must be an object")

        context_links.append(
            WorkflowContextLink(
                id=_require_trimmed_string(
                    raw_link.get("id"),
                    f"Workflow contextLink[{index}].id",
                ),
                source=_require_trimmed_string(
                    raw_link.get("source"),
                    f"Workflow contextLink[{index}].source",
                ),
                target=_require_trimmed_string(
                    raw_link.get("target"),
                    f"Workflow contextLink[{index}].target",
                ),
                mode=_require_trimmed_string(
                    raw_link.get("mode"),
                    f"Workflow contextLink[{index}].mode",
                ),
            )
        )

    return context_links


def normalize_workflow_editor_data(raw_data: Any) -> WorkflowEditorData:
    """
    workflow canonical normalize 唯一入口。

    输入：
    - raw_data: converter 产出的 canonical raw shape，或前端提交的等价 raw payload

    输出：
    - WorkflowEditorData canonical model

    正式主链：
    raw input
    -> shape mapping（converter）
    -> normalize（本文件）
    -> validator
    -> engine / save

    职责：
    - 对节点 / data edges / context links / position / 文本字段做最小格式收敛
    - 产出 WorkflowEditorData canonical model
    - 通过 canonical model 实例化完成 shape-level 合法值收口

    不负责：
    - 业务默认值补齐
    - 非法值纠正
    - 旧数据兼容修复
    - 推导 new_window 一类运行时窗口语义
    """

    if not isinstance(raw_data, dict):
        raise ValueError("Workflow payload must be an object")

    required_top_level_fields = ("nodes", "edges", "contextLinks")
    for field_name in required_top_level_fields:
        if field_name not in raw_data:
            raise ValueError(f"Workflow payload must include '{field_name}'")

    raw_nodes = raw_data.get("nodes")
    raw_edges = raw_data.get("edges")
    raw_context_links = raw_data.get("contextLinks")

    if not isinstance(raw_nodes, list):
        raise ValueError("Workflow nodes must be a list")

    if not isinstance(raw_edges, list):
        raise ValueError("Workflow edges must be a list")

    nodes: List[WorkflowNode] = []
    for index, raw_node in enumerate(raw_nodes):
        if not isinstance(raw_node, dict):
            raise ValueError(f"Workflow node at index {index} must be an object")

        node_id = _require_trimmed_string(
            raw_node.get("id"),
            f"Workflow node[{index}].id",
        )
        if not node_id:
            raise ValueError("Node id cannot be empty")

        if "config" not in raw_node:
            raise ValueError(f"Workflow node '{node_id}' must include config")
        if "position" not in raw_node:
            raise ValueError(f"Workflow node '{node_id}' must include position")

        config = _normalize_node_config(raw_node.get("config"))
        position = _normalize_position(raw_node.get("position"))

        nodes.append(
            WorkflowNode(
                id=node_id,
                config=config,
                position=position,
            )
        )

    edges: List[WorkflowEdge] = []
    for index, raw_edge in enumerate(raw_edges):
        if not isinstance(raw_edge, dict):
            raise ValueError(f"Workflow edge at index {index} must be an object")

        edges.append(
            WorkflowEdge(
                source=_require_trimmed_string(
                    raw_edge.get("source"),
                    f"Workflow edge[{index}].source",
                ),
                sourceOutput=_require_trimmed_string(
                    raw_edge.get("sourceOutput"),
                    f"Workflow edge[{index}].sourceOutput",
                ),
                target=_require_trimmed_string(
                    raw_edge.get("target"),
                    f"Workflow edge[{index}].target",
                ),
                targetInput=_require_trimmed_string(
                    raw_edge.get("targetInput"),
                    f"Workflow edge[{index}].targetInput",
                ),
            )
        )

    context_links = _normalize_context_links(raw_context_links)

    return WorkflowEditorData(
        nodes=nodes,
        edges=edges,
        contextLinks=context_links,
    )