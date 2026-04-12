from __future__ import annotations

from api.workflow_direct_run_service import (
    execute_draft_workflow,
    execute_partial_workflow,
)
from api.workflow_live_run_service import (
    start_live_draft_workflow,
)
from api.workflow_run_result_factory import (
    build_failed_execution_result,
    build_success_execution_result,
    utc_now_iso,
)

"""
workflow 执行服务层。

本文件角色：
- direct run / run-draft 的统一 execution result 壳层
- direct subgraph test 的统一 execution result 壳层
- 连接 engine 与 API projection

负责：
- 调用 engine 执行 workflow
- 将成功/失败路径统一包装为 WorkflowExecutionResult
- 统一 run-level status / error_* / failure_stage / finished_at

不负责：
- HTTP DTO 序列化
- route 层响应拼装
- persisted run 写入
- 前端展示语义
"""

__all__ = [
    "build_failed_execution_result",
    "build_success_execution_result",
    "execute_draft_workflow",
    "execute_partial_workflow",
    "start_live_draft_workflow",
    "utc_now_iso",
]
