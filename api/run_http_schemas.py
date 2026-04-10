from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from contracts.step_projections import (
    InputFailedStepProjection,
    InputSuccessStepProjection,
    OutputFailedStepProjection,
    OutputSuccessStepProjection,
    PromptFailedStepProjection,
    PromptSuccessStepProjection,
    StepProjection,
)


"""
direct run / subgraph test / batch run HTTP transport DTO 层。

本文件角色：
- 定义 direct run / run-draft、subgraph test、batch run 的请求体与响应体
- 作为 API 层 transport contract owner

负责：
- RunDraftRequest
- SubgraphTestRequest
- RunResult / RunStep
- BatchRunRequest
- BatchSummaryResponse
- BatchItemSummary
- BatchItemDetailResponse

不负责：
- engine 内部 execution facts
- workflow canonical contract
- persisted run detail contract

上下游：
- 上游由 route / mapper / store 填充
- 下游由前端 api.ts / runTypes.ts 消费

当前限制 / 待收口点：
- 当前 direct run / subgraph test contract 仍不包含 run-level finished_at
- step fields 复用 contracts.step_projections，但是否对外暴露仍由本文件决定
"""


class RunDraftRequest(BaseModel):
    """
    direct run / run-draft 请求体。

    正式口径：
    - workflow 传的是当前画布的 transport shape
    - input_state 是本次 full run 输入
    - prompt_overrides 是 run-time 临时覆盖，不属于保存态

    注意：
    - 这里不是 canonical workflow contract owner
    """

    workflow: Dict[str, Any]
    input_state: Dict[str, Any] = Field(default_factory=dict)
    prompt_overrides: Dict[str, str] = Field(default_factory=dict)


class SubgraphTestRequest(BaseModel):
    """
    subgraph test 请求体。

    正式口径：
    - workflow: 当前画布编辑态 workflow payload
    - start_node_id: 子图测试起点
    - end_node_ids: 可选的子图终点集合；为空时表示跑 start 的全部下游
    - test_state: 本次 subgraph test 的初始 sandbox state
    - prompt_overrides: 本次测试临时 prompt 覆盖，不属于保存态

    注意：
    - 正式路径为 /test-subgraph
    - 这里不再承载旧单节点测试的 node_input_overrides / prompt_test_context
    - subgraph test 的响应体直接复用 RunResult，通过 run_scope=subgraph 区分
    """

    workflow: Dict[str, Any]
    start_node_id: str
    end_node_ids: List[str] = Field(default_factory=list)

    test_state: Dict[str, Any] = Field(default_factory=dict)
    prompt_overrides: Dict[str, str] = Field(default_factory=dict)


BaseRunStep = StepProjection
InputSuccessRunStep = InputSuccessStepProjection
InputFailedRunStep = InputFailedStepProjection
PromptSuccessRunStep = PromptSuccessStepProjection
PromptFailedRunStep = PromptFailedStepProjection
OutputSuccessRunStep = OutputSuccessStepProjection
OutputFailedRunStep = OutputFailedStepProjection
RunStep = StepProjection


class RunResult(BaseModel):
    """
    direct run / subgraph test 响应体。

    正式口径：
    - success 时只看 final_state
    - failed 时只看 partial_state
    - run 级 error_* / failure_stage 是失败摘要 owner
    - step 级错误信息只用于单步信息展示，不替代 run 级失败摘要
    - full run 与 subgraph test 复用同一响应壳，仅通过 run_scope 区分

    当前限制：
    - 当前不对外暴露 run-level finished_at
    """

    status: Literal["success", "failed"]
    run_scope: Literal["full", "subgraph"]

    input_state: Dict[str, Any] = Field(default_factory=dict)
    final_state: Dict[str, Any] = Field(default_factory=dict)
    partial_state: Optional[Dict[str, Any]] = None

    steps: List[RunStep] = Field(default_factory=list)

    error_type: Optional[str] = None
    error_message: Optional[str] = None
    error_detail: Optional[str] = None
    failure_stage: Optional[Literal["request", "definition", "execution"]] = None


LiveRunStatus = Literal["idle", "running", "success", "failed"]


class LiveRunStartResponse(BaseModel):
    run_id: str
    status: Literal["running"] = "running"


class LiveRunSnapshot(BaseModel):
    run_id: Optional[str] = None
    canvas_id: Optional[str] = None

    status: LiveRunStatus
    run_scope: Literal["full"] = "full"

    active_node_id: Optional[str] = None

    input_state: Dict[str, Any] = Field(default_factory=dict)
    current_state: Dict[str, Any] = Field(default_factory=dict)
    final_state: Dict[str, Any] = Field(default_factory=dict)
    partial_state: Optional[Dict[str, Any]] = None

    steps: List[RunStep] = Field(default_factory=list)

    error_type: Optional[str] = None
    error_message: Optional[str] = None
    error_detail: Optional[str] = None
    failure_stage: Optional[Literal["request", "definition", "execution"]] = None

    started_at: Optional[str] = None
    finished_at: Optional[str] = None


BatchRunStatus = Literal["running", "finished", "cancelled"]
BatchItemStatus = Literal[
    "queued",
    "running",
    "succeeded",
    "failed",
    "cancelled",
]


class BatchRunRequest(BaseModel):
    """
    batch run 请求体。

    正式口径：
    - workflow 传的是当前画布的 transport shape
    - input_values 表示围绕单 input 节点的一批原始输入值
    - max_parallel 是 batch 调度上限，第一版限制为 1~4

    注意：
    - 这里只定义 transport shape
    - workflow 必须且只能有一个 input 节点，由 route / service 正式裁决
    - input_values 为空是否允许，建议由 service 统一收口为 request_invalid
    """

    workflow: Dict[str, Any]
    input_values: List[Any] = Field(default_factory=list)
    max_parallel: int = Field(default=4, ge=1, le=4)


class BatchItemSummary(BaseModel):
    """
    batch 单项摘要。

    正式口径：
    - 只承载 item 级摘要
    - 不承载完整 RunResult
    - 列表顺序应按原始输入顺序稳定返回
    """

    item_id: str
    index: int
    status: BatchItemStatus

    started_at: Optional[str] = None
    finished_at: Optional[str] = None

    error_type: Optional[str] = None
    error_message: Optional[str] = None


class BatchSummaryResponse(BaseModel):
    """
    batch 摘要响应体。

    正式口径：
    - status 只表达 batch 级终态 / 运行态
    - cancel_requested 用于明确表示“取消已请求，但 running item 仍在自然结束”
    - completed_count 不在后端返回，由前端派生
    - items 只返回摘要，不返回完整 RunResult
    """

    batch_id: str
    status: BatchRunStatus
    cancel_requested: bool = False

    total: int
    queued: int
    running: int
    succeeded: int
    failed: int
    cancelled: int

    items: List[BatchItemSummary] = Field(default_factory=list)


class BatchItemDetailResponse(BaseModel):
    """
    batch 单项详情响应体。

    正式口径：
    - 详情继续复用 single run 的 RunResult
    - item 元信息与 run_result 分层
    """

    item_id: str
    index: int
    run_result: RunResult