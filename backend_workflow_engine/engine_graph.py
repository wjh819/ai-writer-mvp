from __future__ import annotations

from collections import defaultdict, deque
from typing import Any, Callable, Iterable


def _build_graph(
    *,
    nodes,
    edges,
    context_links,
    node_map: dict[str, Any],
    graph: dict[str, list[str]],
    in_degree: dict[str, int],
    incoming_edges_by_target: dict[str, list[Any]],
    incoming_context_link_by_target: dict[str, Any],
    definition_error_cls: type[Exception],
) -> None:
    for node in nodes:
        graph[node.id] = []
        in_degree[node.id] = 0
        incoming_edges_by_target[node.id] = []
        incoming_context_link_by_target[node.id] = None

    # data edges: 鏃㈠弬涓庢墽琛岄『搴忥紝涔熷弬涓庣粨鏋勫寲杈撳叆缁戝畾
    for edge in edges:
        src = edge.source
        dst = edge.target

        if src not in node_map:
            raise definition_error_cls(f"Edge source node not found: {src}")
        if dst not in node_map:
            raise definition_error_cls(f"Edge target node not found: {dst}")

        graph[src].append(dst)
        incoming_edges_by_target[dst].append(edge)
        in_degree[dst] += 1

    # context links: 鍙弬涓庢墽琛岄『搴忥紝涓嶅弬涓庣粨鏋勫寲杈撳叆缁戝畾
    for link in context_links:
        src = link.source
        dst = link.target

        if src not in node_map:
            raise definition_error_cls(
                f"Context link source node not found: {src}"
            )
        if dst not in node_map:
            raise definition_error_cls(
                f"Context link target node not found: {dst}"
            )

        if incoming_context_link_by_target[dst] is not None:
            raise definition_error_cls(
                f"Prompt node '{dst}' has multiple inbound context links"
            )

        graph[src].append(dst)
        in_degree[dst] += 1
        incoming_context_link_by_target[dst] = link


def _build_reverse_graph(graph: dict[str, list[str]]) -> dict[str, list[str]]:
    reverse_graph: dict[str, list[str]] = defaultdict(list)

    for source, targets in graph.items():
        for target in targets:
            reverse_graph[target].append(source)

    return reverse_graph


def _build_downstream_node_set(
    *,
    start_node_id: str,
    graph: dict[str, list[str]],
    node_ids: set[str],
    definition_error_cls: type[Exception],
) -> set[str]:
    if start_node_id not in node_ids:
        raise definition_error_cls(f"Start node not found: {start_node_id}")

    visited: set[str] = set()
    queue = deque([start_node_id])

    while queue:
        current = queue.popleft()
        if current in visited:
            continue

        visited.add(current)
        for next_node_id in graph.get(current, []):
            if next_node_id not in visited:
                queue.append(next_node_id)

    return visited


def _build_subgraph_node_set(
    *,
    start_node_id: str,
    end_node_ids: Iterable[str] | None,
    graph: dict[str, list[str]],
    node_ids: set[str],
    definition_error_cls: type[Exception],
) -> set[str]:
    normalized_start_node_id = str(start_node_id or "").strip()
    if not normalized_start_node_id:
        raise definition_error_cls("Start node id is required")
    if normalized_start_node_id not in node_ids:
        raise definition_error_cls(
            f"Start node not found: {normalized_start_node_id}"
        )

    reachable_from_start = _build_downstream_node_set(
        start_node_id=normalized_start_node_id,
        graph=graph,
        node_ids=node_ids,
        definition_error_cls=definition_error_cls,
    )

    normalized_end_node_ids: list[str] = []
    seen_end_node_ids: set[str] = set()

    for raw_node_id in list(end_node_ids or []):
        node_id = str(raw_node_id or "").strip()
        if not node_id:
            raise definition_error_cls("End node ids must not contain empty values")
        if node_id not in node_ids:
            raise definition_error_cls(f"End node not found: {node_id}")
        if node_id not in seen_end_node_ids:
            normalized_end_node_ids.append(node_id)
            seen_end_node_ids.add(node_id)

    if not normalized_end_node_ids:
        return reachable_from_start

    unreachable_end_node_ids = [
        node_id
        for node_id in normalized_end_node_ids
        if node_id not in reachable_from_start
    ]
    if unreachable_end_node_ids:
        raise definition_error_cls(
            "End nodes are not reachable from start node "
            f"'{normalized_start_node_id}': {sorted(unreachable_end_node_ids)}"
        )

    reverse_graph = _build_reverse_graph(graph)
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
        raise definition_error_cls(
            f"Start node '{normalized_start_node_id}' is not included in selected subgraph"
        )

    return selected_node_ids


def _topological_sort(
    *,
    graph: dict[str, list[str]],
    node_order: list[str],
    selected_node_ids: set[str] | None,
    definition_error_cls: type[Exception],
) -> list[str]:
    """
    鍩轰簬 data edges + contextLinks 鍏卞悓鏋勬垚鐨勬墽琛屽浘锛岀敓鎴愭墽琛岄『搴忋€?
    姝ｅ紡鍙ｅ緞锛?    - data edges 鍙備笌鎵ц椤哄簭
    - contextLinks 涔熷弬涓庢墽琛岄『搴?    - 鑻ュ浘涓瓨鍦ㄧ幆锛屾姏 WorkflowDefinitionError
    - selected_node_ids 涓嶄负绌烘椂锛屼粎瀵硅瀛愬浘鍐呯殑杈归噸鏂拌绠?in_degree
    """
    if selected_node_ids is None:
        selected = set(node_order)
    else:
        selected = set(selected_node_ids)

    local_in_degree: dict[str, int] = {node_id: 0 for node_id in selected}
    local_graph: dict[str, list[str]] = {node_id: [] for node_id in selected}

    for source, targets in graph.items():
        if source not in selected:
            continue
        for target in targets:
            if target not in selected:
                continue
            local_graph[source].append(target)
            local_in_degree[target] += 1

    queue = deque(
        node_id
        for node_id in node_order
        if node_id in selected and local_in_degree[node_id] == 0
    )

    order: list[str] = []

    while queue:
        current_node_id = queue.popleft()
        order.append(current_node_id)

        for neighbor in local_graph.get(current_node_id, []):
            local_in_degree[neighbor] -= 1
            if local_in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(selected):
        raise definition_error_cls("Workflow graph has a cycle")

    return order

