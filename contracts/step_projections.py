from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


PromptWindowMode = Literal["new_window", "continue", "branch"]


class BaseStepProjection(BaseModel):
    node: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_ms: Optional[int] = None


class InputSuccessStepProjection(BaseStepProjection):
    type: Literal["input"]
    status: Literal["success"]
    output: Any
    published_state: Dict[str, Any] = Field(default_factory=dict)


class InputFailedStepProjection(BaseStepProjection):
    type: Literal["input"]
    status: Literal["failed"]
    error_message: str
    error_detail: Optional[str] = None


class PromptSuccessStepProjection(BaseStepProjection):
    type: Literal["prompt"]
    status: Literal["success"]
    prompt_mode: Literal["template", "inline"]
    prompt_ref: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    rendered_prompt: Optional[str] = None
    output: str
    published_state: Dict[str, Any] = Field(default_factory=dict)

    window_mode: PromptWindowMode
    window_source_node_id: Optional[str] = None
    window_id: str
    window_parent_id: Optional[str] = None


class PromptFailedStepProjection(BaseStepProjection):
    type: Literal["prompt"]
    status: Literal["failed"]
    prompt_mode: Literal["template", "inline"]
    prompt_ref: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    rendered_prompt: Optional[str] = None
    error_message: str
    error_detail: Optional[str] = None

    window_mode: Optional[PromptWindowMode] = None
    window_source_node_id: Optional[str] = None
    window_id: Optional[str] = None
    window_parent_id: Optional[str] = None


class OutputSuccessStepProjection(BaseStepProjection):
    type: Literal["output"]
    status: Literal["success"]
    inputs: Dict[str, Any] = Field(default_factory=dict)
    output: Any
    published_state: Dict[str, Any] = Field(default_factory=dict)


class OutputFailedStepProjection(BaseStepProjection):
    type: Literal["output"]
    status: Literal["failed"]
    inputs: Dict[str, Any] = Field(default_factory=dict)
    error_message: str
    error_detail: Optional[str] = None


StepProjection = (
    InputSuccessStepProjection
    | InputFailedStepProjection
    | PromptSuccessStepProjection
    | PromptFailedStepProjection
    | OutputSuccessStepProjection
    | OutputFailedStepProjection
)