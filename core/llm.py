from typing import Sequence

from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI


SUPPORTED_LLM_PROVIDERS = {
    "openai_compatible",
}


def get_llm(
    *,
    provider: str,
    api_key: str,
    model: str,
    temperature: float,
    timeout: int,
    max_retries: int,
    base_url: str,
):
    """
    创建并返回当前运行所使用的 LLM 客户端。

    当前职责：
    - 统一承接运行时最终调用配置
    - 显式接收 provider，便于后续按 provider 分发
    - 当前阶段仅支持 openai_compatible

    参数来源：
    - provider / model / api_key / base_url
      由后端 model resource 解析得到
    - temperature / timeout / max_retries
      由 prompt 节点 llm 运行参数提供

    当前边界：
    - 这里只负责客户端创建与最小参数校验
    - 不负责 prompt 模板读取
    - 不负责 prompt 渲染
    - 不负责模型资源解析
    - 不负责节点执行时序
    """
    normalized_provider = str(provider or "").strip()
    normalized_api_key = str(api_key or "").strip()
    normalized_model = str(model or "").strip()
    normalized_base_url = str(base_url or "").strip()

    if not normalized_provider:
        raise ValueError("provider is required")

    if normalized_provider not in SUPPORTED_LLM_PROVIDERS:
        raise ValueError(f"Unsupported llm provider: {normalized_provider}")

    if not normalized_api_key:
        raise ValueError("api_key is required")

    if not normalized_model:
        raise ValueError("model is required")

    if not normalized_base_url:
        raise ValueError("base_url is required")

    if normalized_provider == "openai_compatible":
        return ChatOpenAI(
            model=normalized_model,
            temperature=temperature,
            api_key=normalized_api_key,
            timeout=timeout,
            max_retries=max_retries,
            base_url=normalized_base_url,
        )

    raise ValueError(f"Unsupported llm provider: {normalized_provider}")


def invoke_llm(
    llm,
    *,
    prompt: str | None = None,
    messages: Sequence[BaseMessage] | None = None,
):
    """
    统一的 LLM 调用入口。

    当前阶段：
    - prompt: 兼容单轮纯文本调用
    - messages: 支持单次 run 内的窗口历史重放
    """
    if messages is not None:
        return llm.invoke(list(messages))

    if prompt is not None:
        return llm.invoke(prompt)

    raise ValueError("Either prompt or messages must be provided")