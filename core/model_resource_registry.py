"""
model resource 运行时 registry 投影层。

本文件角色：
- 从 storage record map 投影出 runtime registry
- 提供运行时 resolve 入口

负责：
- record map -> runtime registry
- health 透传
- 解析 modelResourceId 对应的运行时资源对象

不负责：
- 文件 IO
- 配置写回
- 删除保护扫描
- HTTP 语义翻译

上下游：
- 上游来自 storage.model_resource_store
- 下游由 engine / validator 等运行链消费

当前限制 / 待收口点：
- runtime registry 当前仍为 dict[str, dict]，不是强类型 runtime model
- resolve 失败当前抛通用异常，由上层解释为 definition failure
- 兼容函数名 load_model_resource_registry_from_file 仍保留，长期可收口删除
"""
from __future__ import annotations

from contracts.model_resource_contracts import ModelResourceRecord
from storage.model_resource_store import (
    get_model_resource_config_health,
    load_model_resource_record_map_or_empty,
)


def _build_runtime_registry_from_records(
    records: dict[str, ModelResourceRecord],
) -> dict[str, dict]:
    """
    将存储层 record map 投影为运行时 registry。

    输入：
    - {resource_id: ModelResourceRecord}

    输出：
    - {resource_id: {"provider": ..., "model": ..., "api_key": ..., "base_url": ...}}

    正式口径：
    - core 层只做运行时投影
    - 不改变 resource_id，不补额外业务字段

    当前限制：
    - 当前返回未建模 dict，而非明确 runtime contract model
    """
    registry: dict[str, dict] = {}

    for resource_id, record in records.items():
        registry[resource_id] = {
            "provider": record.provider,
            "model": record.model,
            "api_key": record.api_key,
            "base_url": record.base_url,
        }

    return registry


def load_model_resource_registry() -> dict[str, dict]:
    """
    读取当前活动中的模型资源运行时 registry。

    正式口径：
    - 文件 IO / strict parse 由 storage 层负责
    - core 层只负责把 record map 投影为运行时 registry
    """
    records = load_model_resource_record_map_or_empty()
    return _build_runtime_registry_from_records(records)


def load_model_resource_registry_from_file() -> dict[str, dict]:
    """
    兼容函数名保留。

    注意：
    - 当前实现已不直接读文件
    - 新调用应优先使用 load_model_resource_registry()
    """
    return load_model_resource_registry()


def get_model_resource_registry_health() -> dict[str, str]:
    """
    返回模型资源配置文件的最小健康状态。

    正式口径：
    - health 语义 owner 在 storage 层
    - core 层只做转发暴露
    """
    return get_model_resource_config_health()


def resolve_model_resource(
    model_resource_id: str,
    registry: dict[str, dict] | None = None,
) -> dict:
    """
    解析 prompt 节点最终使用的完整模型资源对象。

    输入：
    - model_resource_id: prompt 节点声明的资源 id
    - registry: 可选的已加载 runtime registry；缺省时实时读取

    输出：
    - {"provider": ..., "model": ..., "api_key": ..., "base_url": ...}

    正式口径：
    - 资源选择只由 modelResourceId 决定
    - registry 唯一事实源来自 storage 层正式配置读取结果

    不负责：
    - 文件配置健康修复
    - HTTP 错误翻译

    当前限制：
    - 当前 resolve 失败抛 ValueError，由上层再解释为 definition failure
    """
    active_registry = registry or load_model_resource_registry()

    normalized_id = str(model_resource_id or "").strip()
    if not normalized_id:
        raise ValueError("Prompt node modelResourceId is required for run")

    if not active_registry:
        raise ValueError("No model resources are configured")

    if normalized_id not in active_registry:
        raise ValueError(f"Unknown model resource id: {normalized_id}")

    return active_registry[normalized_id]