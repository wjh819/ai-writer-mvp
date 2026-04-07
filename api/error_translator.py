from __future__ import annotations

"""
AppError -> HTTPException 统一翻译层。

本文件角色：
- 作为内部 AppError 语义到 HTTP 响应语义的正式翻译边界

负责：
- 将已分类的 AppError 映射为对应 HTTP 状态码与 detail

不负责：
- 定义业务错误分类
- 构造结构化 detail 本身
- route 业务编排

上下游：
- 上游来自 api route 层捕获到的 AppError
- 下游输出 FastAPI HTTPException

当前限制 / 待收口点：
- 普通错误当前仍主要返回 detail: string
- 只有显式定义为结构化 detail 的错误，才原样返回对象
"""

from fastapi import HTTPException

from app_errors import (
    AppError,
    InvalidInputError,
    InvalidStoredDataError,
    ModelResourceConfigError,
    ModelResourceDeleteBlockedError,
    NotFoundError,
    WorkflowLoadError,
    WorkflowSidecarLoadError,
)


def to_http_exception(exc: AppError) -> HTTPException:
    """
    AppError -> HTTPException 统一翻译入口。

    输入：
    - exc: 已进入应用层分类体系的内部异常

    输出：
    - 可直接由 FastAPI route 抛出的 HTTPException

    当前状态码策略：
    - NotFoundError -> 404
    - ModelResourceDeleteBlockedError -> 400（保留结构化 detail）
    - WorkflowSidecarLoadError -> 400（保留结构化 detail）
    - InvalidInputError / InvalidStoredDataError / WorkflowLoadError /
      ModelResourceConfigError -> 400
    - 其他未分类 AppError -> 500

    注意：
    - 本阶段不重做外部 payload shape
    - 普通错误仍然返回 detail: string
    - 只有已定义为结构化 detail 的错误，才原样返回对象
    """
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=404, detail=str(exc))

    if isinstance(exc, ModelResourceDeleteBlockedError):
        return HTTPException(status_code=400, detail=exc.detail)

    if isinstance(exc, WorkflowSidecarLoadError):
        return HTTPException(status_code=400, detail=exc.detail)

    if isinstance(
        exc,
        (
            InvalidInputError,
            InvalidStoredDataError,
            WorkflowLoadError,
            ModelResourceConfigError,
        ),
    ):
        return HTTPException(status_code=400, detail=str(exc))

    return HTTPException(
        status_code=500,
        detail=str(exc) or "Internal server error",
    )