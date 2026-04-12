from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

from core.engine_errors import WorkflowDefinitionError, WorkflowNodeExecutionError
from core.engine_prompt_window import (
    _build_prompt_window_metadata_for_failed_step as _build_prompt_window_metadata_for_failed_step_impl,
)
from core.engine_runtime import WorkflowRunRuntime
from core.engine_step_builders import (
    _build_failed_step as _build_failed_step_impl,
    _finalize_step_timing as _finalize_step_timing_impl,
    _publish_named_outputs as _publish_named_outputs_impl,
)
from core.execution_types import WorkflowRunError


def execute_nodes(
    *,
    execution_order: list[str],
    node_map: dict[str, Any],
    runtime: WorkflowRunRuntime,
    run_node: Callable[..., tuple[Any, dict[str, Any]]],
    notify_node_started: Callable[..., None],
    notify_node_succeeded: Callable[..., None],
    notify_node_failed: Callable[..., None],
    resolve_bound_inputs: Callable[..., dict[str, Any]],
    incoming_context_link_by_target: dict[str, Any],
    utc_now_iso: Callable[[], str],
    allowed_context_source_node_ids: set[str] | None = None,
) -> None:
    for node_id in execution_order:
        node = node_map[node_id]
        started_at = utc_now_iso()
        start_perf = time.perf_counter()

        notify_node_started(
            node_id=node.id,
            current_state=runtime.current_state,
            steps=runtime.steps,
        )

        execute_node_and_collect_step(
            node=node,
            runtime=runtime,
            started_at=started_at,
            start_perf=start_perf,
            utc_now_iso=utc_now_iso,
            run_node=run_node,
            notify_node_succeeded=notify_node_succeeded,
            notify_node_failed=notify_node_failed,
            resolve_bound_inputs=resolve_bound_inputs,
            incoming_context_link_by_target=incoming_context_link_by_target,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )


def execute_node_and_collect_step(
    *,
    node,
    runtime: WorkflowRunRuntime,
    started_at: str,
    start_perf: float,
    utc_now_iso: Callable[[], str],
    run_node: Callable[..., tuple[Any, dict[str, Any]]],
    notify_node_succeeded: Callable[..., None],
    notify_node_failed: Callable[..., None],
    resolve_bound_inputs: Callable[..., dict[str, Any]],
    incoming_context_link_by_target: dict[str, Any],
    allowed_context_source_node_ids: set[str] | None = None,
) -> None:
    try:
        step_info, named_outputs = run_node(
            node=node,
            state=runtime.current_state,
            runtime=runtime,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )

        finished_at = utc_now_iso()
        duration_ms = int((time.perf_counter() - start_perf) * 1000)

        _finalize_step_timing_impl(
            step_info,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )

        _publish_named_outputs_impl(
            node=node,
            named_outputs=named_outputs,
            current_state=runtime.current_state,
            definition_error_cls=WorkflowDefinitionError,
        )
        runtime.steps.append(step_info)
        notify_node_succeeded(
            current_state=runtime.current_state,
            steps=runtime.steps,
        )

    except WorkflowDefinitionError as exc:
        finished_at = utc_now_iso()
        duration_ms = int((time.perf_counter() - start_perf) * 1000)

        failed_step = _build_failed_step_impl(
            node=node,
            state=runtime.current_state,
            error_message=str(exc),
            definition_error_cls=WorkflowDefinitionError,
            resolve_bound_inputs=resolve_bound_inputs,
            build_prompt_window_metadata_for_failed_step=lambda **kwargs: _build_prompt_window_metadata_for_failed_step_impl(
                incoming_context_link_by_target=incoming_context_link_by_target,
                runtime=runtime,
                **kwargs,
            ),
            error_detail=str(exc),
            execution_error=None,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )
        _finalize_step_timing_impl(
            failed_step,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )
        runtime.steps.append(failed_step)
        notify_node_failed(
            node_id=node.id,
            current_state=runtime.current_state,
            steps=runtime.steps,
            error_type="workflow_definition_error",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="definition",
        )

        raise WorkflowRunError(
            str(exc),
            runtime.current_state,
            runtime.steps,
            error_type="workflow_definition_error",
            error_detail=str(exc),
            failure_stage="definition",
        ) from exc

    except WorkflowNodeExecutionError as exc:
        finished_at = utc_now_iso()
        duration_ms = int((time.perf_counter() - start_perf) * 1000)

        failed_step = _build_failed_step_impl(
            node=node,
            state=runtime.current_state,
            error_message=str(exc),
            definition_error_cls=WorkflowDefinitionError,
            resolve_bound_inputs=resolve_bound_inputs,
            build_prompt_window_metadata_for_failed_step=lambda **kwargs: _build_prompt_window_metadata_for_failed_step_impl(
                incoming_context_link_by_target=incoming_context_link_by_target,
                runtime=runtime,
                **kwargs,
            ),
            error_detail=exc.error_detail,
            execution_error=exc,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )
        _finalize_step_timing_impl(
            failed_step,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )
        runtime.steps.append(failed_step)
        notify_node_failed(
            node_id=node.id,
            current_state=runtime.current_state,
            steps=runtime.steps,
            error_type=exc.error_type,
            error_message=str(exc),
            error_detail=exc.error_detail,
            failure_stage="execution",
        )

        raise WorkflowRunError(
            str(exc),
            runtime.current_state,
            runtime.steps,
            error_type=exc.error_type,
            error_detail=exc.error_detail,
            failure_stage="execution",
        ) from exc

    except Exception as exc:
        finished_at = utc_now_iso()
        duration_ms = int((time.perf_counter() - start_perf) * 1000)

        failed_step = _build_failed_step_impl(
            node=node,
            state=runtime.current_state,
            error_message=str(exc),
            definition_error_cls=WorkflowDefinitionError,
            resolve_bound_inputs=resolve_bound_inputs,
            build_prompt_window_metadata_for_failed_step=lambda **kwargs: _build_prompt_window_metadata_for_failed_step_impl(
                incoming_context_link_by_target=incoming_context_link_by_target,
                runtime=runtime,
                **kwargs,
            ),
            error_detail=str(exc),
            execution_error=None,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )
        _finalize_step_timing_impl(
            failed_step,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )
        runtime.steps.append(failed_step)
        notify_node_failed(
            node_id=node.id,
            current_state=runtime.current_state,
            steps=runtime.steps,
            error_type="node_execution_failed",
            error_message=str(exc),
            error_detail=str(exc),
            failure_stage="execution",
        )

        raise WorkflowRunError(
            str(exc),
            runtime.current_state,
            runtime.steps,
            error_type="node_execution_failed",
            error_detail=str(exc),
            failure_stage="execution",
        ) from exc
