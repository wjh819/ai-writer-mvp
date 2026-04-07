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
direct run / subgraph test HTTP transport DTO 层。

本文件角色：
- 定义 direct run / run-draft 与 subgraph test 的请求体与响应体
- 作为 API 层 transport contract owner

负责：
- RunDraftRequest
- SubgraphTestRequest
- RunResult / RunStep

不负责：
- engine 内部 execution facts
- workflow canonical contract
- persisted run detail contract

上下游：
- 上游由 route / mapper 填充
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