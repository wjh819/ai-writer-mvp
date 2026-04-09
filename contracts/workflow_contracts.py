from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, ConfigDict


"""
workflow shared canonical contract 层。

本文件角色：
- 定义 workflow 的共享 canonical contract
- 作为前端编辑态、后端 save/load 链与 engine 执行共同围绕的结构锚点

负责：
- 定义 WorkflowEditorData / WorkflowNode / WorkflowEdge / WorkflowContextLink
- 定义 Input/Prompt/Output 节点 config 的正式 shape
- 明确 data edges 与 contextLinks 的分层关系

不负责：
- HTTP transport DTO
- persisted run contract
- 默认值补齐
- 合法性裁决
- 旧字段兼容迁移

上下游：
- 上游由 converter / normalize / 前端 editor payload 产出原始 shape
- 下游由 validator、engine、前端类型镜像层消费

当前限制 / 待收口点：
- OutputNodeConfig 当前仍使用 "output" 命名；若后续迁到 aggregate 语义，这里是 shared contract owner 改点
- 本文件定义的是保存态 / 共享态 contract shape，不表达运行时推导语义；例如 new_window 不作为保存态字段存在
"""


class StrictBaseModel(BaseModel):
    """
    shared contract 的最小严格基类。

    当前规则：
    - 统一禁止额外字段
    - contract 层优先保证 shape 清晰，而不是宽松兼容
    """

    model_config = ConfigDict(extra="forbid")


class Position(StrictBaseModel):
    """
    节点在前端编辑画布中的位置坐标。

    注意：
    - 这里只表达保存态坐标
    - 不表达任何运行时或展示推导语义
    """

    x: float
    y: float


class LLMConfig(StrictBaseModel):
    """
    prompt 节点的 llm 子配置。

    正式语义：
    - 这里只承载运行参数
    - 不承载模型选择字段
    - 模型选择只允许通过 PromptNodeConfig.modelResourceId 表达
    """

    temperature: float
    timeout: int
    max_retries: int


class NodeOutputSpec(StrictBaseModel):
    """
    节点输出声明。

    字段：
    - name: 节点内部输出端口名
    - stateKey: 发布到 workflow 运行上下文中的 key

    注意：
    - 这里只定义输出 shape
    - output name / stateKey 的唯一性与合法性由 validator 裁决
    """

    name: str
    stateKey: str


class InputNodeConfig(StrictBaseModel):
    """
    input 节点 canonical config。

    当前规则：
    - inputKey: direct run input_state 中读取值时使用的输入名
    - outputs: 发布到 workflow 运行上下文的输出声明
    - validator 负责约束 input 节点只允许 1 个 output
    """

    type: Literal["input"]
    inputKey: str
    outputs: List[NodeOutputSpec]
    defaultValue: str
    comment: str = ""


class PromptNodeConfig(StrictBaseModel):
    """
    prompt 节点 canonical config。

    当前规则：
    - prompt 节点通过 data edges 获取结构化输入变量
    - promptText 是 prompt 正文的唯一 canonical 字段
    - outputs 支持单输出或多输出
    - 模型选择只允许通过 modelResourceId 指向后端统一托管的共享 resource
    - llm 只承载运行参数
    - prompt 节点不再保存窗口来源关系
    - 窗口继承 / 分支关系由顶层 contextLinks 表达

    不负责：
    - 保存 graph-derived inputs
    - 保存旧的 promptMode / prompt / inlinePrompt
    - 保存旧的 prompt.context / sourcePromptNodeId / forkMode 一类历史字段
    """

    type: Literal["prompt"]
    promptText: str
    comment: str = ""
    modelResourceId: str
    llm: LLMConfig
    outputs: List[NodeOutputSpec]


class OutputNodeConfig(StrictBaseModel):
    """
    output 节点 canonical config。

    当前规则：
    - output 节点通过 data edges 接收显式输入
    - validator 负责约束 output 节点只允许 1 个发布 output

    当前限制 / 待收口点：
    - 当前 canonical type 仍使用 "output" 命名
    - 若后续正式迁到 aggregate 语义，这里与前后端类型镜像需要联动调整
    """

    type: Literal["output"]
    outputs: List[NodeOutputSpec]
    comment: str = ""


NodeConfig = InputNodeConfig | PromptNodeConfig | OutputNodeConfig


class WorkflowNode(StrictBaseModel):
    """
    workflow canonical editor model 中的单个节点结构。

    字段组成：
    - id: 节点唯一标识
    - config: 节点业务 config
    - position: 节点在编辑画布中的坐标
    """

    id: str
    config: NodeConfig
    position: Position


class WorkflowEdge(StrictBaseModel):
    """
    workflow canonical editor model 中的单条 data edge。

    字段：
    - source: source 节点 id
    - sourceOutput: source 节点输出端口名
    - target: target 节点 id
    - targetInput: target 节点运行时输入变量名

    正式语义：
    - data edge 只表达数据绑定
    - 只参与 sourceOutput -> targetInput 的输入绑定关系
    - 不表达窗口继承 / 分支
    """

    source: str
    sourceOutput: str
    target: str
    targetInput: str


class WorkflowContextLink(StrictBaseModel):
    """
    workflow canonical editor model 中的单条 context link。

    字段：
    - source: 上游 prompt 节点 id
    - target: 继承 / 分支到的下游 prompt 节点 id
    - mode:
      - continue: 沿来源窗口继续
      - branch: 从来源窗口分支

    正式语义：
    - context link 只表达 prompt -> prompt 的窗口继承 / 分支关系
    - 不参与结构化输入绑定
    - 会参与执行顺序图与 cycle 检查
    - 没有 inbound context link 的 prompt，语义上视为 new_window，
      但 new_window 不作为保存态字段存在
    """

    id: str
    source: str
    target: str
    mode: Literal["continue", "branch"]


class WorkflowEditorData(StrictBaseModel):
    """
    workflow canonical editor model 顶层结构。

    用于：
    - 前端加载 workflow 时接收数据
    - 前端保存 workflow 时提交数据
    - 后端 normalize / validator / engine 围绕同一份 canonical contract 工作

    正式关系模型：
    - nodes: 节点集合
    - edges: data edges，只表达数据绑定
    - contextLinks: context links，只表达窗口继承 / 分支

    注意：
    - workflow 的正式关系由 data edges + contextLinks 两类关系共同表达
    - 其中只有 edges 参与输入绑定
    - contextLinks 不与旧的 PromptNodeConfig.context 并存
    """

    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    contextLinks: List[WorkflowContextLink]