from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from langchain_core.messages import BaseMessage

from backend_workflow_engine.execution_types import ExecutionStep


@dataclass
class WorkflowRunRuntime:
    current_state: dict[str, Any]
    steps: list[ExecutionStep] = field(default_factory=list)
    prompt_window_id_by_node: dict[str, str] = field(default_factory=dict)
    window_histories: dict[str, list[BaseMessage]] = field(default_factory=dict)
    prompt_committed_history_by_node: dict[str, list[BaseMessage]] = field(
        default_factory=dict
    )


def build_workflow_run_runtime(initial_state: dict[str, Any]) -> WorkflowRunRuntime:
    return WorkflowRunRuntime(current_state=dict(initial_state or {}))


