import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { validatePromptContextModelConsistency } from './contextLinkRules'
import {
    buildOutputRenamePlan,
    isOutputReferenced,
    isPromptNode,
    syncOutboundEdgesForOutputRename,
} from './graphHelpers'
import { removeContextLinksWithNodeSync } from './graphRemoval'

/**
 * 在单节点 config 已更新的前提下，执行图层联动同步。
 *
 * 负责：
 * - 检查被引用 output 是否被非法删除
 * - 同步 output rename 对 outbound edges 的影响
 * - 在节点不再是 prompt 时清除相关 contextLinks
 * - 在节点仍是 prompt 时检查局部 context model consistency
 *
 * 不负责：
 * - 节点 config 自身的 normalize
 * - 保存前全图合法性裁决
 *
 * 注意：
 * - 本函数返回 rejectReason 时，应由上层放弃本次节点更新
 */
export function applyUpdatedNodeInGraph(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    normalizedNode: WorkflowEditorNode
) {
    const previousNode = (nodes || []).find(node => node.id === normalizedNode.id)

    const { renameMap, removedReferencedOutputName } = buildOutputRenamePlan(
        previousNode,
        normalizedNode
    )

    if (
        removedReferencedOutputName &&
        isOutputReferenced(edges || [], normalizedNode.id, removedReferencedOutputName)
    ) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            rejectReason: `Cannot remove output '${removedReferencedOutputName}' because it is still referenced by outbound bindings`,
        }
    }

    const nextNodes = (nodes || []).map(node =>
        node.id === normalizedNode.id ? normalizedNode : node
    )

    const nextEdges = syncOutboundEdgesForOutputRename(
        edges || [],
        normalizedNode.id,
        renameMap
    )

    let nextContextLinks = contextLinks || []

    if (!isPromptNode(normalizedNode)) {
        nextContextLinks = removeContextLinksWithNodeSync(
            nextContextLinks,
            normalizedNode.id
        )
    } else {
        const contextConsistencyError = validatePromptContextModelConsistency(
            nextNodes,
            nextContextLinks,
            normalizedNode
        )

        if (contextConsistencyError) {
            return {
                nextNodes: nodes || [],
                nextEdges: edges || [],
                nextContextLinks: contextLinks || [],
                rejectReason: contextConsistencyError,
            }
        }
    }

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        rejectReason: undefined,
    }
}