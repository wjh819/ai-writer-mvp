import type { WorkflowNodeType } from '../workflowEditorTypes'
import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'
import { createInitialWorkflowNodeConfig } from './workflowEditorConfig'

/**
 * 创建新的前端编辑态节点壳。
 *
 * 注意：
 * - 新节点 id 由前端工厂统一生成，当前生成规则需满足正式 node id 规则
 * - node.id 创建后即视为正式 contract 中的稳定节点标识，不提供前端改名入口
 * - prompt 节点的 node.id 会直接作为 prompt 正文文件名主体：<node-id>.prompt.md
 * - position 仍只服务当前编辑器画布布局，不承载运行语义
 */
export function createNodeByType(
  nodes: WorkflowEditorNode[],
  type: WorkflowNodeType
): WorkflowEditorNode {
  const baseName =
    type === 'input'
      ? 'input_node'
      : type === 'output'
        ? 'output_node'
        : 'prompt_node'

  let count = 1
  let nextId = `${baseName}_${count}`

  while ((nodes || []).some(node => node.id === nextId)) {
    count += 1
    nextId = `${baseName}_${count}`
  }

  return {
    id: nextId,
    type: 'workflowNode',
    position: { x: 150 + count * 20, y: 100 + count * 20 },
    data: {
      config: createInitialWorkflowNodeConfig(type, nextId),
    },
  }
}