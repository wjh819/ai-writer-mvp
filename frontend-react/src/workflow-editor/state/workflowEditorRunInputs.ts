import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'

/**
 * runInputs 派生与迁移辅助层。
 *
 * 本文件角色：
 * - 根据当前 input 节点集合，重建页面持有的 direct run input_state
 *
 * 负责：
 * - 从当前节点中过滤 input 节点
 * - 解析 input 节点在 runInputs 中的 key
 * - 在 inputKey 变化后迁移旧值
 * - 为新增/缺失项补上 defaultValue 或空字符串
 *
 * 不负责：
 * - 输入值语义校验
 * - 触发运行
 * - 判定图语义是否变化
 *
 * 上下游：
 * - 上游来自 controller 持有的当前/旧 inputNodes 与 previousRunInputs
 * - 下游输出新的 runInputs 对象，供 runtime controller / sidebar 使用
 *
 * 当前限制 / 待收口点：
 * - 当前仅按 inputKey / node.id 做值迁移，不理解更复杂的字段重命名历史
 * - inputKey 与 outputs[].stateKey 已正式分层；本文件只面向 direct run input_state
 */

/**
 * 从所有节点中筛出 input 节点。
 *
 * 作用：
 * - 为 runInputs 重建流程提供输入节点集合
 */
export function buildInputNodes(
  nodes: WorkflowEditorNode[]
): WorkflowEditorNode[] {
  return (nodes || []).filter(
    node => (node.data?.config?.type || 'prompt') === 'input'
  )
}

/**
 * 获取某个 input 节点在 runInputs 中对应的 key。
 *
 * 当前优先级：
 * - config.inputKey
 * - node.id
 * - ''
 *
 * 这意味着：
 * - input 节点 direct run request.state 的 key 来自 inputKey
 * - 不再等同于节点 outputs[].stateKey
 */
export function getRunInputKey(node: WorkflowEditorNode): string {
  // direct run input_state 的 key 已正式由 inputKey 表达，
  // 不再等同于 input 节点 outputs[].stateKey。
  const config = node?.data?.config
  if (config?.type !== 'input') {
    return ''
  }
  return config.inputKey || node?.id || ''
}

/**
 * 根据 input 节点集合，重建新的 runInputs。
 *
 * 当前规则：
 * - 优先保留 previousRunInputs 中同名 inputKey 的已有值
 * - 若同一 input 节点仅发生 inputKey 改名，则按 node.id 迁移旧 key 对应值
 * - 否则回退到 input 节点 defaultValue
 * - 再否则回退为空字符串
 *
 * 注意：
 * - 这里只处理页面持有的 direct run inputs 壳
 * - 不表达 workflow 保存态 contract
 * - 不负责校验输入值语义，也不负责触发运行
 * - “是否语义变化”不在这里裁决，这里只做 runInputs 形状与值迁移
 * - 当前 direct run request.state 的 key 由 inputKey 决定，不再等同于 input 节点发布到 workflow state 的 outputs[0].stateKey
 */
export function buildNextRunInputs(
  inputNodes: WorkflowEditorNode[],
  previousRunInputs: WorkflowState = {},
  previousInputNodes: WorkflowEditorNode[] = []
): WorkflowState {
  const next: WorkflowState = {}

  const previousInputNodeMap = new Map<string, WorkflowEditorNode>(
    (previousInputNodes || []).map(node => [node.id, node])
  )

  ;(inputNodes || []).forEach(node => {
    const nextKey = getRunInputKey(node)
    if (!nextKey) {
      return
    }

    const previousNode = previousInputNodeMap.get(node.id)
    const previousKey = previousNode ? getRunInputKey(previousNode) : ''

    if (Object.prototype.hasOwnProperty.call(previousRunInputs, nextKey)) {
      next[nextKey] = previousRunInputs[nextKey]
      return
    }

    if (
      previousKey &&
      previousKey !== nextKey &&
      Object.prototype.hasOwnProperty.call(previousRunInputs, previousKey)
    ) {
      next[nextKey] = previousRunInputs[previousKey]
      return
    }

    const config = node.data?.config
    next[nextKey] =
      config?.type === 'input' ? (config.defaultValue ?? '') : ''
  })

  return next
}