from __future__ import annotations

from collections import defaultdict, deque

from app_errors import InvalidInputError
from contracts.workflow_contracts import WorkflowEditorData

"""
workflow execution graph / outbound rule 校验子模块。

本文件角色：
- 承接 execution graph 与 context source outbound rule 相关校验实现

负责：
- 构建 validator 侧 execution relation graph
- 断言 execution relation graph 无环
- 收集 context source outbound rule 错误

不负责：
- dependency validation
- subgraph selection / subgraph validation
- 顶层 validator 入口
"""


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
        source_prompt_node_id = (link.source or "").strip()
        mode = (link.mode or "").strip()

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
