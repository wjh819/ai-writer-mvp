from __future__ import annotations

from threading import RLock
from typing import Iterable

from contracts.run_contracts import (
    BatchItemDetailResponse,
    BatchItemSummary,
    BatchSummaryResponse,
    RunResult,
)


class BatchRunAlreadyActiveError(RuntimeError):
    """
    当前已有 active batch 时，拒绝再启动新的 batch。
    """


class BatchRunNotFoundError(RuntimeError):
    """
    请求的 batch_id 不存在。
    """


class BatchRunNotCancellableError(RuntimeError):
    """
    batch 已不在 running 状态，无法再发起取消。
    """


class BatchItemNotFoundError(RuntimeError):
    """
    请求的 item_id 不存在于指定 batch 中。
    """


class BatchItemDetailUnavailableError(RuntimeError):
    """
    item 存在，但当前没有可返回的完整 RunResult。
    例如 queued / cancelled item 尚未产出 detail。
    """


def _copy_summary(summary: BatchSummaryResponse) -> BatchSummaryResponse:
    return BatchSummaryResponse(**summary.model_dump())


def _copy_item_detail(
    detail: BatchItemDetailResponse,
) -> BatchItemDetailResponse:
    return BatchItemDetailResponse(**detail.model_dump())


class BatchRunStore:
    """
    batch 运行态 store。

    本文件角色：
    - 作为 batch summary / item summaries / item detail 的后端运行态 owner
    - 维护当前 active batch 的最小全局互斥
    - 为 route / batch service 提供线程安全的读写接口

    负责：
    - batch_id -> BatchSummaryResponse
    - batch_id + item_id -> BatchItemDetailResponse
    - cancel_requested 局部运行态
    - batch 终态收口

    不负责：
    - workflow 合法性裁决
    - engine 执行
    - HTTP route 编排
    - 前端页面 stale / ownership 语义
    """

    def __init__(self) -> None:
        self._lock = RLock()

        self._active_batch_id: str | None = None
        self._batch_summaries: dict[str, BatchSummaryResponse] = {}
        self._batch_item_details: dict[str, dict[str, BatchItemDetailResponse]] = {}
        self._batch_cancel_requested: dict[str, bool] = {}

    def has_active_batch(self) -> bool:
        with self._lock:
            if not self._active_batch_id:
                return False

            summary = self._batch_summaries.get(self._active_batch_id)
            return summary is not None and summary.status == "running"

    def start_batch(
        self,
        *,
        batch_id: str,
        items: Iterable[tuple[str, int]],
    ) -> BatchSummaryResponse:
        """
        注册一个新的 running batch，并预置所有 queued item 摘要。
        """
        with self._lock:
            if self.has_active_batch():
                raise BatchRunAlreadyActiveError(
                    "A batch run is already active"
                )

            item_summaries = [
                BatchItemSummary(
                    item_id=item_id,
                    index=index,
                    status="queued",
                    started_at=None,
                    finished_at=None,
                    error_type=None,
                    error_message=None,
                )
                for item_id, index in list(items)
            ]

            summary = BatchSummaryResponse(
                batch_id=batch_id,
                status="running",
                total=len(item_summaries),
                queued=len(item_summaries),
                running=0,
                succeeded=0,
                failed=0,
                cancelled=0,
                items=item_summaries,
            )

            self._active_batch_id = batch_id
            self._batch_summaries[batch_id] = summary
            self._batch_item_details[batch_id] = {}
            self._batch_cancel_requested[batch_id] = False

            return _copy_summary(summary)

    def get_summary(self, batch_id: str) -> BatchSummaryResponse:
        with self._lock:
            summary = self._get_summary_locked(batch_id)
            return _copy_summary(summary)

    def is_cancel_requested(self, batch_id: str) -> bool:
        with self._lock:
            self._assert_batch_exists_locked(batch_id)
            return bool(self._batch_cancel_requested.get(batch_id, False))

    def request_cancel(self, batch_id: str) -> BatchSummaryResponse:
        """
        标记该 batch 已收到取消请求。

        注意：
        - 这里只记录 cancel_requested
        - queued item 何时转为 cancelled，由 batch service 调度线程负责
        - running item 不做硬中断，只等待自然终态
        """
        with self._lock:
            summary = self._get_summary_locked(batch_id)
            if summary.status != "running":
                raise BatchRunNotCancellableError(
                    f"Batch '{batch_id}' is not running"
                )

            self._batch_cancel_requested[batch_id] = True
            self._rebuild_summary_locked(batch_id)
            return _copy_summary(self._batch_summaries[batch_id])

    def mark_item_running(
        self,
        *,
        batch_id: str,
        item_id: str,
        started_at: str,
    ) -> None:
        with self._lock:
            item = self._get_item_summary_locked(batch_id, item_id)
            if item.status != "queued":
                return

            self._replace_item_summary_locked(
                batch_id=batch_id,
                next_item=BatchItemSummary(
                    item_id=item.item_id,
                    index=item.index,
                    status="running",
                    started_at=started_at,
                    finished_at=None,
                    error_type=None,
                    error_message=None,
                ),
            )
            self._rebuild_summary_locked(batch_id)

    def mark_item_finished(
        self,
        *,
        batch_id: str,
        item_id: str,
        run_result: RunResult,
        finished_at: str | None = None,
    ) -> None:
        with self._lock:
            item = self._get_item_summary_locked(batch_id, item_id)

            resolved_status = (
                "succeeded"
                if run_result.status == "success"
                else "failed"
            )

            next_item = BatchItemSummary(
                item_id=item.item_id,
                index=item.index,
                status=resolved_status,
                started_at=item.started_at,
                finished_at=finished_at,
                error_type=run_result.error_type,
                error_message=run_result.error_message,
            )

            self._replace_item_summary_locked(
                batch_id=batch_id,
                next_item=next_item,
            )

            self._batch_item_details.setdefault(batch_id, {})[item_id] = (
                BatchItemDetailResponse(
                    item_id=item_id,
                    index=item.index,
                    run_result=RunResult(**run_result.model_dump()),
                )
            )

            self._rebuild_summary_locked(batch_id)

    def mark_item_cancelled(
        self,
        *,
        batch_id: str,
        item_id: str,
        finished_at: str | None = None,
    ) -> None:
        with self._lock:
            item = self._get_item_summary_locked(batch_id, item_id)
            if item.status != "queued":
                return

            self._replace_item_summary_locked(
                batch_id=batch_id,
                next_item=BatchItemSummary(
                    item_id=item.item_id,
                    index=item.index,
                    status="cancelled",
                    started_at=None,
                    finished_at=finished_at,
                    error_type=None,
                    error_message=None,
                ),
            )
            self._rebuild_summary_locked(batch_id)

    def get_item_detail(
        self,
        *,
        batch_id: str,
        item_id: str,
    ) -> BatchItemDetailResponse:
        with self._lock:
            self._get_item_summary_locked(batch_id, item_id)

            detail = self._batch_item_details.get(batch_id, {}).get(item_id)
            if detail is None:
                raise BatchItemDetailUnavailableError(
                    f"Item detail is unavailable for item '{item_id}'"
                )

            return _copy_item_detail(detail)

    def _assert_batch_exists_locked(self, batch_id: str) -> None:
        if batch_id not in self._batch_summaries:
            raise BatchRunNotFoundError(
                f"Batch '{batch_id}' was not found"
            )

    def _get_summary_locked(self, batch_id: str) -> BatchSummaryResponse:
        self._assert_batch_exists_locked(batch_id)
        return self._batch_summaries[batch_id]

    def _get_item_summary_locked(
        self,
        batch_id: str,
        item_id: str,
    ) -> BatchItemSummary:
        summary = self._get_summary_locked(batch_id)
        for item in summary.items:
            if item.item_id == item_id:
                return item

        raise BatchItemNotFoundError(
            f"Item '{item_id}' was not found in batch '{batch_id}'"
        )

    def _replace_item_summary_locked(
        self,
        *,
        batch_id: str,
        next_item: BatchItemSummary,
    ) -> None:
        summary = self._get_summary_locked(batch_id)

        next_items: list[BatchItemSummary] = []
        replaced = False

        for item in summary.items:
            if item.item_id == next_item.item_id:
                next_items.append(next_item)
                replaced = True
            else:
                next_items.append(item)

        if not replaced:
            raise BatchItemNotFoundError(
                f"Item '{next_item.item_id}' was not found in batch '{batch_id}'"
            )

        self._batch_summaries[batch_id] = BatchSummaryResponse(
            batch_id=summary.batch_id,
            status=summary.status,
            cancel_requested=summary.cancel_requested,
            total=summary.total,
            queued=summary.queued,
            running=summary.running,
            succeeded=summary.succeeded,
            failed=summary.failed,
            cancelled=summary.cancelled,
            items=next_items,
        )

    def _rebuild_summary_locked(self, batch_id: str) -> None:
        summary = self._get_summary_locked(batch_id)
        ordered_items = sorted(summary.items, key=lambda item: item.index)

        queued = 0
        running = 0
        succeeded = 0
        failed = 0
        cancelled = 0

        for item in ordered_items:
            if item.status == "queued":
                queued += 1
            elif item.status == "running":
                running += 1
            elif item.status == "succeeded":
                succeeded += 1
            elif item.status == "failed":
                failed += 1
            elif item.status == "cancelled":
                cancelled += 1

        cancel_requested = bool(self._batch_cancel_requested.get(batch_id, False))

        if queued > 0 or running > 0:
            next_status = "running"
        else:
            next_status = "cancelled" if cancel_requested else "finished"

            if self._active_batch_id == batch_id:
                self._active_batch_id = None

        self._batch_summaries[batch_id] = BatchSummaryResponse(
            batch_id=batch_id,
            status=next_status,
            cancel_requested=cancel_requested,
            total=len(ordered_items),
            queued=queued,
            running=running,
            succeeded=succeeded,
            failed=failed,
            cancelled=cancelled,
            items=ordered_items,
        )


_BATCH_RUN_STORE = BatchRunStore()


def get_batch_run_store() -> BatchRunStore:
    return _BATCH_RUN_STORE
