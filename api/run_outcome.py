from __future__ import annotations

from typing import Any

from api.run_result_mapper import build_run_result_from_execution
from core.execution_types import WorkflowExecutionResult

"""
direct run / subgraph test response 收口层。

本文件角色：
- 将内部统一 execution result 收口为最终 API response dict

负责：
- 调用 run_result_mapper 完成 execution -> RunResult 映射
- 返回 route 可直接使用的 response dict

不负责：
- execution facts 定义
- transport DTO 定义
- 错误分类
- 业务语义推导
"""


def build_run_outcome_response(execution: WorkflowExecutionResult) -> dict[str, Any]:
    """
    将内部统一 execution result 转为 direct run API response。

    注意：
    - execution 是 workflow_run_service 的内部统一结果
    - direct run / subgraph test response 只能从 execution result 单向映射
    """
    return build_run_result_from_execution(execution).model_dump()