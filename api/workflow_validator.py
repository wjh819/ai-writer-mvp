import re
from collections import defaultdict, deque
from string import Formatter

from app_errors import InvalidInputError
from contracts.workflow_contracts import (
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
    WorkflowContextLink,
    WorkflowEditorData,
)
from core.model_resource_registry import load_model_resource_registry


"""
workflow 合法性裁决层。

本文件角色：
- workflow canonical editor model 的正式 validator
- 区分 structure validation 与 dependency validation

负责：
- 节点 / 边 / contextLinks 结构规则
- output / stateKey / binding 规则
- 联合执行关系图无环检查
- modelResourceId / promptText 变量绑定依赖检查
- subgraph test 边界节点对当前 canonical workflow 的最小校验

不负责：
- 默认值补齐
- 旧字段兼容
- HTTP 语义翻译
- engine 运行
- subgraph reachability / topo 排序本体

上下游：
- 上游输入来自 normalize 后的 canonical workflow
- 下游由 save/load/run 主链消费裁决结果

当前限制 / 待收口点：
- dependency validation 会访问外部资源（model registry），不是纯内存函数
- context source outbound 规则当前实现重点是“最多一个 continue”，可能弱于完整业务目标；修改时须同时核对前端 validator 与 graph 层
- validator 与 engine 之间存在部分防御性规则重复，用于防止上游绕过校验后错误下沉到执行期
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


def extract_template_variables(prompt_text: str) -> set[str]:
    """
    从 promptText 中提取顶层变量名集合。

    注意：
    - 这里只提取 format field 的根变量名
    - 不负责校验 prompt 语义是否合理
    - 结果仅用于与 data edge inbound bindings 做对齐检查
    """

    variables: set[str] = set()

    for _, field_name, _, _ in Formatter().parse(prompt_text or ""):
        if not field_name:
            continue

        root_name = field_name.split(".", 1)[0].split("[", 1)[0].strip()
        if root_name:
            variables.add(root_name)

    return variables


def _build_incoming_data_edges_by_target(
    workflow: WorkflowEditorData,
) -> dict[str, list]:
    """
    构建 target -> incoming data edges 映射。

    只负责：
    - 收集普通 data edges
    - 供 dependency validation 做 promptText 变量绑定检查

    不负责：
    - contextLinks 收集
    """

    incoming_edges_by_target: dict[str, list] = {}
    for node in workflow.nodes:
        incoming_edges_by_target[node.id] = []

    for edge in workflow.edges:
        incoming_edges_by_target[edge.target].append(edge)

    return incoming_edges_by_target


def _build_execution_relation_graph(
    workflow: WorkflowEditorData,
) -> dict[str, list[str]]:
    """
    构建执行顺序关系图。

    正式规则：
    - data edge：提供 source -> target 执行顺序约束
    - context link：提供 source -> target 执行顺序约束
    - 输入绑定解析仍只看 data edges
    - cycle check 看 data edges ∪ contextLinks

    注意：
    - 这是 validator 侧的执行关系图
    - engine 内部仍会维护自己的图构建与拓扑排序逻辑，属于当前防御性重复
    """

    graph: dict[str, list[str]] = defaultdict(list)

    for node in workflow.nodes:
        graph[node.id] = []

    for edge in workflow.edges:
        graph[edge.source].append(edge.target)

    for link in workflow.contextLinks:
        graph[link.source].append(link.target)

    return graph


def _assert_acyclic_execution_graph(workflow: WorkflowEditorData):
    """
    断言联合执行关系图无环。

    检查范围：
    - data edges
    - contextLinks

    目标：
    - 保证执行顺序图仍为 DAG
    """

    graph = _build_execution_relation_graph(workflow)
    in_degree: dict[str, int] = {node.id: 0 for node in workflow.nodes}

    for source, neighbors in graph.items():
        for target in neighbors:
            if source == target:
                raise InvalidInputError(
                    f"Execution relation graph contains self-loop at node '{source}'"
                )
            in_degree[target] += 1

    queue = deque(
        node_id for node_id, degree in in_degree.items() if degree == 0
    )
    visited_count = 0

    while queue:
        current = queue.popleft()
        visited_count += 1

        for neighbor in graph.get(current, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited_count != len(in_degree):
        raise InvalidInputError(
            "Workflow execution relation graph has a cycle "
            "(data edges + contextLinks must form a DAG)"
        )


def collect_context_source_outbound_rule_errors(
    workflow: WorkflowEditorData,
) -> list[str]:
    """
    收集 context source outbound 规则错误。

    当前实现重点：
    - 同一 source prompt 最多只能有一个 continue outbound context link

    当前限制：
    - 本函数当前并未表达全部潜在业务目标
    - 若未来补充“continue 与 branch 不可并存”等更强规则，应同时同步前端 graph / validator 提前提示逻辑
    """

    outbound_modes_by_source: dict[str, list[str]] = defaultdict(list)

    for link in workflow.contextLinks:
        source_prompt_node_id = _trim(link.source)
        mode = _trim(link.mode)

        if not source_prompt_node_id or not mode:
            continue

        outbound_modes_by_source[source_prompt_node_id].append(mode)

    errors: list[str] = []

    for source_prompt_node_id, modes in outbound_modes_by_source.items():
        if modes.count("continue") > 1:
            errors.append(
                f"Prompt node '{source_prompt_node_id}' can have at most one continue outbound context link"
            )

    return errors


def _collect_node_maps(workflow: WorkflowEditorData) -> tuple[dict[str, object], set[str]]:
    """
    收集全图 node map 与 node id 集合。

    注意：
    - 这是 subgraph test / full run 共用的基础唯一性检查
    - node id 全局唯一仍然是最基础的 canonical 前提
    """

    node_ids: set[str] = set()
    node_by_id: dict[str, object] = {}

    for node in workflow.nodes:
        node_id = _trim(node.id)
        validate_node_id(node_id, "Node id")
        if node_id in node_ids:
            raise InvalidInputError(f"Duplicate node id: {node_id}")

        node_ids.add(node_id)
        node_by_id[node_id] = node

    return node_by_id, node_ids


def _build_selected_execution_node_ids(
    workflow: WorkflowEditorData,
    *,
    start_node_id: str,
    end_node_ids: list[str] | None = None,
) -> set[str]:
    """
    计算本次 subgraph test 的实际执行范围节点集合。

    规则：
    - 从 start_node_id 出发
    - 沿 data edges + contextLinks 共同形成的执行图向下游扩展
    - 若提供 end_node_ids，则只保留“既从 start 可达、又能到达任一 end”的节点
    """

    _, node_ids = _collect_node_maps(workflow)
    normalized_start_node_id, normalized_end_node_ids = validate_partial_execution_selection(
        workflow,
        start_node_id=start_node_id,
        end_node_ids=end_node_ids,
    )

    adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_ids}

    for edge in workflow.edges:
        source = _trim(edge.source)
        target = _trim(edge.target)
        if source in node_ids and target in node_ids:
            adjacency[source].append(target)

    for link in workflow.contextLinks:
        source = _trim(link.source)
        target = _trim(link.target)
        if source in node_ids and target in node_ids:
            adjacency[source].append(target)

    reachable_from_start: set[str] = set()
    queue = deque([normalized_start_node_id])

    while queue:
        current = queue.popleft()
        if current in reachable_from_start:
            continue

        reachable_from_start.add(current)
        for neighbor in adjacency.get(current, []):
            if neighbor not in reachable_from_start:
                queue.append(neighbor)

    if not normalized_end_node_ids:
        return reachable_from_start

    unreachable_end_node_ids = [
        node_id
        for node_id in normalized_end_node_ids
        if node_id not in reachable_from_start
    ]
    if unreachable_end_node_ids:
        raise InvalidInputError(
            "End nodes are not reachable from start node "
            f"'{normalized_start_node_id}': {sorted(unreachable_end_node_ids)}"
        )

    reverse_graph: dict[str, list[str]] = defaultdict(list)
    for source, targets in adjacency.items():
        for target in targets:
            reverse_graph[target].append(source)

    can_reach_end: set[str] = set(normalized_end_node_ids)
    queue = deque(normalized_end_node_ids)

    while queue:
        current = queue.popleft()
        for parent in reverse_graph.get(current, []):
            if parent in reachable_from_start and parent not in can_reach_end:
                can_reach_end.add(parent)
                queue.append(parent)

    selected_node_ids = {
        node_id for node_id in reachable_from_start if node_id in can_reach_end
    }

    if normalized_start_node_id not in selected_node_ids:
        raise InvalidInputError(
            f"Start node '{normalized_start_node_id}' is not included in selected subgraph"
        )

    return selected_node_ids


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


def validate_workflow_dependencies(workflow: WorkflowEditorData):
    """
    只做依赖检查。

    负责：
    - modelResourceId 是否存在
    - promptText 中声明的变量与 data edge inbound bindings 是否匹配

    注意：
    - 这里的变量绑定检查只看普通 data edges
    - contextLinks 不参与结构化输入变量绑定
    - 本函数会访问外部资源（model registry），不是纯内存 validator
    """

    prompt_nodes = [
        node for node in workflow.nodes if isinstance(node.config, PromptNodeConfig)
    ]
    if not prompt_nodes:
        return

    incoming_edges_by_target = _build_incoming_data_edges_by_target(workflow)
    active_model_resource_registry = load_model_resource_registry()

    for node in prompt_nodes:
        node_id = _trim(node.id)
        config = node.config

        model_resource_id = _trim(config.modelResourceId)
        if not active_model_resource_registry:
            raise InvalidInputError(
                f"Prompt node '{node_id}' references model resource "
                f"'{model_resource_id}', but no model resources are configured"
            )

        if model_resource_id not in active_model_resource_registry:
            raise InvalidInputError(
                f"Prompt node '{node_id}' references unknown model resource "
                f"'{model_resource_id}'"
            )

        required_variables = extract_template_variables(config.promptText or "")
        bound_target_inputs = {
            _trim(edge.targetInput)
            for edge in incoming_edges_by_target.get(node_id, [])
        }

        missing_variables = sorted(required_variables - bound_target_inputs)
        if missing_variables:
            raise InvalidInputError(
                f"Prompt node '{node_id}' is missing inbound bindings for variables: "
                f"{', '.join(missing_variables)}"
            )


def validate_partial_execution_selection(
    workflow: WorkflowEditorData,
    *,
    start_node_id: str,
    end_node_ids: list[str] | None = None,
) -> tuple[str, list[str]]:
    """
    校验 subgraph test 的边界节点选择。

    负责：
    - start_node_id 非空
    - start_node_id 必须存在于当前 canonical workflow
    - end_node_ids 中每个值都必须非空且存在
    - end_node_ids 去重并保持原顺序

    不负责：
    - HTTP 请求体 shape owner
    - 子图可达性判断
    - topo 排序
    - engine 执行

    注意：
    - 这是“针对当前 canonical workflow 的选择校验”辅助函数
    - 更深的子图语义仍由 engine 在 definition/runtime 链上裁决
    """

    _, node_ids = _collect_node_maps(workflow)

    normalized_start_node_id = _trim(start_node_id)
    if not normalized_start_node_id:
        raise InvalidInputError("Start node id is required")

    if normalized_start_node_id not in node_ids:
        raise InvalidInputError(f"Start node not found: {normalized_start_node_id}")

    normalized_end_node_ids: list[str] = []
    seen_end_node_ids: set[str] = set()

    for raw_node_id in list(end_node_ids or []):
        node_id = _trim(raw_node_id)
        if not node_id:
            raise InvalidInputError("End node ids must not contain empty values")

        if node_id not in node_ids:
            raise InvalidInputError(f"End node not found: {node_id}")

        if node_id not in seen_end_node_ids:
            normalized_end_node_ids.append(node_id)
            seen_end_node_ids.add(node_id)

    return normalized_start_node_id, normalized_end_node_ids


def validate_partial_execution_workflow(
    workflow: WorkflowEditorData,
    *,
    start_node_id: str,
    end_node_ids: list[str] | None = None,
) -> tuple[str, list[str]]:
    """
    subgraph test 的正式裁决入口。

    正式顺序：
    - 先校验边界节点选择
    - 再确定本次 execution 范围内的节点集合
    - 再只对该 execution 范围内真正参与裁决的结构/依赖做校验

    当前口径：
    - 不再要求整图 full validate 先通过
    - 与本次 start 节点可达子图无关的坏区，不应在 route 层先阻断本次 subgraph test
    - prompt window context source 若不在 execution 范围内，subgraph test 路径按 new_window 处理，因此不把该类外部 context link 当作本次裁决对象
    - 但 selected 节点自己的 config、selected 节点接收的 inbound data binding、以及 selected 范围内部的 contextLinks 仍必须合法
    """

    if not workflow.nodes:
        raise InvalidInputError("Workflow must contain at least one node")

    node_by_id, node_ids = _collect_node_maps(workflow)
    normalized_start_node_id, normalized_end_node_ids = validate_partial_execution_selection(
        workflow,
        start_node_id=start_node_id,
        end_node_ids=end_node_ids,
    )
    selected_node_ids = _build_selected_execution_node_ids(
        workflow,
        start_node_id=normalized_start_node_id,
        end_node_ids=normalized_end_node_ids,
    )

    state_key_to_selected_node: dict[str, str] = {}
    output_name_to_state_key_by_node: dict[str, dict[str, str]] = {}
    incoming_data_edges_by_selected_target: dict[str, list] = {
        node_id: [] for node_id in selected_node_ids
    }

    # 第一遍：只校验 selected 节点自己的 node-level canonical 规则
    for node in workflow.nodes:
        node_id = _trim(node.id)
        if node_id not in selected_node_ids:
            continue

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

            if state_key in selected_node_ids and state_key != node_id:
                raise InvalidInputError(
                    f"Node '{node_id}' stateKey '{state_key}' conflicts with existing selected node id"
                )

            if state_key in state_key_to_selected_node:
                raise InvalidInputError(
                    f"Duplicate stateKey '{state_key}' found in "
                    f"'{state_key_to_selected_node[state_key]}' and '{node_id}' "
                    "within selected subgraph test scope"
                )

            output_name_map[output_name] = state_key
            state_key_to_selected_node[state_key] = node_id

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

    # 第二遍：校验所有指向 selected 节点的 inbound data bindings。
    # 注意：
    # - source 节点可以不在 selected execution 范围内，因为 subgraph test 可以由 test_state 提供它的 stateKey
    # - 但该 source 节点本身必须真实存在，且 sourceOutput 必须合法
    target_inputs_seen: dict[str, set[str]] = {
        node_id: set() for node_id in selected_node_ids
    }

    for edge in workflow.edges:
        src = _trim(edge.source)
        src_output = _trim(edge.sourceOutput)
        dst = _trim(edge.target)
        dst_input = _trim(edge.targetInput)

        if dst in selected_node_ids:
            if not src or not dst:
                raise InvalidInputError("Edge source/target cannot be empty")

            if src not in node_ids:
                raise InvalidInputError(f"Edge source node not found: {src}")

            target_node = node_by_id[dst]
            target_config = getattr(target_node, "config", None)
            if isinstance(target_config, InputNodeConfig):
                raise InvalidInputError(
                    f"Input node '{dst}' cannot accept inbound bindings"
                )

            validate_identifier(src_output, f"Edge sourceOutput ({src} -> {dst})")
            validate_identifier(dst_input, f"Edge targetInput ({src} -> {dst})")

            source_node = node_by_id[src]
            source_outputs = list(getattr(source_node.config, "outputs", []) or [])
            source_output_map = {
                _trim(output.name): _trim(output.stateKey)
                for output in source_outputs
                if _trim(output.name)
            }
            if src_output not in source_output_map:
                raise InvalidInputError(
                    f"Edge sourceOutput '{src_output}' not found on node '{src}'"
                )

            if dst_input in target_inputs_seen[dst]:
                raise InvalidInputError(
                    f"Target input '{dst_input}' on node '{dst}' has multiple inbound bindings"
                )

            target_inputs_seen[dst].add(dst_input)
            incoming_data_edges_by_selected_target[dst].append(edge)
            continue

        # selected source -> missing target 仍属于本次 partial 主链上的坏边
        if src in selected_node_ids and dst not in node_ids:
            raise InvalidInputError(f"Edge target node not found: {dst}")

    # - source 节点可以不在 selected execution 范围内，因为 subgraph test 可以由 test_state 提供它的 stateKey。
    # target 在 selected、但 source 不在 selected 的 inbound context link，
    # subgraph test 语义下会被 engine 视为 new_window，因此这里不作为阻断条件。
    selected_internal_context_links: list[WorkflowContextLink] = []
    context_link_ids_seen: set[str] = set()
    inbound_internal_context_link_by_target: dict[str, WorkflowContextLink] = {}

    for link in workflow.contextLinks:
        link_id = _trim(link.id)
        source_prompt_node_id = _trim(link.source)
        target_prompt_node_id = _trim(link.target)

        if (
            source_prompt_node_id in selected_node_ids
            and target_prompt_node_id not in node_ids
        ):
            raise InvalidInputError(
                f"Context link target prompt node not found: {target_prompt_node_id}"
            )

        if target_prompt_node_id not in selected_node_ids:
            continue

        if source_prompt_node_id not in selected_node_ids:
            continue

        if not link_id:
            raise InvalidInputError("Workflow contextLink id cannot be empty")

        if link_id in context_link_ids_seen:
            raise InvalidInputError(f"Duplicate contextLink id: {link_id}")
        context_link_ids_seen.add(link_id)

        if not source_prompt_node_id:
            raise InvalidInputError("Workflow contextLink source cannot be empty")

        if not target_prompt_node_id:
            raise InvalidInputError("Workflow contextLink target cannot be empty")

        if source_prompt_node_id == target_prompt_node_id:
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' cannot inherit/branch from itself"
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

        if target_prompt_node_id in inbound_internal_context_link_by_target:
            existing = inbound_internal_context_link_by_target[target_prompt_node_id]
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' has multiple inbound context links: "
                f"'{existing.source}' and '{source_prompt_node_id}'"
            )

        if _trim(source_config.modelResourceId) != _trim(target_config.modelResourceId):
            raise InvalidInputError(
                f"Prompt node '{target_prompt_node_id}' must use the same modelResourceId "
                f"as its context source '{source_prompt_node_id}'"
            )

        inbound_internal_context_link_by_target[target_prompt_node_id] = link
        selected_internal_context_links.append(link)

    selected_context_workflow = WorkflowEditorData(
        nodes=[node for node in workflow.nodes if _trim(node.id) in selected_node_ids],
        edges=[
            edge
            for edge in workflow.edges
            if _trim(edge.source) in selected_node_ids
            and _trim(edge.target) in selected_node_ids
        ],
        contextLinks=selected_internal_context_links,
    )

    outbound_rule_errors = collect_context_source_outbound_rule_errors(
        selected_context_workflow
    )
    if outbound_rule_errors:
        raise InvalidInputError(outbound_rule_errors[0])

    # 第四遍：selected output 节点仍必须具备 inbound binding
    for node in workflow.nodes:
        node_id = _trim(node.id)
        if node_id not in selected_node_ids:
            continue

        config = node.config
        if isinstance(config, OutputNodeConfig):
            if len(incoming_data_edges_by_selected_target[node_id]) == 0:
                raise InvalidInputError(
                    f"Output node '{node_id}' must have at least one inbound binding"
                )

    # 第五遍：selected execution order 自身仍必须是 DAG
    _assert_acyclic_execution_graph(selected_context_workflow)

    # 第六遍：只对 selected prompt 节点做 dependency 校验
    prompt_nodes = [
        node
        for node in workflow.nodes
        if _trim(node.id) in selected_node_ids
        and isinstance(node.config, PromptNodeConfig)
    ]
    if prompt_nodes:
        incoming_edges_by_target = _build_incoming_data_edges_by_target(workflow)
        active_model_resource_registry = load_model_resource_registry()

        for node in prompt_nodes:
            node_id = _trim(node.id)
            config = node.config

            model_resource_id = _trim(config.modelResourceId)
            if not active_model_resource_registry:
                raise InvalidInputError(
                    f"Prompt node '{node_id}' references model resource "
                    f"'{model_resource_id}', but no model resources are configured"
                )

            if model_resource_id not in active_model_resource_registry:
                raise InvalidInputError(
                    f"Prompt node '{node_id}' references unknown model resource "
                    f"'{model_resource_id}'"
                )

            required_variables = extract_template_variables(config.promptText or "")
            bound_target_inputs = {
                _trim(edge.targetInput)
                for edge in incoming_edges_by_target.get(node_id, [])
            }

            missing_variables = sorted(required_variables - bound_target_inputs)
            if missing_variables:
                raise InvalidInputError(
                    f"Prompt node '{node_id}' is missing inbound bindings for variables: "
                    f"{', '.join(missing_variables)}"
                )

    return normalized_start_node_id, normalized_end_node_ids


def validate_workflow_editor_data(workflow: WorkflowEditorData):
    """
    workflow canonical editor model 最终合法性裁决入口。

    正式顺序：
    - 先做 structure validation
    - 再做 dependency validation

    注意：
    - 这是 save/load/run 主链共用的正式 validator 入口
    """

    validate_workflow_structure(workflow)
    validate_workflow_dependencies(workflow)