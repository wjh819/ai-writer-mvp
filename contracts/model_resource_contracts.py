"""
model resource 共享 contract 层。

本文件角色：
- 定义 model resource 相关的共享结构 contract
- 作为 storage / core / api / frontend detail 消费链之间的共同类型锚点

负责：
- 定义 ModelResourceRecord
- 定义引用扫描结果结构
- 定义“删除被阻止”时的结构化 detail contract

不负责：
- 配置文件原始 JSON shape
- HTTP transport DTO owner
- runtime registry owner
- 文件 IO
- 删除保护扫描逻辑本身

上下游：
- 上游由 storage / reference service / route 构造这些结构
- 下游由 API DTO、前端镜像类型与 UI detail 展示消费

当前限制 / 待收口点：
- workflow_name 当前是兼容字段名，内部真实语义更接近 canvas_id
- ModelResourceRecord 当前包含明文 api_key，属于内部/管理链结构，不应被误用为安全展示 DTO
- 本文件当前使用宽松 BaseModel；若后续共享 contract 统一 strictness，可与 workflow_contracts.py 对齐
"""
from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


ModelResourceProvider = Literal["openai_compatible"]


class ModelResourceRecord(BaseModel):
    """
    model resource 的共享记录结构。

    正式口径：
    - 表达 storage / 管理链中的正式 record
    - model 选择与连接信息都在此层显式记录

    注意：
    - api_key 为敏感字段
    - 当前结构用于内部存储/管理链，不是对外安全展示 DTO
    """
    id: str
    provider: ModelResourceProvider
    model: str
    api_key: str
    base_url: str


class ModelResourceReference(BaseModel):
    """
    model resource 被 workflow 引用时的结构化引用项。

    兼容说明：
    - workflow_name 字段当前保留旧命名
    - 内部语义已更接近 canvas_id
    """
    workflow_name: str
    node_id: str
    model_resource_id: str


class IncompleteWorkflowReferenceScanItem(BaseModel):
    """
    workflow 引用扫描不完整项。

    用于：
    - 表示某个 workflow 文件无法被可靠扫描
    - 供删除保护 detail 返回给前端展示
    """
    workflow_name: str
    error_message: str


class ModelResourceDeleteBlockedDetail(BaseModel):
    """
    model resource 删除被阻止时的结构化 detail。

    正式口径：
    - error_type 是前端分支与展示的稳定机器字段
    - message 是展示文案
    - references / incomplete_workflows 提供阻止原因的背景信息

    注意：
    - 这不是普通错误字符串壳
    - 当前是前后端共同消费的结构化错误 contract
    """
    error_type: Literal[
        "model_resource_in_use",
        "model_resource_reference_scan_incomplete",
    ]
    message: str
    references: List[ModelResourceReference] = Field(default_factory=list)
    incomplete_workflows: List[IncompleteWorkflowReferenceScanItem] = Field(
        default_factory=list
    )