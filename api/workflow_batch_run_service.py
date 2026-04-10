from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from threading import Thread
from typing import Any
from uuid import uuid4

from app_errors import InvalidInputError
from api.run_batch_store import (
    BatchItemDetailUnavailableError,
    BatchItemNotFoundError,
    BatchRunAlreadyActiveError,
    BatchRunNotCancellableError,
    BatchRunNotFoundError,
    BatchRunStore,
)
from api.run_http_schemas import (
    BatchItemDetailResponse,
    BatchSummaryResponse,
    RunResult,
)
from api.run_live_store import RunLiveStore
from api.run_result_mapper import build_run_result_from_execution
from api.workflow_run_service import (
    build_failed_execution_result,
    execute_draft_workflow,
    utc_now_iso,
)


class BatchRunBlockedByActiveLiveRunError(RuntimeError):
    """
    single live run 与 batch 第一版互斥。
    """


def _normalize_input_values(value: list[Any] | None) -> list[Any]:
    """
    将 batch 请求体里的 input_values 收敛为普通 list。

    正式口径：
    - None -> []
    - 必须是 list
    - 是否允许空列表，由 service 继续正式裁决
    """
    if value is None:
        return []

    if not isinstance(value, list):
        raise InvalidInputError("Input values must be an array")

    return list(value)


def _normalize_max_parallel(value: int | None) -> int:
    """
    将 max_parallel 收敛为 1~4。

    注意：
    - DTO 层已有限制
    - service 层仍保持最小防守式收敛
    """
    if value is None:
        return 4

    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise InvalidInputError("Max parallel must be an integer") from exc

    if parsed < 1 or parsed > 4:
        raise InvalidInputError("Max parallel must be between 1 and 4")

    return parsed


def _resolve_single_input_key(workflow) -> str:
    """
    校验 workflow 必须且只能有一个 input 节点，并返回其 inputKey。
    """
    input_nodes = [
        node
        for node in list(getattr(workflow, "nodes", []) or [])
        if getattr(getattr(node, "config", None), "type", None) == "input"
    ]

    if len(input_nodes) != 1:
        raise InvalidInputError(
            "Batch run requires exactly one input node in the workflow"
        )

    input_key = str(getattr(input_nodes[0].config, "inputKey", "") or "").strip()
    if not input_key:
        raise InvalidInputError(
            "The single input node must declare a non-empty inputKey"
        )

    return input_key


def _build_batch_items(
    *,
    input_key: str,
    input_values: list[Any],
) -> list[dict[str, Any]]:
    """
    将 input_values 转为内部 item 调度壳。

    只负责：
    - 生成稳定 index
    - 生成 item_id
    - 把 raw_value 包进单次 run 的 input_state

    不负责：
    - workflow 合法性裁决
    """
    items: list[dict[str, Any]] = []

    for index, raw_value in enumerate(input_values):
        items.append(
            {
                "item_id": uuid4().hex,
                "index": index,
                "raw_value": raw_value,
                "input_state": {input_key: raw_value},
            }
        )

    return items


def _run_single_batch_item(
    *,
    batch_id: str,
    item: dict[str, Any],
    canvas_id: str,
    workflow,
    batch_store: BatchRunStore,
) -> None:
    """
    执行 batch 中的单个 item。

    正式口径：
    - 每个 item 都是一次独立 single run
    - item 级 detail 继续复用 RunResult
    - single run 的 success / failed 语义完全沿用现有主链
    """
    item_id = str(item["item_id"])
    input_state = dict(item["input_state"] or {})

    batch_store.mark_item_running(
        batch_id=batch_id,
        item_id=item_id,
        started_at=utc_now_iso(),
    )

    try:
        execution = execute_draft_workflow(
            canvas_id=canvas_id,
            workflow=workflow,
            input_state=input_state,
            prompt_overrides={},
            run_scope="full",
        )
    except Exception as exc:
        execution = build_failed_execution_result(
            input_state=input_state,
            partial_state=None,
            steps=[],
            error_message=str(exc),
            error_detail=str(exc),
            error_type="unexpected_error",
            failure_stage="definition",
            finished_at=utc_now_iso(),
            run_scope="full",
        )

    run_result = build_run_result_from_execution(execution)

    batch_store.mark_item_finished(
        batch_id=batch_id,
        item_id=item_id,
        run_result=run_result,
        finished_at=getattr(execution, "finished_at", None) or utc_now_iso(),
    )


