from __future__ import annotations

from typing import Any
from threading import Thread
from uuid import uuid4

from app_errors import AppError, InvalidInputError
from api.run_http_schemas import LiveRunStartResponse
from api.run_live_store import RunLiveStore
from api.workflow_paths import (
    ensure_workflow_exists,
    get_canvas_outputs_dir,
    get_canvas_workflow_path,
)
from api.workflow_run_inputs import (
    _normalize_prompt_overrides,
    _normalize_state_object,
)
from api.workflow_run_result_factory import utc_now_iso
from core.engine import WorkflowDefinitionError, WorkflowEngine
from core.execution_types import WorkflowRunError
from core.output_exporter import WorkflowOutputExporter

"""
workflow live run orchestration 服务层。

本文件角色：
- 承接 live run 的启动、后台执行与进度回调桥接

负责：
- live run progress callback
- live run 后台线程执行
- live run start 入口

不负责：
- direct/subgraph 同步执行入口
- RunResult transport DTO 投影
- request-level 输入收敛规则定义
- run-level 结果壳构造规则定义
"""


class _LiveRunProgressCallback:
    def __init__(
        self,
        *,
        run_id: str,
        live_store: RunLiveStore,
    ) -> None:
        self.run_id = run_id
        self.live_store = live_store

    def on_node_started(
        self,
        *,
        node_id: str,
        current_state: dict[str, Any],
        steps,
    ) -> None:
        self.live_store.mark_node_started(
            run_id=self.run_id,
            node_id=node_id,
            current_state=current_state,
            steps=steps,
        )

    def on_node_succeeded(
        self,
        *,
        current_state: dict[str, Any],
        steps,
    ) -> None:
        self.live_store.mark_node_succeeded(
            run_id=self.run_id,
            current_state=current_state,
            steps=steps,
        )

    def on_node_failed(
        self,
        *,
        node_id: str,
        current_state: dict[str, Any] | None,
        steps,
        error_type: str | None,
        error_message: str | None,
        error_detail: str | None,
        failure_stage: str | None,
    ) -> None:
        self.live_store.mark_node_failed(
            run_id=self.run_id,
            node_id=node_id,
            current_state=current_state,
            steps=steps,
            error_type=error_type,
            error_message=error_message,
            error_detail=error_detail,
            failure_stage=failure_stage,
        )


def _execute_live_draft_workflow_background(
    *,
    run_id: str,
    canvas_id: str,
    workflow,
    input_state: dict[str, Any],
    prompt_overrides: dict[str, str],
    live_store: RunLiveStore,
) -> None:
    try:
        output_exporter = WorkflowOutputExporter(
            get_canvas_outputs_dir(canvas_id)
        )

        engine = WorkflowEngine(
            workflow_data=workflow,
            prompt_overrides=prompt_overrides,
            output_exporter=output_exporter,
            progress_callback=_LiveRunProgressCallback(
                run_id=run_id,
                live_store=live_store,
            ),
        )

        final_state, steps = engine.run(input_state)

        live_store.finish_success(
            run_id=run_id,
            final_state=final_state,
            steps=steps,
            finished_at=utc_now_iso(),
        )

    except InvalidInputError as exc:
        live_store.finish_failed(
            run_id=run_id,
            partial_state=None,
            steps=[],
            error_type="request_invalid",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="request",
            finished_at=utc_now_iso(),
        )

    except WorkflowRunError as exc:
        partial_state = getattr(exc, "partial_state", None)
        if partial_state is None:
            partial_state = getattr(exc, "state", None)

        live_store.finish_failed(
            run_id=run_id,
            partial_state=partial_state,
            steps=getattr(exc, "steps", []) or [],
            error_type=getattr(exc, "error_type", None),
            error_message=str(exc),
            error_detail=getattr(exc, "error_detail", str(exc)),
            failure_stage=getattr(exc, "failure_stage", "execution"),
            finished_at=utc_now_iso(),
        )

    except WorkflowDefinitionError as exc:
        live_store.finish_failed(
            run_id=run_id,
            partial_state=None,
            steps=[],
            error_type="workflow_definition_error",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="definition",
            finished_at=utc_now_iso(),
        )

    except AppError as exc:
        live_store.finish_failed(
            run_id=run_id,
            partial_state=None,
            steps=[],
            error_type="workflow_definition_error",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="definition",
            finished_at=utc_now_iso(),
        )

    except Exception as exc:
        live_store.finish_failed(
            run_id=run_id,
            partial_state=None,
            steps=[],
            error_type="unexpected_error",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="definition",
            finished_at=utc_now_iso(),
        )


def start_live_draft_workflow(
    *,
    canvas_id: str,
    workflow,
    input_state: dict[str, Any],
    prompt_overrides: dict[str, str] | None = None,
    live_store: RunLiveStore,
) -> LiveRunStartResponse:
    safe_input_state = _normalize_state_object(
        input_state,
        label="Input state",
    )
    safe_prompt_overrides = _normalize_prompt_overrides(prompt_overrides)

    ensure_workflow_exists(get_canvas_workflow_path(canvas_id))

    run_id = uuid4().hex
    live_store.start_run(
        run_id=run_id,
        canvas_id=canvas_id,
        input_state=safe_input_state,
        started_at=utc_now_iso(),
    )

    thread = Thread(
        target=_execute_live_draft_workflow_background,
        kwargs={
            "run_id": run_id,
            "canvas_id": canvas_id,
            "workflow": workflow,
            "input_state": dict(safe_input_state),
            "prompt_overrides": dict(safe_prompt_overrides),
            "live_store": live_store,
        },
        daemon=True,
    )
    thread.start()

    return LiveRunStartResponse(
        run_id=run_id,
        status="running",
    )
