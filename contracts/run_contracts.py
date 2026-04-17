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


class RunDraftRequest(BaseModel):
    workflow: Dict[str, Any]
    input_state: Dict[str, Any] = Field(default_factory=dict)
    prompt_overrides: Dict[str, str] = Field(default_factory=dict)


class SubgraphTestRequest(BaseModel):
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
    workflow: Dict[str, Any]
    input_values: List[Any] = Field(default_factory=list)
    max_parallel: int = Field(default=4, ge=1, le=4)


class BatchItemSummary(BaseModel):
    item_id: str
    index: int
    status: BatchItemStatus

    started_at: Optional[str] = None
    finished_at: Optional[str] = None

    error_type: Optional[str] = None
    error_message: Optional[str] = None


class BatchSummaryResponse(BaseModel):
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
    item_id: str
    index: int
    run_result: RunResult


__all__ = [
    "BaseRunStep",
    "BatchItemDetailResponse",
    "BatchItemStatus",
    "BatchItemSummary",
    "BatchRunRequest",
    "BatchRunStatus",
    "BatchSummaryResponse",
    "InputFailedRunStep",
    "InputSuccessRunStep",
    "LiveRunSnapshot",
    "LiveRunStartResponse",
    "LiveRunStatus",
    "OutputFailedRunStep",
    "OutputSuccessRunStep",
    "PromptFailedRunStep",
    "PromptSuccessRunStep",
    "RunDraftRequest",
    "RunResult",
    "RunStep",
    "SubgraphTestRequest",
]
