import type {
  InputNodeConfig,
  NodeOutputSpec,
  OutputNodeConfig,
  PromptNodeConfig,
  WorkflowNodeConfig,
  WorkflowNodeType,
} from '../workflowEditorTypes'
import { buildDefaultOutput, getDefaultLLMConfig } from './workflowEditorHelpers'

/**
 * 前端节点 config 的 UI 初始值工厂层。
 *
 * 本文件角色：
 * - 为新建节点提供前端编辑期初始建议值
 *
 * 负责：
 * - 按节点类型生成 UI 初始 config
 *
 * 不负责：
 * - 后端正式默认值定义
 * - 正式 contract normalize
 * - 非法值修复
 * - 编辑态字段收敛
 * - 保存态语义裁决
 *
 * 上下游：
 * - 上游由 node factory 触发
 * - 下游由 nodeFactory、controller、表单编辑继续消费
 *
 * 当前限制 / 待收口点：
 * - prompt 新节点默认是“未配置完成态”，不是可直接保存态
 * - modelResourceId 缺省为空字符串，表示尚未完成资源选择
 * - llm 默认值只属于前端 UI 初始建议值，不应被误认为后端正式默认值
 * - 窗口关系不在节点 config 内保存，统一由顶层 contextLinks 表达
 */

function buildDefaultOutputSpecs(
  type: WorkflowNodeType,
  nodeId: string
): NodeOutputSpec[] {
  if (type === 'input') {
    return [
      {
        name: 'value',
        stateKey: buildDefaultOutput(nodeId),
      },
    ]
  }

  return [
    {
      name: 'result',
      stateKey: buildDefaultOutput(nodeId),
    },
  ]
}

/**
 * 创建新节点的前端 UI 初始 config。
 *
 * 输入：
 * - type：节点类型
 * - nodeId：当前新节点 id
 *
 * 输出：
 * - 当前前端编辑期使用的初始 config
 *
 * 正式口径：
 * - 这里只服务“新建节点后能进入编辑态”
 * - 返回值必须符合当前前端 mirror contract 形状
 *
 * 不负责：
 * - 生成可直接保存的完整业务配置
 * - 代表后端正式默认值
 *
 * 注意：
 * - prompt 节点初始为未配置完成态：prompt 为空、modelResourceId 为空
 */
export function createInitialWorkflowNodeConfig(
  type: WorkflowNodeType,
  nodeId: string
): WorkflowNodeConfig {
  if (type === 'input') {
    const config: InputNodeConfig = {
      type: 'input',
      inputKey: nodeId,
      outputs: buildDefaultOutputSpecs(type, nodeId),
      defaultValue: '',
      comment: '',
    }
    return config
  }

  if (type === 'output') {
    const config: OutputNodeConfig = {
      type: 'output',
      outputs: buildDefaultOutputSpecs(type, nodeId),
      comment: '',
    }
    return config
  }

  const config: PromptNodeConfig = {
    type: 'prompt',
    promptText: '',
    comment: '',
    modelResourceId: '',
    llm: getDefaultLLMConfig(),
    outputs: buildDefaultOutputSpecs(type, nodeId),
  }

  return config
}