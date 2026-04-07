from __future__ import annotations

from api.run_http_schemas import (
    InputFailedRunStep,
    InputSuccessRunStep,
    OutputFailedRunStep,
    OutputSuccessRunStep,
    PromptFailedRunStep,
    PromptSuccessRunStep,
    RunResult,
)
from core.execution_types import (
    InputFailedExecutionStep,
    InputSuccessExecutionStep,
    OutputFailedExecutionStep,
    OutputSuccessExecutionStep,
    PromptFailedExecutionStep,
    PromptSuccessExecutionStep,
    WorkflowExecutionResult,
)

"""
execution -> direct run / subgraph test HTTP projection 层。

本文件角色：
- 将内部 execution facts 单向映射为 direct run / subgraph test transport DTO

负责：
- ExecutionStep -> RunStep
- WorkflowExecutionResult -> RunResult

不负责：
- 错误分类
- 默认值补齐
- 展示语义推导
- 外部资源访问

上下游：
- 上游来自 workflow_run_service 的 WorkflowExecutionResult
- 下游由 run_outcome / route 返回给前端

当前限制 / 待收口点：
- 当前 direct run / subgraph test contract 不暴露 run-level finished_at；
  如需 run history，本文件与 HTTP schema 需联动扩展
- 当前映射接近一一投影；新增 execution 字段时应先判断是否需要对外暴露，
  而不是默认透传
"""


def map_execution_step_to_run_step(step):
    """
    将单个 execution step 映射为 direct run / subgraph test transport step。

    正式口径：
    - 这里只做字段投影与命名对齐
    - node_id -> node
    - bound_inputs -> inputs
    - raw_output_text -> output 等都属于 transport 层重命名

    不负责：
    - 重新解释业务语义
    - 推断 run 级失败信息
    """
    if isinstance(step, InputSuccessExecutionStep):
        return InputSuccessRunStep(
            type="input",
            status="success",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            output=step.value,
            published_state=dict(step.published_state or {}),
        )

    if isinstance(step, InputFailedExecutionStep):
        return InputFailedRunStep(
            type="input",
            status="failed",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            error_message=step.error_message,
            error_detail=step.error_detail,
        )

    if isinstance(step, PromptSuccessExecutionStep):
        return PromptSuccessRunStep(
            type="prompt",
            status="success",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            prompt_mode=step.prompt_mode,
            prompt_ref=step.prompt_ref,
            inputs=dict(step.bound_inputs or {}),
            rendered_prompt=step.rendered_prompt,
            output=step.raw_output_text,
            published_state=dict(step.published_state or {}),
            window_mode=step.window_mode,
            window_source_node_id=step.window_source_node_id,
            window_id=step.window_id,
            window_parent_id=step.window_parent_id,
        )

    if isinstance(step, PromptFailedExecutionStep):
        return PromptFailedRunStep(
            type="prompt",
            status="failed",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            prompt_mode=step.prompt_mode,
            prompt_ref=step.prompt_ref,
            inputs=dict(step.bound_inputs or {}),
            rendered_prompt=step.rendered_prompt,
            error_message=step.error_message,
            error_detail=step.error_detail,
            window_mode=step.window_mode,
            window_source_node_id=step.window_source_node_id,
            window_id=step.window_id,
            window_parent_id=step.window_parent_id,
        )

    if isinstance(step, OutputSuccessExecutionStep):
        return OutputSuccessRunStep(
            type="output",
            status="success",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            inputs=dict(step.bound_inputs or {}),
            output=step.value,
            published_state=dict(step.published_state or {}),
        )

    if isinstance(step, OutputFailedExecutionStep):
        return OutputFailedRunStep(
            type="output",
            status="failed",
            node=step.node_id,
            started_at=step.started_at,
            finished_at=step.finished_at,
            duration_ms=step.duration_ms,
            inputs=dict(step.bound_inputs or {}),
            error_message=step.error_message,
            error_detail=step.error_detail,
        )

    raise TypeError(f"Unsupported execution step type: {type(step).__name__}")


def build_run_result_from_execution(execution: WorkflowExecutionResult) -> RunResult:
    """
    将统一 execution result 映射为 direct run / subgraph test HTTP result。

    正式口径：
    - success 时前端应消费 final_state
    - failed 时前端应消费 partial_state
    - run-level error_* / failure_stage 直接来自 execution result
    - full run 与 subgraph test 继续复用同一个 RunResult，仅以 run_scope 区分

    当前限制：
    - run-level finished_at 当前不在 RunResult 对外暴露
    """
    return RunResult(
        status=execution.status,
        run_scope=execution.run_scope,
        input_state=dict(execution.input_state or {}),
        final_state=dict(execution.final_state or {}),
        partial_state=(
            dict(execution.partial_state)
            if execution.partial_state is not None
            else None
        ),
        steps=[
            map_execution_step_to_run_step(step)
            for step in list(execution.steps or [])
        ],
        error_type=execution.error_type,
        error_message=execution.error_message,
        error_detail=execution.error_detail,
        failure_stage=execution.failure_stage,
    )