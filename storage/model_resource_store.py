"""
model resource 配置文件存储层。

本文件角色：
- model resource 配置文件的唯一文件 IO owner
- record map 的严格读取/写回入口

负责：
- 读取 config/model_resources.json
- 对原始 JSON 做 strict parse
- 将原始配置构建为 ModelResourceRecord map
- 提供最小文件级 health 状态
- 将 record map 整表写回配置文件

不负责：
- runtime resolve
- 删除保护扫描
- HTTP DTO
- HTTPException 翻译

上下游：
- 上游依赖 shared.model_resource_config_shared 提供路径与单条归一化规则
- 下游由 core.model_resource_registry、api.workflows 等管理链消费

当前限制 / 待收口点：
- 写回当前不是原子写，也没有并发保护
- health 仅提供最小文件级状态，不是细粒度诊断接口
- record key 当前仍使用宽松 trim/coercion
"""
from __future__ import annotations

import json
import os
from typing import Dict

from app_errors import ModelResourceConfigError
from contracts.model_resource_contracts import ModelResourceRecord
from shared.model_resource_config_shared import (
    MODEL_RESOURCE_CONFIG_PATH,
    normalize_model_resource_item,
)


def _trim(value) -> str:
    """
    轻量文本辅助。

    只负责：
    - None -> ""
    - 宽松 str() 强转后 strip

    不负责：
    - 严格字段合法性裁决

    当前限制：
    - 用于配置文件读取便利用 helper，不代表正式 strict contract normalize 策略
    """
    if value is None:
        return ""
    return str(value).strip()


def _load_raw_model_resource_config_file_or_raise() -> dict:
    """
    严格读取 model resource 配置文件原始内容。

    输出：
    - 顶层为 dict 的原始 JSON 对象

    正式口径：
    - 文件不存在 -> 抛 ModelResourceConfigError
    - JSON 非法 -> 抛 ModelResourceConfigError
    - 顶层非 object -> 抛 ModelResourceConfigError

    不负责：
    - 单条 record 归一化
    - record map 实例化
    """
    if not os.path.exists(MODEL_RESOURCE_CONFIG_PATH):
        raise ModelResourceConfigError("Model resource config file does not exist")

    try:
        with open(MODEL_RESOURCE_CONFIG_PATH, encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as exc:
        raise ModelResourceConfigError("Model resource config file is invalid") from exc

    if not isinstance(raw, dict):
        raise ModelResourceConfigError("Model resource config file must be a JSON object")

    return raw


def load_model_resource_record_map_or_raise() -> Dict[str, ModelResourceRecord]:
    """
    严格读取并解析当前 model resource 配置文件。

    输出：
    - {resource_id: ModelResourceRecord}

    正式口径：
    - 文件不存在 -> 抛错
    - 任一 record 结构非法 -> 视为整个文件非法
    - 不接受“部分成功、部分跳过”的读取策略

    不负责：
    - runtime registry 投影
    - health 结果格式化
    """
    raw = _load_raw_model_resource_config_file_or_raise()
    records: Dict[str, ModelResourceRecord] = {}

    for key, value in raw.items():
        resource_id = _trim(key)
        normalized = normalize_model_resource_item(value)

        if not resource_id or normalized is None:
            raise ModelResourceConfigError("Model resource config file is invalid")

        try:
            records[resource_id] = ModelResourceRecord(
                id=resource_id,
                provider=normalized["provider"],
                model=normalized["model"],
                api_key=normalized["api_key"],
                base_url=normalized["base_url"],
            )
        except Exception as exc:
            raise ModelResourceConfigError("Model resource config file is invalid") from exc

    return records


def load_model_resource_record_map_or_empty() -> Dict[str, ModelResourceRecord]:
    """
    读取 model resource record map。

    输出：
    - 文件不存在时返回 {}
    - 文件存在且合法时返回完整 record map

    正式口径：
    - 文件不存在与文件非法是两种不同状态
    - “没有配置文件”返回空 dict
    - “有配置文件但非法”仍然抛错

    不负责：
    - 吞掉非法配置
    """
    if not os.path.exists(MODEL_RESOURCE_CONFIG_PATH):
        return {}

    return load_model_resource_record_map_or_raise()


def get_model_resource_config_health() -> dict[str, str]:
    """
    返回 model resource 配置文件的最小健康状态。

    输出：
    - {"status": "...", "config_path": MODEL_RESOURCE_CONFIG_PATH}

    状态：
    - file_missing
    - file_invalid
    - file_empty
    - file_active

    正式口径：
    - 这里只返回最小文件级健康状态
    - 不表达连接可用性、鉴权有效性或 provider 级细粒度问题
    """
    if not os.path.exists(MODEL_RESOURCE_CONFIG_PATH):
        return {
            "status": "file_missing",
            "config_path": MODEL_RESOURCE_CONFIG_PATH,
        }

    try:
        records = load_model_resource_record_map_or_raise()
    except ModelResourceConfigError:
        return {
            "status": "file_invalid",
            "config_path": MODEL_RESOURCE_CONFIG_PATH,
        }

    if not records:
        return {
            "status": "file_empty",
            "config_path": MODEL_RESOURCE_CONFIG_PATH,
        }

    return {
        "status": "file_active",
        "config_path": MODEL_RESOURCE_CONFIG_PATH,
    }


def write_model_resource_record_map(records: Dict[str, ModelResourceRecord]):
    """
    将 model resource record map 整表写回配置文件。

    输入：
    - records: 目标完整 record map

    正式口径：
    - 写回以 resource_id 排序后的整表结果
    - storage 层是正式文件写入 owner

    不负责：
    - 局部 patch 写入
    - 并发冲突处理
    - 原子写保障

    当前限制：
    - 当前直接覆盖目标文件，未使用临时文件 + rename 的原子写策略
    """
    os.makedirs(os.path.dirname(MODEL_RESOURCE_CONFIG_PATH), exist_ok=True)

    data = {
        resource_id: {
            "provider": record.provider,
            "model": record.model,
            "api_key": record.api_key,
            "base_url": record.base_url,
        }
        for resource_id, record in sorted(records.items(), key=lambda item: item[0])
    }

    with open(MODEL_RESOURCE_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)