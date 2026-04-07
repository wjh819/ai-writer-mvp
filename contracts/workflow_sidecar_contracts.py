from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    """
    sidecar contract 的最小严格基类。

    正式口径：
    - extra 一律 forbid
    - sidecar 是 node assets owner，不是第二套 workflow contract
    """

    model_config = ConfigDict(extra="forbid")


class WorkflowSidecarNodeAssets(StrictBaseModel):
    """
    单节点 sidecar assets。

    正式口径：
    - pinnedInputs：节点级显式固定输入
    - pinnedPromptContext：仅 prompt 节点允许
    - metadata：少量 node-level metadata 预留位

    注意：
    - cached result / cached prompt snapshot 当前不进入持久化 sidecar
    """

    pinnedInputs: Dict[str, Any] = Field(default_factory=dict)
    pinnedPromptContext: Dict[str, Any] | None = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowSidecarData(StrictBaseModel):
    """
    一个 canvas 对应一个 sidecar 文件。

    正式口径：
    - 以 nodeId -> assets 组织
    - sidecar 缺失视为空壳
    - sidecar 只承载 node assets，不得扩张为第二套 workflow 保存态
    """

    nodes: Dict[str, WorkflowSidecarNodeAssets] = Field(default_factory=dict)