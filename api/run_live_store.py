from __future__ import annotations

from threading import RLock
from typing import Any, Iterable

from api.run_http_schemas import LiveRunSnapshot
from api.run_result_mapper import map_execution_step_to_run_step


class LiveRunAlreadyActiveError(RuntimeError):
    pass


def _copy_state(value: dict[str, Any] | None) -> dict[str, Any]:
    return dict(value or {})


def _map_steps(steps: Iterable[Any] | None) -> list[Any]:
    return [
        map_execution_step_to_run_step(step)
        for step in list(steps or [])
    ]


class RunLiveStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self._active_run_id: str | None = None
        self._snapshot = LiveRunSnapshot(
            run_id=None,
            canvas_id=None,
            status="idle",
            run_scope="full",
            active_node_id=None,
            input_state={},
            current_state={},
            final_state={},
            partial_state=None,
            steps=[],
            error_type=None,
            error_message=None,
            error_detail=None,
            failure_stage=None,
            started_at=None,
            finished_at=None,
        )

    def has_active_run(self) -> bool:
        with self._lock:
            return self._active_run_id is not None and self._snapshot.status == "running"

    def start_run(
        self,
        *,
        run_id: str,
        canvas_id: str,
        input_state: dict[str, Any],
        started_at: str,
    ) -> None:
        with self._lock:
            if self.has_active_run():
                raise LiveRunAlreadyActiveError("A live run is already active")

            safe_input_state = _copy_state(input_state)

            self._active_run_id = run_id
            self._snapshot = LiveRunSnapshot(
                run_id=run_id,
                canvas_id=canvas_id,
                status="running",
                run_scope="full",
                active_node_id=None,
                input_state=safe_input_state,
                current_state=safe_input_state,
                final_state={},
                partial_state=None,
                steps=[],
                error_type=None,
                error_message=None,
                error_detail=None,
                failure_stage=None,
                started_at=started_at,
                finished_at=None,
            )

    def mark_node_started(
        self,
        *,
        run_id: str,
        node_id: str,
        current_state: dict[str, Any],
        steps,
    ) -> None:
        with self._lock:
            if run_id != self._active_run_id:
                return

            self._snapshot = LiveRunSnapshot(
                **{
                    **self._snapshot.model_dump(),
                    "status": "running",
                    "active_node_id": node_id,
                    "current_state": _copy_state(current_state),
                    "steps": _map_steps(steps),
                }
            )

    def mark_node_succeeded(
        self,
        *,
        run_id: str,
        current_state: dict[str, Any],
        steps,
    ) -> None:
        with self._lock:
            if run_id != self._active_run_id:
                return

            self._snapshot = LiveRunSnapshot(
                **{
                    **self._snapshot.model_dump(),
                    "status": "running",
                    "active_node_id": None,
                    "current_state": _copy_state(current_state),
                    "steps": _map_steps(steps),
                }
            )

    def mark_node_failed(
        self,
        *,
        run_id: str,
        node_id: str,
        current_state: dict[str, Any] | None,
        steps,
        error_type: str | None,
        error_message: str | None,
        error_detail: str | None,
        failure_stage: str | None,
    ) -> None:
        with self._lock:
            if run_id != self._active_run_id:
                return

            self._active_run_id = None
            self._snapshot = LiveRunSnapshot(
                **{
                    **self._snapshot.model_dump(),
                    "status": "failed",
                    "active_node_id": node_id,
                    "current_state": _copy_state(current_state),
                    "partial_state": _copy_state(current_state) if current_state is not None else None,
                    "steps": _map_steps(steps),
                    "error_type": error_type,
                    "error_message": error_message,
                    "error_detail": error_detail,
                    "failure_stage": failure_stage,
                }
            )

    def finish_success(
        self,
        *,
        run_id: str,
        final_state: dict[str, Any],
        steps,
        finished_at: str,
    ) -> None:
        with self._lock:
            if self._snapshot.run_id != run_id:
                return

            self._active_run_id = None
            safe_final_state = _copy_state(final_state)

            self._snapshot = LiveRunSnapshot(
                **{
                    **self._snapshot.model_dump(),
                    "status": "success",
                    "active_node_id": None,
                    "current_state": safe_final_state,
                    "final_state": safe_final_state,
                    "partial_state": None,
                    "steps": _map_steps(steps),
                    "finished_at": finished_at,
                }
            )

    def finish_failed(
        self,
        *,
        run_id: str,
        partial_state: dict[str, Any] | None,
        steps,
        error_type: str | None,
        error_message: str | None,
        error_detail: str | None,
        failure_stage: str | None,
        finished_at: str,
    ) -> None:
        with self._lock:
            if self._snapshot.run_id != run_id:
                return

            self._active_run_id = None
            safe_partial_state = (
                _copy_state(partial_state) if partial_state is not None else None
            )

            self._snapshot = LiveRunSnapshot(
                **{
                    **self._snapshot.model_dump(),
                    "status": "failed",
                    "active_node_id": None,
                    "current_state": safe_partial_state or {},
                    "partial_state": safe_partial_state,
                    "steps": _map_steps(steps),
                    "error_type": error_type,
                    "error_message": error_message,
                    "error_detail": error_detail,
                    "failure_stage": failure_stage,
                    "finished_at": finished_at,
                }
            )

    def get_active_snapshot(self) -> LiveRunSnapshot:
        with self._lock:
            return LiveRunSnapshot(**self._snapshot.model_dump())


_RUN_LIVE_STORE = RunLiveStore()


def get_run_live_store() -> RunLiveStore:
    return _RUN_LIVE_STORE