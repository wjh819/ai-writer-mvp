from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

"""
execution internal facts contract 层。

本文件角色：
- 定义 engine 与 workflow_run_service 之间交换的内部执行结果结构
- 作为 execution facts 的 owner

负责：
- 定义 ExecutionStep / WorkflowExecutionResult / WorkflowRunError
- 区分 step 级 success/failed facts 与 run 级 failure metadata
- 为上层 projection 提供稳定的内部结果壳

不负责：
- direct run HTTP DTO
- persisted run detail DTO
- 前端展示模型
- route 层响应格式

上下游：
- 上游由 engine 产出 execution facts
- 下游由 workflow_run_service / run_result_mapper 消费并投影

当前限制 / 待收口点：
- primary_state_key 属于内部 projection 锚点，带过渡性质，不应继续外溢到公开 contract
- run_scope 已预留 subgraph，但不代表所有扩展路径已稳定
- run-level finished_at 是 execution result 字段，不代表 direct run API 已对外暴露该字段
"""

ExecutionNodeType = Literal["input", "prompt", "output"]
ExecutionStepStatus = Literal["success", "failed"]
ExecutionFailureStage = Literal["request", "definition", "execution"]
ExecutionRunStatus = Literal["success", "failed"]
ExecutionRunScope = Literal["full", "subgraph"]
ExecutionPromptWindowMode = Literal["new_window", "continue", "branch"]


class BaseExecutionStep(BaseModel):
    """
    内部 execution facts 的通用 step 基类。

    注意：
    - 这是 engine / workflow_run_service 之间的内部结果结构
    - 不是 direct run API step
    - 也不是 persisted SessionRunStep
    - 这里保留的字段应服务于上层 projection，而不是反向约束 engine 的执行逻辑
    """

    node_id: str
    node_type: ExecutionNodeType
    status: ExecutionStepStatus

    # 供上层 projection 使用的最小输出锚点。
    # 它表达“这个节点主输出最终发布到哪个 stateKey”，
    # 但它不是 API contract 命名。
    primary_state_key: Optional[str] = None

    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_ms: Optional[int] = None


class InputSuccessExecutionStep(BaseExecutionStep):
    node_type: Literal["input"] = "input"
    status: Literal["success"] = "success"

    value: Any
    published_state: Dict[str, Any] = Field(default_factory=dict)


class InputFailedExecutionStep(BaseExecutionStep):
    node_type: Literal["input"] = "input"
    status: Literal["failed"] = "failed"

    error_message: str
    error_detail: Optional[str] = None


class PromptSuccessExecutionStep(BaseExecutionStep):
    node_type: Literal["prompt"] = "prompt"
    status: Literal["success"] = "success"

    bound_inputs: Dict[str, Any] = Field(default_factory=dict)
    rendered_prompt: str
    raw_output_text: str
    published_state: Dict[str, Any] = Field(default_factory=dict)

    window_mode: ExecutionPromptWindowMode
    window_source_node_id: Optional[str] = None
    window_id: str
    window_parent_id: Optional[str] = None


class PromptFailedExecutionStep(BaseExecutionStep):
    node_type: Literal["prompt"] = "prompt"
    status: Literal["failed"] = "failed"

    bound_inputs: Dict[str, Any] = Field(default_factory=dict)
    rendered_prompt: Optional[str] = None
    error_message: str
    error_detail: Optional[str] = None

    window_mode: Optional[ExecutionPromptWindowMode] = None
    window_source_node_id: Optional[str] = None
    window_id: Optional[str] = None
    window_parent_id: Optional[str] = None


class OutputSuccessExecutionStep(BaseExecutionStep):
    node_type: Literal["output"] = "output"
    status: Literal["success"] = "success"

    bound_inputs: Dict[str, Any] = Field(default_factory=dict)
    value: Any
    published_state: Dict[str, Any] = Field(default_factory=dict)


class OutputFailedExecutionStep(BaseExecutionStep):
    node_type: Literal["output"] = "output"
    status: Literal["failed"] = "failed"

    bound_inputs: Dict[str, Any] = Field(default_factory=dict)
    error_message: str
    error_detail: Optional[str] = None


ExecutionStep = (
    InputSuccessExecutionStep
    | InputFailedExecutionStep
    | PromptSuccessExecutionStep
    | PromptFailedExecutionStep
    | OutputSuccessExecutionStep
    | OutputFailedExecutionStep
)


class WorkflowExecutionResult(BaseModel):
    """
    单次 run 的统一内部结果壳。

    正式口径：
    - success 时只看 final_state
    - failed 时只看 partial_state
    - error_* / failure_stage 属于 run 级失败摘要
    - steps 保留真实执行顺序下的 execution facts
    """

    status: ExecutionRunStatus
    run_scope: ExecutionRunScope

    input_state: Dict[str, Any] = Field(default_factory=dict)
    final_state: Dict[str, Any] = Field(default_factory=dict)
    partial_state: Optional[Dict[str, Any]] = None

    steps: List[ExecutionStep] = Field(default_factory=list)

    error_type: Optional[str] = None
    error_message: Optional[str] = None
    error_detail: Optional[str] = None
    failure_stage: Optional[ExecutionFailureStage] = None

    finished_at: str


class WorkflowRunError(Exception):
    """
    engine 执行失败时抛出的内部异常。

    注意：
    - partial_state / steps 都是 execution facts
    - 上层应将其收敛为 WorkflowExecutionResult，而不是直接向外透传异常对象
    - 该异常服务于 engine -> service 的失败路径，不表达 HTTP 语义
    """

    def __init__(
        self,
        message: str,
        partial_state: Dict[str, Any],
        steps: List[ExecutionStep],
        *,
        error_type: Optional[str] = None,
        error_detail: Optional[str] = None,
        failure_stage: ExecutionFailureStage = "execution",
    ):
        super().__init__(message)
        self.partial_state = dict(partial_state or {})
        self.state = self.partial_state  # 兼容旧调用方
        self.steps = list(steps or [])
        self.error_message = message
        self.error_detail = error_detail if error_detail is not None else message
        self.error_type = error_type
        self.failure_stage = failure_stage