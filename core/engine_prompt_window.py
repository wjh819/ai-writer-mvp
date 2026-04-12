from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from core.engine_runtime import WorkflowRunRuntime


def _build_window_id(node_id: str) -> str:
    return f"window::{node_id}"


def _resolve_prompt_window_runtime(
    *,
    node_id: str,
    incoming_context_link_by_target: dict[str, Any],
    runtime: WorkflowRunRuntime,
    definition_error_cls: type[Exception],
    allowed_source_node_ids: set[str] | None = None,
) -> dict[str, Any]:
    """
    解析当前 prompt 节点在本次 run 中的窗口运行时上下文。

    正式口径：
    - 无 inbound context link = new_window
    - continue 复用来源窗口 id，并基于当前窗口历史继续
    - branch 创建新的 run-local window_id，但其 base_messages 固定来自
      source 节点提交完成时的快照
    - subgraph 运行时，若 context source 不在执行范围内，则视为 new_window

    不负责：
    - 持久化窗口 identity
    - provider-native branch / thread 管理
    """
    inbound_link = incoming_context_link_by_target.get(node_id)

    if inbound_link is None:
        return {
            "window_mode": "new_window",
            "window_source_node_id": None,
            "window_id": _build_window_id(node_id),
            "window_parent_id": None,
            "base_messages": [],
        }

    source_node_id = inbound_link.source
    if (
        allowed_source_node_ids is not None
        and source_node_id not in allowed_source_node_ids
    ):
        return {
            "window_mode": "new_window",
            "window_source_node_id": None,
            "window_id": _build_window_id(node_id),
            "window_parent_id": None,
            "base_messages": [],
        }

    if source_node_id not in runtime.prompt_window_id_by_node:
        raise definition_error_cls(
            f"Prompt node '{node_id}' context source '{source_node_id}' "
            "has no resolved window in current run"
        )

    source_window_id = runtime.prompt_window_id_by_node[source_node_id]

    if inbound_link.mode == "continue":
        source_history = list(runtime.window_histories.get(source_window_id, []))
        return {
            "window_mode": "continue",
            "window_source_node_id": source_node_id,
            "window_id": source_window_id,
            "window_parent_id": None,
            "base_messages": source_history,
        }

    if inbound_link.mode == "branch":
        if source_node_id not in runtime.prompt_committed_history_by_node:
            raise definition_error_cls(
                f"Prompt node '{node_id}' context source '{source_node_id}' "
                "has no committed snapshot in current run"
            )

        source_snapshot = list(runtime.prompt_committed_history_by_node[source_node_id])

        return {
            "window_mode": "branch",
            "window_source_node_id": source_node_id,
            "window_id": _build_window_id(node_id),
            "window_parent_id": source_window_id,
            "base_messages": source_snapshot,
        }

    raise definition_error_cls(
        f"Prompt node '{node_id}' has invalid context link mode: {inbound_link.mode}"
    )


def _build_prompt_window_metadata_for_failed_step(
    *,
    node_id: str,
    incoming_context_link_by_target: dict[str, Any],
    runtime: WorkflowRunRuntime,
    allowed_source_node_ids: set[str] | None = None,
) -> dict[str, Any]:
    inbound_link = incoming_context_link_by_target.get(node_id)

    if inbound_link is None:
        return {
            "window_mode": "new_window",
            "window_source_node_id": None,
            "window_id": _build_window_id(node_id),
            "window_parent_id": None,
        }

    source_node_id = inbound_link.source
    if (
        allowed_source_node_ids is not None
        and source_node_id not in allowed_source_node_ids
    ):
        return {
            "window_mode": "new_window",
            "window_source_node_id": None,
            "window_id": _build_window_id(node_id),
            "window_parent_id": None,
        }

    source_window_id = runtime.prompt_window_id_by_node.get(source_node_id)

    if inbound_link.mode == "continue":
        return {
            "window_mode": "continue",
            "window_source_node_id": source_node_id,
            "window_id": source_window_id,
            "window_parent_id": None,
        }

    if inbound_link.mode == "branch":
        return {
            "window_mode": "branch",
            "window_source_node_id": source_node_id,
            "window_id": _build_window_id(node_id),
            "window_parent_id": source_window_id,
        }

    return {
        "window_mode": None,
        "window_source_node_id": None,
        "window_id": None,
        "window_parent_id": None,
    }


def _commit_prompt_window(
    *,
    node_id: str,
    window_runtime: dict[str, Any],
    rendered_prompt: str,
    output_text: str,
    runtime: WorkflowRunRuntime,
    definition_error_cls: type[Exception],
) -> None:
    """
    在 prompt 节点成功完成后提交窗口历史。

    正式口径：
    - 只有成功 prompt 才推进窗口历史
    - branch 后续分叉必须基于 source prompt 自己提交完成时的固定快照
    - failed prompt 不提交窗口，不污染后续 branch 基线

    当前限制：
    - window_id 仅在单次 run 内有意义
    """
    updated_history = list(window_runtime["base_messages"] or [])
    updated_history.append(HumanMessage(content=rendered_prompt))
    updated_history.append(AIMessage(content=output_text))

    window_id = window_runtime["window_id"]
    if not window_id:
        raise definition_error_cls(
            f"Prompt node '{node_id}' resolved no window_id at commit time"
        )

    runtime.window_histories[window_id] = updated_history
    runtime.prompt_window_id_by_node[node_id] = window_id

    # 固定保存“该 prompt 节点自己提交完成时”的快照。
    # 后续任何从它 branch 出去的节点，都必须基于这个快照。
    runtime.prompt_committed_history_by_node[node_id] = list(updated_history)
