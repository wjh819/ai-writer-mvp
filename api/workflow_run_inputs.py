from __future__ import annotations

from typing import Any

from app_errors import InvalidInputError

"""
workflow run request-level 输入收敛层。

本文件角色：
- 收敛 direct run / subgraph run / live run 入口的 request-level 输入

负责：
- state object 最小收敛
- prompt overrides 最小收敛
- node id / node id list 最小收敛

不负责：
- workflow canonical 校验
- 节点存在性校验
- 子图可达性判断
- run-level 结果壳构造
"""


def _normalize_state_object(
    value: dict[str, Any] | None,
    *,
    label: str,
) -> dict[str, Any]:
    """
    将 service 入口收到的状态对象收敛为普通 dict。

    只负责：
    - None -> {}
    - 必须是 dict

    不负责：
    - workflow 级字段合法性
    - 子图可达性判断
    """
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise InvalidInputError(f"{label} must be an object")

    return dict(value)


def _normalize_prompt_overrides(
    value: dict[str, str] | None,
) -> dict[str, str]:
    """
    将 run-time prompt overrides 收敛为普通字符串 map。

    只负责：
    - None -> {}
    - key 非空
    - value 必须是 string

    不负责：
    - node id 是否真实存在
    - prompt 文本业务语义
    """
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise InvalidInputError("Prompt overrides must be an object")

    normalized: dict[str, str] = {}

    for raw_key, raw_value in value.items():
        node_id = str(raw_key or "").strip()
        if not node_id:
            raise InvalidInputError(
                "Prompt overrides must not contain empty node ids"
            )

        if raw_value is None:
            normalized[node_id] = ""
            continue

        if not isinstance(raw_value, str):
            raise InvalidInputError(
                f"Prompt override for node '{node_id}' must be a string"
            )

        normalized[node_id] = raw_value

    return normalized


def _normalize_node_id(
    value: str,
    *,
    label: str,
) -> str:
    """
    将 service 入口收到的节点 id 做最小收敛。

    只负责：
    - trim
    - 拒绝空值

    不负责：
    - 节点是否真实存在于 workflow
    - 子图可达性判断
    """
    node_id = str(value or "").strip()
    if not node_id:
        raise InvalidInputError(f"{label} is required")
    return node_id


def _normalize_node_id_list(
    values: list[str] | None,
    *,
    label: str,
) -> list[str]:
    """
    将 service 入口收到的节点 id 列表做最小收敛。

    只负责：
    - trim
    - 去重并保持原顺序
    - 拒绝空值

    不负责：
    - 节点是否真实存在于 workflow
    - 子图可达性判断
    """
    normalized: list[str] = []
    seen: set[str] = set()

    for raw_value in list(values or []):
        node_id = str(raw_value or "").strip()
        if not node_id:
            raise InvalidInputError(f"{label} must not contain empty values")

        if node_id not in seen:
            normalized.append(node_id)
            seen.add(node_id)

    return normalized
