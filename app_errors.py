from __future__ import annotations


"""
应用内部异常层。

本文件角色：
- 定义应用内部统一错误语言
- 供 storage / loader / validator / service / route translator 共享使用

负责：
- 提供不带 HTTP 语义的内部异常类型
- 区分“找不到”“输入非法”“存储损坏”“workflow 加载失败”等应用层错误类别

不负责：
- HTTP 状态码定义
- HTTP 响应序列化
- 前端文案映射

上下游：
- 下层（storage / core / api 内部逻辑）抛出 AppError 及其子类
- route / translator 再将其映射为 HTTPException 或其他外部协议错误

当前限制 / 待收口点：
- 当前大多数 AppError 仍以字符串消息为主，不是统一的结构化 error schema
- 只有少数错误（如 ModelResourceDeleteBlockedError、WorkflowSidecarLoadError）
  显式承载结构化 detail
- 若后续前端需要稳定的机器可消费错误分支，可逐步为关键错误补充显式 code / detail contract
"""


class AppError(Exception):
    """
    应用内部异常基类。

    注意：
    - 不表达 HTTP 语义
    - route / translator 层再统一翻译成 HTTPException
    """

    pass


class NotFoundError(AppError):
    """
    资源不存在。

    适用场景：
    - workflow / model resource / 其他正式对象未找到

    注意：
    - 这里只表达“找不到”
    - 不携带 HTTP 404 语义本身
    """

    pass


class InvalidInputError(AppError):
    """
    调用参数或写入参数非法。

    适用场景：
    - 用户提交 payload 非法
    - canonical structure / dependency 校验失败
    - 更新请求中某个字段值不满足正式规则
    """

    pass


class InvalidStoredDataError(AppError):
    """
    持久化数据损坏或结构非法。

    适用场景：
    - 已存在的持久化数据与当前正式 contract 不一致
    - 存储层读到的数据无法被视为有效内部对象

    注意：
    - 这是通用存储损坏语义
    - 与 WorkflowLoadError 的区别是：后者更聚焦 workflow 文件可读但无法收敛为合法 canonical workflow
    """

    pass


class WorkflowLoadError(AppError):
    """
    workflow 文件可读取，但无法收敛为合法 canonical workflow。

    适用场景：
    - workflow YAML 可打开，但 parse / converter / normalize / validator 失败
    - editor load / canonical load 无法得到正式 workflow 对象
    """

    pass


class WorkflowSidecarLoadError(AppError):
    """
    workflow sidecar 可定位，但无法被视为当前正式 sidecar 数据。

    适用场景：
    - sidecar 文件存在但 parse 失败
    - sidecar 文件结构非法
    - sidecar 与当前正式 workflow 之间的关键约束不满足

    注意：
    - detail 必须是结构化对象，供 route / translator 原样返回给前端
    - 这是“主 workflow 合法，但 sidecar 坏了，应阻止进入当前 canvas”的专用错误语言
    """

    def __init__(self, detail: dict):
        self.detail = detail
        message = detail.get("message") or "Workflow sidecar load failed"
        super().__init__(message)


class ModelResourceConfigError(AppError):
    """
    model resource 配置文件非法或不可用。

    适用场景：
    - 配置文件缺失
    - JSON 非法
    - record 结构无法通过正式解析
    """

    pass


class ModelResourceDeleteBlockedError(AppError):
    """
    model resource 删除被阻止。

    注意：
    - detail 必须是结构化对象，供 route / translator 原样返回给前端
    - 当前这是少数显式承载结构化 detail 的内部异常之一
    """

    def __init__(self, detail: dict):
        self.detail = detail
        message = detail.get("message") or "Model resource delete blocked"
        super().__init__(message)