from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from backend_workflow_engine.engine_runtime import WorkflowRunRuntime


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
    瑙ｆ瀽褰撳墠 prompt 鑺傜偣鍦ㄦ湰娆?run 涓殑绐楀彛杩愯鏃朵笂涓嬫枃銆?
    姝ｅ紡鍙ｅ緞锛?    - 鏃?inbound context link = new_window
    - continue 澶嶇敤鏉ユ簮绐楀彛 id锛屽苟鍩轰簬褰撳墠绐楀彛鍘嗗彶缁х画
    - branch 鍒涘缓鏂扮殑 run-local window_id锛屼絾鍏?base_messages 鍥哄畾鏉ヨ嚜
      source 鑺傜偣鎻愪氦瀹屾垚鏃剁殑蹇収
    - subgraph 杩愯鏃讹紝鑻?context source 涓嶅湪鎵ц鑼冨洿鍐咃紝鍒欒涓?new_window

    涓嶈礋璐ｏ細
    - 鎸佷箙鍖栫獥鍙?identity
    - provider-native branch / thread 绠＄悊
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
    鍦?prompt 鑺傜偣鎴愬姛瀹屾垚鍚庢彁浜ょ獥鍙ｅ巻鍙层€?
    姝ｅ紡鍙ｅ緞锛?    - 鍙湁鎴愬姛 prompt 鎵嶆帹杩涚獥鍙ｅ巻鍙?    - branch 鍚庣画鍒嗗弶蹇呴』鍩轰簬 source prompt 鑷繁鎻愪氦瀹屾垚鏃剁殑鍥哄畾蹇収
    - failed prompt 涓嶆彁浜ょ獥鍙ｏ紝涓嶆薄鏌撳悗缁?branch 鍩虹嚎

    褰撳墠闄愬埗锛?    - window_id 浠呭湪鍗曟 run 鍐呮湁鎰忎箟
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

    # Preserve the committed snapshot for this prompt node so branch nodes
    # always fork from the source node's own committed completion.
    runtime.prompt_committed_history_by_node[node_id] = list(updated_history)

