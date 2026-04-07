from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app_errors import AppError, InvalidInputError
from core.engine import WorkflowDefinitionError, WorkflowEngine
from core.execution_types import WorkflowExecutionResult, WorkflowRunError

"""
workflow 执行服务层。

本文件角色：
- direct run / run-draft 的统一 execution result 壳层
- direct subgraph test 的统一 execution result 壳层
- 连接 engine 与 API projection

负责：
- 调用 engine 执行 workflow
- 将成功/失败路径统一包装为 WorkflowExecutionResult
- 统一 run-level status / error_* / failure_stage / finished_at

不负责：
- HTTP DTO 序列化
- route 层响应拼装
- persisted run 写入
- 前端展示语义
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


def execute_draft_workflow(
    *,
    workflow,
    input_state: dict[str, Any],
    prompt_overrides: dict[str, str] | None = None,
    run_scope: str = "full",
) -> WorkflowExecutionResult:
    """
    direct run / run-draft 的统一执行入口。
    """
    safe_input_state: dict[str, Any] = {}
    safe_prompt_overrides: dict[str, str] = {}

    try:
        safe_input_state = _normalize_state_object(
            input_state,
            label="Input state",
        )
        safe_prompt_overrides = _normalize_prompt_overrides(prompt_overrides)

        engine = WorkflowEngine(
            workflow_data=workflow,
            prompt_overrides=safe_prompt_overrides,
        )

        final_state, steps = engine.run(safe_input_state)
        finished_at = utc_now_iso()

        return build_success_execution_result(
            input_state=safe_input_state,
            final_state=final_state,
            steps=steps,
            finished_at=finished_at,
            run_scope=run_scope,
        )

    except InvalidInputError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_input_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="request_invalid",
            failure_stage="request",
            finished_at=finished_at,
            run_scope=run_scope,
        )

    except WorkflowRunError as exc:
        finished_at = utc_now_iso()

        partial_state = getattr(exc, "partial_state", None)
        if partial_state is None:
            partial_state = getattr(exc, "state", None)

        return build_failed_execution_result(
            input_state=safe_input_state,
            partial_state=partial_state,
            steps=getattr(exc, "steps", []) or [],
            error_message=str(exc),
            error_detail=getattr(exc, "error_detail", str(exc)),
            error_type=getattr(exc, "error_type", None),
            failure_stage=getattr(exc, "failure_stage", "execution"),
            finished_at=finished_at,
            run_scope=run_scope,
        )

    except WorkflowDefinitionError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_input_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="workflow_definition_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope=run_scope,
        )

    except AppError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_input_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="workflow_definition_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope=run_scope,
        )

    except Exception as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_input_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="unexpected_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope=run_scope,
        )


def execute_partial_workflow(
    *,
    workflow,
    start_node_id: str,
    end_node_ids: list[str] | None,
    test_state: dict[str, Any],
    prompt_overrides: dict[str, str] | None = None,
) -> WorkflowExecutionResult:
    """
    subgraph test 的统一执行入口。

    输入：
    - workflow: 已进入 service 层的 canonical workflow
    - start_node_id: 子图执行起点
    - end_node_ids: 可选的子图终点列表
    - test_state: 本次 subgraph test 的初始 sandbox state
    - prompt_overrides: 本次测试的 prompt 临时覆盖

    正式口径：
    - 返回仍复用 WorkflowExecutionResult
    - HTTP 层继续复用 RunResult，只通过 run_scope=subgraph 区分
    """
    safe_test_state: dict[str, Any] = {}
    safe_prompt_overrides: dict[str, str] = {}
    safe_start_node_id = ""
    safe_end_node_ids: list[str] = []

    try:
        safe_test_state = _normalize_state_object(
            test_state,
            label="Test state",
        )
        safe_prompt_overrides = _normalize_prompt_overrides(prompt_overrides)
        safe_start_node_id = _normalize_node_id(
            start_node_id,
            label="Start node id",
        )
        safe_end_node_ids = _normalize_node_id_list(
            end_node_ids,
            label="End node ids",
        )

        engine = WorkflowEngine(
            workflow_data=workflow,
            prompt_overrides=safe_prompt_overrides,
        )

        final_state, steps = engine.run_subgraph(
            start_node_id=safe_start_node_id,
            end_node_ids=safe_end_node_ids,
            state=safe_test_state,
        )
        finished_at = utc_now_iso()

        return build_success_execution_result(
            input_state=safe_test_state,
            final_state=final_state,
            steps=steps,
            finished_at=finished_at,
            run_scope="subgraph",
        )

    except InvalidInputError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_test_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="request_invalid",
            failure_stage="request",
            finished_at=finished_at,
            run_scope="subgraph",
        )

    except WorkflowRunError as exc:
        finished_at = utc_now_iso()

        partial_state = getattr(exc, "partial_state", None)
        if partial_state is None:
            partial_state = getattr(exc, "state", None)

        return build_failed_execution_result(
            input_state=safe_test_state,
            partial_state=partial_state,
            steps=getattr(exc, "steps", []) or [],
            error_message=str(exc),
            error_detail=getattr(exc, "error_detail", str(exc)),
            error_type=getattr(exc, "error_type", None),
            failure_stage=getattr(exc, "failure_stage", "execution"),
            finished_at=finished_at,
            run_scope="subgraph",
        )

    except WorkflowDefinitionError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_test_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="workflow_definition_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope="subgraph",
        )

    except AppError as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_test_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="workflow_definition_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope="subgraph",
        )

    except Exception as exc:
        finished_at = utc_now_iso()

        return build_failed_execution_result(
            input_state=safe_test_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="unexpected_error",
            failure_stage="definition",
            finished_at=finished_at,
            run_scope="subgraph",
        )