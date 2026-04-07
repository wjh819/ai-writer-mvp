import { applyNodeChanges } from 'reactflow'
import type { NodeChange } from 'reactflow'

import { removeNodesWithGraphSync } from '../domain/workflowEditorGraph'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type { GraphActionResult } from './actionTypes'

export function buildNodesChangeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    changes: NodeChange[],
    selectedNodeId: string | null,
    selectedEdgeId: string | null,
    selectedContextLinkId: string | null
): GraphActionResult {
    let nextNodes = nodes || []
    let nextEdges = edges || []
    let nextContextLinks = contextLinks || []
    let nextSelectedNodeId = selectedNodeId
    let nextSelectedEdgeId = selectedEdgeId
    let nextSelectedContextLinkId = selectedContextLinkId
    let didChangeSemanticGraph = false

    ;(changes || []).forEach(change => {
        if (change.type === 'add') {
            nextNodes = applyNodeChanges([change], nextNodes) as WorkflowEditorNode[]
            didChangeSemanticGraph = true
            return
        }

        if (change.type === 'position') {
            nextNodes = applyNodeChanges([change], nextNodes) as WorkflowEditorNode[]
            return
        }

        if (change.type === 'remove') {
            const result = removeNodesWithGraphSync(
                nextNodes,
                nextEdges,
                nextContextLinks,
                [change]
            )

            nextNodes = result.nextNodes
            nextEdges = result.nextEdges
            nextContextLinks = result.nextContextLinks
            didChangeSemanticGraph = true

            if (
                nextSelectedNodeId &&
                result.removedNodeIds.includes(nextSelectedNodeId)
            ) {
                nextSelectedNodeId = null
            }

            if (
                nextSelectedEdgeId &&
                !nextEdges.some(edge => edge.id === nextSelectedEdgeId)
            ) {
                nextSelectedEdgeId = null
            }

            if (
                nextSelectedContextLinkId &&
                !nextContextLinks.some(link => link.id === nextSelectedContextLinkId)
            ) {
                nextSelectedContextLinkId = null
            }
        }
    })

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        selectedNodeId: nextSelectedNodeId,
        selectedEdgeId: nextSelectedEdgeId,
        selectedContextLinkId: nextSelectedContextLinkId,
        didChangeSemanticGraph,
    }
}