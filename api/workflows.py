from __future__ import annotations

"""
workflow / prompt / model resource 相关主路由层。

本文件角色：
- 作为拆分后的 router 聚合入口
- 继续向 fastapi_app 暴露单一 workflow_router 导出，避免入口层大面积改动

说明：
- 具体 workflow / run / prompt / model-resource 路由已拆分到 api.routes.*
- 本文件只负责汇总 include_router
"""

from fastapi import APIRouter

from api.routes.model_resource_routes import router as model_resource_router
from api.routes.prompt_routes import router as prompt_router
from api.routes.run_routes import router as run_router
from api.routes.workflow_routes import router as workflow_router

router = APIRouter()
router.include_router(workflow_router)
router.include_router(run_router)
router.include_router(prompt_router)
router.include_router(model_resource_router)
