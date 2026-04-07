from __future__ import annotations

from typing import Any

from app_errors import InvalidInputError


def trim_text(value) -> str:
    """
    轻量文本辅助。
    """

    if value is None:
        return ""
    return str(value).strip()


def split_save_workflow_payload(
    payload: Any,
) -> tuple[Any, Any | None, bool]:
    """
    拆分 workflow save 请求体。
    """

    if not isinstance(payload, dict):
        return payload, None, False

    if "workflow" not in payload:
        return payload, None, False

    allowed_keys = {"workflow", "sidecar"}
    extra_keys = sorted(set(payload.keys()) - allowed_keys)
    if extra_keys:
        raise InvalidInputError(
            f"Workflow save payload contains unsupported fields: {extra_keys}"
        )

    return payload.get("workflow"), payload.get("sidecar"), "sidecar" in payload
