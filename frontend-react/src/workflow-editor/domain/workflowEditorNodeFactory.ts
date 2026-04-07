import type { WorkflowNodeType } from '../workflowEditorTypes'
import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'
import { createInitialWorkflowNodeConfig } from './workflowEditorConfig'

/**
 * 创建新的前端编辑态节点壳。
 *
 * 注意：
 * - 新节点 id 与 position 都只服务当前编辑器壳
 * - 不应被视为持久化层或业务层的正式命名 / 布局规则
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