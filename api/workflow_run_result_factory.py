from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend_workflow_engine.execution_types import WorkflowExecutionResult

"""
workflow run-level 结果壳构造层。

本文件角色：
- 统一构造 direct run / subgraph run / batch fallback 复用的 run-level execution result 壳

负责：
- 生成 run-level finished_at
- success execution result 构造
- failed execution result 构造
- failure_stage -> 默认 error_type 收敛

不负责：
- engine 调用
- request-level 输入收敛
- route 编排
- RunResult transport DTO 投影
- live store 状态推进
"""


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _default_error_type_for_failure_stage(failure_stage: str) -> str:
    if failure_stage == "request":
        return "request_invalid"
    if failure_stage == "definition":
        return "workflow_definition_error"
    return "node_execution_failed"


def build_success_execution_result(
    *,
    input_state: dict[str, Any],
    final_state: dict[str, Any],
    steps,
    finished_at: str,
    run_scope: str = "full",
) -> WorkflowExecutionResult:
    """
    构造成功执行结果壳。
    """
    return WorkflowExecutionResult(
        status="success",
        run_scope=run_scope,
        input_state=dict(input_state or {}),
        final_state=dict(final_state or {}),
        partial_state=None,
        steps=list(steps or []),
        error_type=None,
        error_message=None,
        error_detail=None,
        failure_stage=None,
        finished_at=finished_at,
    )


def build_failed_execution_result(
    *,
    input_state: dict[str, Any],
    partial_state: dict[str, Any] | None,
    steps,
    error_message: str,
    failure_stage: str,
    finished_at: str,
    run_scope: str = "full",
    error_detail: str | None = None,
    error_type: str | None = None,
) -> WorkflowExecutionResult:
    """
    构造失败执行结果壳。

    正式口径：
    - failed 时 final_state 固定为空对象
    - partial_state 表示失败前最后一次成功写回后的完整工作态快照
    - error_* / failure_stage 属于 run 级失败摘要
    """
    resolved_error_message = str(error_message or "")
    resolved_error_detail = error_detail or resolved_error_message
    resolved_error_type = error_type or _default_error_type_for_failure_stage(
        failure_stage
    )

    return WorkflowExecutionResult(
        status="failed",
        run_scope=run_scope,
        input_state=dict(input_state or {}),
        final_state={},
        partial_state=dict(partial_state) if partial_state is not None else None,
        steps=list(steps or []),
        error_type=resolved_error_type,
        error_message=resolved_error_message,
        error_detail=resolved_error_detail,
        failure_stage=failure_stage,
        finished_at=finished_at,
    )
