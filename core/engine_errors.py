from __future__ import annotations

from typing import Any


class WorkflowDefinitionError(Exception):
    """workflow 定义/配置阶段错误。"""


class WorkflowNodeExecutionError(Exception):
    error_type = "node_execution_failed"

    def __init__(
        self,
        message: str,
        *,
        error_detail: str | None = None,
        bound_inputs: dict[str, Any] | None = None,
        rendered_prompt: str | None = None,
        window_mode: str | None = None,
        window_source_node_id: str | None = None,
        window_id: str | None = None,
        window_parent_id: str | None = None,
    ):
        super().__init__(message)
        self.error_message = message
        self.error_detail = error_detail or message
        self.bound_inputs = dict(bound_inputs or {})
        self.rendered_prompt = rendered_prompt
        self.window_mode = window_mode
        self.window_source_node_id = window_source_node_id
        self.window_id = window_id
        self.window_parent_id = window_parent_id


class MissingInputsError(WorkflowNodeExecutionError):
    error_type = "missing_inputs"


class PromptRenderError(WorkflowNodeExecutionError):
    error_type = "prompt_render_failed"


class StructuredOutputError(WorkflowNodeExecutionError):
    error_type = "structured_output_invalid"


class OutputWriteError(WorkflowNodeExecutionError):
    error_type = "output_write_failed"
