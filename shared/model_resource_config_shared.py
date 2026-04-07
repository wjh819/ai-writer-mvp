"""
model resource 配置共享规则层。

本文件角色：
- 定义 model resource 配置文件路径常量
- 定义 provider 支持集
- 定义单条原始配置项的最小归一化规则

负责：
- 提供 MODEL_RESOURCE_CONFIG_PATH
- 提供 SUPPORTED_MODEL_RESOURCE_PROVIDERS
- 将原始配置项收敛为可供 storage 层实例化的最小字典结构

不负责：
- 文件 IO
- record map 构建
- runtime registry 投影
- 删除保护扫描
- HTTP DTO

上下游：
- 上游输入来自配置文件 JSON 中的单条 value
- 下游由 storage.model_resource_store 调用，继续构建 ModelResourceRecord

当前限制 / 待收口点：
- provider 支持集当前同时存在于 shared 常量与 contract Literal 中，后续扩展 provider 时需同步修改两侧
- 当前归一化为宽松文本收敛，不是严格 schema validator
- base_url 当前只要求非空，不校验 URL 合法性
- 不兼容旧字符串格式，也不从环境变量补字段
"""
from __future__ import annotations

import os

MODEL_RESOURCE_CONFIG_PATH = os.path.join("config", "model_resources.json")

SUPPORTED_MODEL_RESOURCE_PROVIDERS = {
    "openai_compatible",
}


def normalize_model_resource_item(value) -> dict | None:
    """
    归一化单条模型资源配置。

    输入：
    - value: 配置文件中某个 resource_id 对应的原始 value

    输出：
    - 合法时返回最小归一化 dict：
      {
          "provider": str,
          "model": str,
          "api_key": str,
          "base_url": str,
      }
    - 非法时返回 None

    正式口径：
    - 这里只做单条配置项的轻量归一化
    - provider / model / api_key / base_url 必须可收敛为非空字符串
    - provider 必须属于当前受支持集合

    不负责：
    - 文件读取
    - record id 读取
    - Pydantic contract 实例化
    - 细粒度错误分类

    当前限制：
    - 当前通过 str(...).strip() 做宽松文本收敛，不是严格 typed validate
    - base_url 仅校验非空，不校验 URL 语义
    """
    if not isinstance(value, dict):
        return None

    provider = str(value.get("provider", "")).strip()
    model = str(value.get("model", "")).strip()
    api_key = str(value.get("api_key", "")).strip()
    base_url = str(value.get("base_url", "")).strip()

    if provider not in SUPPORTED_MODEL_RESOURCE_PROVIDERS:
        return None

    if not model or not api_key or not base_url:
        return None

    return {
        "provider": provider,
        "model": model,
        "api_key": api_key,
        "base_url": base_url,
    }