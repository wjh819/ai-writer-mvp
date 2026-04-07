import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'

/**
 * 根据 selectedNodeId 找到当前选中节点实体。
 *
 * 作用：
 * - 让上层在仅持有选中 id 时，能够取回对应节点对象
 */
export function buildSelectedNode(
    nodes: WorkflowEditorNode[],
    selectedNodeId: string | null
): WorkflowEditorNode | null {
    return (nodes || []).find(node => node.id === selectedNodeId) || null
}