import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'

export interface EdgeClickSelectionResult {
    selectedEdgeId: string | null
    selectedNodeId: null
}

export interface PaneClickSelectionResult {
    selectedNodeId: null
    selectedEdgeId: null
}

export interface NodeClickSelectionResult {
    selectedNodeId: string | null
    selectedEdgeId: null
}

export interface SelectionChangeResult {
    selectedNodeId: string
}

/**
 * 边点击结果。
 *
 * 当前策略：
 * - 选中边
 * - 清空节点选中态
 */
export function buildEdgeClickSelection(
    edge: WorkflowEditorEdge
): EdgeClickSelectionResult {
    return {
        selectedEdgeId: edge?.id || null,
        selectedNodeId: null,
    }
}

/**
 * 画布点击结果。
 *
 * 当前策略：
 * - 清空节点与边的选中态
 */
export function buildPaneClickSelection(): PaneClickSelectionResult {
    return {
        selectedNodeId: null,
        selectedEdgeId: null,
    }
}

/**
 * 节点点击结果。
 *
 * 当前策略：
 * - 选中节点
 * - 清空边选中态
 */
export function buildNodeClickSelection(
    node: WorkflowEditorNode
): NodeClickSelectionResult {
    return {
        selectedNodeId: node?.id || null,
        selectedEdgeId: null,
    }
}

/**
 * ReactFlow selection change 的单选收敛结果。
 *
 * 当前正式规则：
 * - 若没有选中节点，返回 null
 * - 若 selection change 中包含多个节点，只收敛第一个节点 id
 *
 * 注意：
 * - 当前编辑器正式只支持单选
 * - 本函数不是“多选兼容兜底”，而是把 ReactFlow 的 selection 事件
 *   收敛为当前系统唯一允许的单选结果
 */
export function buildSelectionChangeResult(
    selectedNodes: WorkflowEditorNode[] = []
): SelectionChangeResult | null {
    if (!Array.isArray(selectedNodes) || selectedNodes.length === 0) {
        return null
    }

    return {
        selectedNodeId: selectedNodes[0].id,
    }
}