def _execute_batch_background(
    *,
    batch_id: str,
    canvas_id: str,
    workflow,
    items: list[dict[str, Any]],
    max_parallel: int,
    batch_store: BatchRunStore,
) -> None:
    """
    后台执行 batch。

    正式口径：
    - continue-on-error
    - queued item 可在 cancel_requested 后转 cancelled
    - running item 不做硬中断，只等待自然终态
    """
    next_index = 0
    in_flight: dict[Future[None], str] = {}

    try:
        with ThreadPoolExecutor(
            max_workers=max_parallel,
            thread_name_prefix="workflow-batch",
        ) as executor:
            while next_index < len(items) or in_flight:
                while len(in_flight) < max_parallel and next_index < len(items):
                    if batch_store.is_cancel_requested(batch_id):
                        for pending_item in items[next_index:]:
                            batch_store.mark_item_cancelled(
                                batch_id=batch_id,
                                item_id=str(pending_item["item_id"]),
                                finished_at=utc_now_iso(),
                            )
                        next_index = len(items)
                        break

                    item = items[next_index]
                    next_index += 1

                    future = executor.submit(
                        _run_single_batch_item,
                        batch_id=batch_id,
                        item=item,
                        canvas_id=canvas_id,
                        workflow=workflow,
                        batch_store=batch_store,
                    )
                    in_flight[future] = str(item["item_id"])

                if not in_flight:
                    continue

                done, _ = wait(
                    tuple(in_flight.keys()),
                    return_when=FIRST_COMPLETED,
                )

                for future in done:
                    try:
                        future.result()
                    finally:
                        in_flight.pop(future, None)

    except Exception:
        # 协调线程自身异常时，尽量把尚未提交的 queued item 标成 cancelled，
        # 避免 batch 永久卡在 running。
        for pending_item in items[next_index:]:
            batch_store.mark_item_cancelled(
                batch_id=batch_id,
                item_id=str(pending_item["item_id"]),
                finished_at=utc_now_iso(),
            )


def start_batch_run(
    *,
    canvas_id: str,
    workflow,
    input_values: list[Any],
    max_parallel: int | None,
    batch_store: BatchRunStore,
    live_store: RunLiveStore,
) -> BatchSummaryResponse:
    """
    batch run 统一启动入口。

    本文件角色：
    - 作为 batch 调度 service owner
    - 连接 batch route、single run service 与 batch store

    负责：
    - batch 启动前最小 request 收敛
    - single live run / batch run 互斥
    - 单 input 节点要求裁决
    - 调度后台 batch 执行线程

    不负责：
    - HTTP route 编排
    - Batch DTO owner
    - 前端页面 stale / ownership 语义
    """
    if live_store.has_active_run():
        raise BatchRunBlockedByActiveLiveRunError(
            "A live run is already active"
        )

    safe_input_values = _normalize_input_values(input_values)
    if not safe_input_values:
        raise InvalidInputError("Input values must not be empty")

    safe_max_parallel = _normalize_max_parallel(max_parallel)
    input_key = _resolve_single_input_key(workflow)
    items = _build_batch_items(
        input_key=input_key,
        input_values=safe_input_values,
    )

    batch_id = uuid4().hex
    summary = batch_store.start_batch(
        batch_id=batch_id,
        items=[(str(item["item_id"]), int(item["index"])) for item in items],
    )

    thread = Thread(
        target=_execute_batch_background,
        kwargs={
            "batch_id": batch_id,
            "canvas_id": canvas_id,
            "workflow": workflow,
            "items": items,
            "max_parallel": safe_max_parallel,
            "batch_store": batch_store,
        },
        daemon=True,
    )
    thread.start()

    return summary


def get_batch_summary(
    *,
    batch_id: str,
    batch_store: BatchRunStore,
) -> BatchSummaryResponse:
    return batch_store.get_summary(batch_id)


def get_batch_item_detail(
    *,
    batch_id: str,
    item_id: str,
    batch_store: BatchRunStore,
) -> BatchItemDetailResponse:
    return batch_store.get_item_detail(
        batch_id=batch_id,
        item_id=item_id,
    )


def cancel_batch_run(
    *,
    batch_id: str,
    batch_store: BatchRunStore,
) -> BatchSummaryResponse:
    return batch_store.request_cancel(batch_id)


__all__ = [
    "BatchItemDetailUnavailableError",
    "BatchItemNotFoundError",
    "BatchRunAlreadyActiveError",
    "BatchRunBlockedByActiveLiveRunError",
    "BatchRunNotCancellableError",
    "BatchRunNotFoundError",
    "cancel_batch_run",
    "get_batch_item_detail",
    "get_batch_summary",
    "start_batch_run",
]