
/**
 * 前端 workflow canonical mirror type 层。
 *
 * 本文件角色：
 * - 镜像后端 workflow canonical contract
 * - 作为 editor domain、API payload 与表单编辑的类型锚点
 *
 * 负责：
 * - 定义节点 config 结构
 * - 定义 WorkflowEditorData / WorkflowContextLink 等前端 mirror types
 *
 * 不负责：
 * - 后端 contract owner
 * - runtime validation
 * - 默认值补齐
 * - graph-derived 字段定义
 *
 * 上下游：
 * - 上游语义以 contracts/workflow_contracts.py 为准
 * - 下游由 config / graph / validators / mappers / forms 消费
 *
 * 当前限制 / 待收口点：
 * - 本文件为手写 mirror types，需与后端 contract 手动同步
 * - new_window 属于运行时/展示语义，不是保存态 WorkflowContextLink.mode
 * - OutputNodeConfig 当前仍使用 output 命名；若未来迁 aggregate，这里需联动调整
 */
export type WorkflowNodeType = 'input' | 'prompt' | 'output'

export interface Position {
    x: number
    y: number
}

export interface LLMConfig {
    /**
     * 只承载运行参数，不承载模型选择；模型选择统一由 modelResourceId 表达。
     */
    temperature: number
    timeout: number
    max_retries: number
}

export interface NodeOutputSpec {
    name: string
    stateKey: string
}

export interface InputNodeConfig {
    type: 'input'
    inputKey: string
    outputs: NodeOutputSpec[]
    defaultValue: string
    comment: string
}

export interface PromptNodeConfig {
    type: 'prompt'
    promptText: string
    comment: string
    modelResourceId: string
    llm: LLMConfig
    outputs: NodeOutputSpec[]
}

export interface OutputNodeConfig {
    type: 'output'
    outputs: NodeOutputSpec[]
    comment: string
}

export type WorkflowNodeConfig =
    | InputNodeConfig
    | PromptNodeConfig
    | OutputNodeConfig

export interface WorkflowNode {
    id: string
    config: WorkflowNodeConfig
    position: Position
}

export interface WorkflowEdge {
    source: string
    sourceOutput: string
    target: string
    targetInput: string
}

export interface WorkflowContextLink {
    /**
     * mode 只有 continue | branch；new_window 由无 inbound context link 的运行时/展示语义推导，不进入保存态。
     */
    id: string
    source: string
    target: string
    mode: 'continue' | 'branch'
}

export interface WorkflowEditorData {
    /**
     * 这里只包含正式保存态的 nodes / edges / contextLinks，不包含 graph-derived inputs、run/session 信息、display 字段。
     */
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    contextLinks: WorkflowContextLink[]
}

export type LLMConfigField = keyof LLMConfig