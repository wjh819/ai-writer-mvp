from __future__ import annotations

import re

from app_errors import InvalidInputError
from backend_workflow_canonical.workflow_validation_execution_graph import (
    _assert_acyclic_execution_graph,
    collect_context_source_outbound_rule_errors,
)
from contracts.workflow_contracts import (
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
    WorkflowContextLink,
    WorkflowEditorData,
)

"""
workflow structure / helper 校验子模块。

本文件角色：
- 承接 structure validation 与基础 helper 相关实现

负责：
- 轻量 trim / identifier / node id helper
- workflow structure validation

不负责：
- dependency validation
- subgraph / partial validation
- 顶层 validator 入口
"""


NODE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def _trim(value: str | None) -> str:
    """
    轻量文本辅助。

    只负责：
    - None -> ""
    - 对字符串做 strip

    不负责：
    - 任意类型强转
    - 业务合法性判断
    """

    if value is None:
        return ""
    return value.strip()


def is_valid_identifier(value: str) -> bool:
    """
    判断值是否满足当前标识符规则。

    当前规则：
    - 必须以字母或下划线开头
    - 后续只允许字母、数字、下划线
    """

    return bool(re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", value))


def validate_identifier(value: str, label: str):
    """
    标识符合法性校验。

    只负责：
    - 非空校验
    - 标识符格式校验

    不负责：
    - 业务级唯一性校验
    """

    if not value:
        raise InvalidInputError(f"{label} cannot be empty")

    if not is_valid_identifier(value):
        raise InvalidInputError(
            f"{label} must start with a letter or underscore, "
            f"and contain only letters, numbers, and underscores"
        )


def validate_node_id(value: str, label: str):
    """
    node id 合法性校验。

    当前规则：
    - 必须非空
    - 必须匹配 ^[A-Za-z0-9][A-Za-z0-9_-]*$
    """

    if not value:
        raise InvalidInputError(f"{label} cannot be empty")

    if not NODE_ID_PATTERN.match(value):
        raise InvalidInputError(
            f"{label} must match ^[A-Za-z0-9][A-Za-z0-9_-]*$"
        )


def validate_workflow_structure(
    workflow: WorkflowEditorData,
    *,
    enforce_source_outbound_rules: bool = True,
):
    """
    只做结构合法性裁决。

    负责：
    - nodes / edges / contextLinks 顶层结构
    - node id 唯一性与 node id 正式格式
    - outputs / stateKey / output name 规则
    - edge binding 结构合法性
    - input 节点禁止 inbound data edge
    - output 节点 inbound data edge 约束
    - contextLinks 的结构规则
    - contextLinks 的 prompt -> prompt 约束
    - contextLinks 的 target 唯一性
    - contextLinks 的 model 一致性
    - context source 的 outbound 规则（按当前实现范围）
    - 联合执行关系图 cycle 检查

    不负责：
    - modelResourceId 是否真实可解析
    - promptText 变量是否与 data edge bindings 对齐

    注意：
    - editor load 路径可以通过 enforce_source_outbound_rules=False
      将部分 outbound 规则违规降级为 warning
    """

    if not workflow.nodes:
        raise InvalidInputError("Workflow must contain at least one node")

    node_ids: set[str] = set()
    node_by_id: dict[str, object] = {}
    incoming_data_edges_by_target: dict[str, list] = {}
    output_name_to_state_key_by_node: dict[str, dict[str, str]] = {}
    state_key_to_node: dict[str, str] = {}

    # 第一遍：收集 node ids
    for node in workflow.nodes:
        node_id = _trim(node.id)
        validate_node_id(node_id, "Node id")

        if node_id in node_ids:
            raise InvalidInputError(f"Duplicate node id: {node_id}")

        node_ids.add(node_id)
        node_by_id[node_id] = node
        incoming_data_edges_by_target[node_id] = []

    # 第二遍：校验每个节点的基础结构与 outputs
    for node in workflow.nodes:
        node_id = _trim(node.id)
        config = node.config

        outputs = list(getattr(config, "outputs", []) or [])
        if len(outputs) == 0:
            raise InvalidInputError(
                f"Node '{node_id}' must declare at least one output"
            )

        output_name_map: dict[str, str] = {}

        for output_spec in outputs:
            output_name = _trim(output_spec.name)
            state_key = _trim(output_spec.stateKey)

            validate_identifier(output_name, f"Node '{node_id}' output name")
            validate_identifier(state_key, f"Node '{node_id}' stateKey")

            if output_name in output_name_map:
                raise InvalidInputError(
                    f"Node '{node_id}' has duplicate output name: {output_name}"
                )

            if state_key == node_id:
                raise InvalidInputError(
                    f"Node '{node_id}' stateKey '{state_key}' cannot be the same as node id"
                )

            if state_key in node_ids and state_key != node_id:
                raise InvalidInputError(
                    f"Node '{node_id}' stateKey '{state_key}' conflicts with existing node id"
                )

            if state_key in state_key_to_node:
                raise InvalidInputError(
                    f"Duplicate stateKey '{state_key}' found in "
                    f"'{state_key_to_node[state_key]}' and '{node_id}'"
                )

            output_name_map[output_name] = state_key
            state_key_to_node[state_key] = node_id

        output_name_to_state_key_by_node[node_id] = output_name_map

        if isinstance(config, InputNodeConfig):
            input_key = _trim(config.inputKey)
            if not input_key:
                raise InvalidInputError(
                    f"Input node '{node_id}' must declare inputKey"
                )

            validate_identifier(input_key, f"Input node '{node_id}' inputKey")

            if len(outputs) != 1:
                raise InvalidInputError(
                    f"Input node '{node_id}' must declare exactly one output"
                )

            if config.defaultValue is None:
                raise InvalidInputError(
                    f"Input node '{node_id}' must declare defaultValue"
                )

            continue

        if isinstance(config, PromptNodeConfig):
            model_resource_id = _trim(config.modelResourceId)

            if not model_resource_id:
                raise InvalidInputError(
                    f"Prompt node '{node_id}' must select a model resource"
                )

            if config.llm is None:
                raise InvalidInputError(
                    f"Prompt node '{node_id}' must declare llm config"
                )

            if not _trim(config.promptText):
                raise InvalidInputError(
                    f"Prompt node '{node_id}' must provide promptText"
                )

            continue

        if isinstance(config, OutputNodeConfig):
            if len(outputs) != 1:
                raise InvalidInputError(
                    f"Output node '{node_id}' must declare exactly one output"
                )
            continue

        raise InvalidInputError(f"Node '{node_id}' has invalid config type")

    # 第三遍：校验 data edges / bindings
    target_inputs_seen: dict[str, set[str]] = {
        node_id: set() for node_id in node_ids
    }

    for edge in workflow.edges:
        src = _trim(edge.source)
        src_output = _trim(edge.sourceOutput)
        dst = _trim(edge.target)
        dst_input = _trim(edge.targetInput)

        if not src or not dst:
            raise InvalidInputError("Edge source/target cannot be empty")

        if src not in node_ids:
            raise InvalidInputError(f"Edge source node not found: {src}")

        if dst not in node_ids:
            raise InvalidInputError(f"Edge target node not found: {dst}")

        target_node = node_by_id[dst]
        target_config = getattr(target_node, "config", None)

        if isinstance(target_config, InputNodeConfig):
            raise InvalidInputError(
                f"Input node '{dst}' cannot accept inbound bindings"
            )

        validate_identifier(src_output, f"Edge sourceOutput ({src} -> {dst})")
        validate_identifier(dst_input, f"Edge targetInput ({src} -> {dst})")

        source_output_map = output_name_to_state_key_by_node.get(src, {})
        if src_output not in source_output_map:
            raise InvalidInputError(
                f"Edge sourceOutput '{src_output}' not found on node '{src}'"
            )

        if dst_input in target_inputs_seen[dst]:
            raise InvalidInputError(
                f"Target input '{dst_input}' on node '{dst}' has multiple inbound bindings"
            )

        target_inputs_seen[dst].add(dst_input)
        incoming_data_edges_by_target[dst].append(edge)

    context_link_ids_seen: set[str] = set()

    for link in workflow.contextLinks:
        link_id = _trim(link.id)

        if not link_id:
            raise InvalidInputError("Workflow contextLink id cannot be empty")

        if link_id in context_link_ids_seen:
            raise InvalidInputError(f"Duplicate contextLink id: {link_id}")

        context_link_ids_seen.add(link_id)

    # 第四遍：校验 contextLinks
    inbound_context_link_by_target: dict[str, WorkflowContextLink] = {}

    for link in workflow.contextLinks:
        source_prompt_node_id = _trim(link.source)
        target_prompt_node_id = _trim(link.target)

        if not source_prompt_node_id:
            raise InvalidInputError(
                "Workflow contextLink source cannot be empty"
            )

        if not target_prompt_node_id:
            raise InvalidInputError(
                "Workflow contextLink target cannot be empty"
            )

        if source_prompt_node_id == target_prompt_node_id:
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' cannot inherit/branch from itself"
            )

        if source_prompt_node_id not in node_ids:
            raise InvalidInputError(
                f"Context link source prompt node not found: {source_prompt_node_id}"
            )

        if target_prompt_node_id not in node_ids:
            raise InvalidInputError(
                f"Context link target prompt node not found: {target_prompt_node_id}"
            )

        source_node = node_by_id[source_prompt_node_id]
        target_node = node_by_id[target_prompt_node_id]

        source_config = getattr(source_node, "config", None)
        target_config = getattr(target_node, "config", None)

        if not isinstance(source_config, PromptNodeConfig):
            raise InvalidInputError(
                f"Context link source '{source_prompt_node_id}' must be a prompt node"
            )

        if not isinstance(target_config, PromptNodeConfig):
            raise InvalidInputError(
                f"Context link target '{target_prompt_node_id}' must be a prompt node"
            )

        if target_prompt_node_id in inbound_context_link_by_target:
            existing = inbound_context_link_by_target[target_prompt_node_id]
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' has multiple inbound context links: "
                f"'{existing.source}' and '{source_prompt_node_id}'"
            )

        if _trim(source_config.modelResourceId) != _trim(target_config.modelResourceId):
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' must use the same modelResourceId "
                f"as its context source '{source_prompt_node_id}'"
            )

        inbound_context_link_by_target[target_prompt_node_id] = link

    if enforce_source_outbound_rules:
        outbound_rule_errors = collect_context_source_outbound_rule_errors(workflow)
        if outbound_rule_errors:
            raise InvalidInputError(outbound_rule_errors[0])

    # 第五遍：节点级依赖于边收集后的结构规则
    for node in workflow.nodes:
        node_id = _trim(node.id)
        config = node.config

        if isinstance(config, OutputNodeConfig):
            if len(incoming_data_edges_by_target[node_id]) == 0:
                raise InvalidInputError(
                    f"Output node '{node_id}' must have at least one inbound binding"
                )

    # 最后：联合执行关系图必须无环
    _assert_acyclic_execution_graph(workflow)
