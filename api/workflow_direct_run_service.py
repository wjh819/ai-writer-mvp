from __future__ import annotations

from typing import Any

from app_errors import AppError, InvalidInputError
from api.workflow_run_inputs import (
    _normalize_node_id,
    _normalize_node_id_list,
    _normalize_prompt_overrides,
    _normalize_state_object,
)
from api.workflow_run_result_factory import (
    build_failed_execution_result,
    build_success_execution_result,
    utc_now_iso,
)
from api.workflow_paths import (
    ensure_workflow_exists,
    get_canvas_outputs_dir,
    get_canvas_workflow_path,
)
from core.engine import WorkflowDefinitionError, WorkflowEngine
from core.execution_types import WorkflowExecutionResult, WorkflowRunError
from core.output_exporter import WorkflowOutputExporter

"""
workflow 同步执行入口服务层。

本文件角色：
- 承接 direct run / subgraph run 的同步执行入口

负责：
- full run 执行入口
- subgraph run 执行入口
- 调用输入收敛层与 run-level 结果壳构造层

不负责：
- live run orchestration
- 线程 / 回调 / store 状态推进
- HTTP DTO 投影
"""


def execute_draft_workflow(
    *,
    canvas_id: str,
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
    output_exporter: WorkflowOutputExporter | None = None

    try:
        safe_input_state = _normalize_state_object(
            input_state,
            label="Input state",
        )
        safe_prompt_overrides = _normalize_prompt_overrides(prompt_overrides)

        ensure_workflow_exists(get_canvas_workflow_path(canvas_id))
        output_exporter = WorkflowOutputExporter(
            get_canvas_outputs_dir(canvas_id)
        )

        engine = WorkflowEngine(
            workflow_data=workflow,
            prompt_overrides=safe_prompt_overrides,
            output_exporter=output_exporter,
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
