"""
model resource 管理接口 HTTP transport DTO 层。

本文件角色：
- 定义 model resource 管理相关的请求体与响应体 DTO

负责：
- list item / create / update / delete / health 的 HTTP shape

不负责：
- 配置文件原始 shape
- 共享删除 detail contract
- runtime registry 结构
- 文件 IO

上下游：
- 上游由 FastAPI route 接收/返回
- 下游被前端 modelResourceTypes.ts 镜像消费

当前限制 / 待收口点：
- ModelResourceListItem 当前仍包含 api_key；前端 mask 仅是展示层行为，不是安全边界
- ModelResourceConfigHealth.status 当前仍为宽字符串，未收紧为 Literal 枚举
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from contracts.model_resource_contracts import ModelResourceProvider


class ModelResourceListItem(BaseModel):
    """
    model resource 列表展示 DTO。

    注意：
    - 当前 DTO 仍返回 api_key
    - 这服务于本地单用户管理面板，不代表长期安全边界设计
    """
    id: str
    provider: ModelResourceProvider
    model: str
    api_key: str
    base_url: str


class CreateModelResourceRequest(BaseModel):
    """
    创建 model resource 请求体。

    正式口径：
    - 创建时各主要字段都应显式提供
    """
    id: str
    provider: ModelResourceProvider
    model: str
    api_key: str
    base_url: str


class UpdateModelResourceRequest(BaseModel):
    """
    更新 model resource 请求体。

    正式口径：
    - id 不可变
    - api_key=None 表示“保持原 key 不变”
    - 若显式提供 api_key，则由 route / service 决定是否允许空字符串
    """
    id: str
    provider: ModelResourceProvider
    model: str
    base_url: str
    api_key: Optional[str] = None


class DeleteModelResourceRequest(BaseModel):
    """
    删除 model resource 请求体。
    """
    id: str


class ModelResourceConfigHealth(BaseModel):
    """
    model resource 配置文件最小健康状态 DTO。

    注意：
    - 当前 status 仅表示文件级健康状态
    - 不表示 provider 连接可用性或鉴权有效性
    """
    status: str
    config_path: str