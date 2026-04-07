import type { EdgeChange, NodeChange } from 'reactflow'
import { applyEdgeChanges } from 'reactflow'

import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { trim } from './graphHelpers'

export function deleteContextLinkInGraph(
    contextLinks: WorkflowContextLink[],
    contextLinkId: string
) {
    const nextContextLinks = (contextLinks || []).filter(
        link => trim(link.id) !== trim(contextLinkId)
    )

    return {
        nextContextLinks,
    }
}

export function removeEdgesWithNodeSync(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    changes: EdgeChange[]
) {
    const removedEdges = (changes || [])
        .filter(change => change.type === 'remove')
        .map(change => (edges || []).find(edge => edge.id === change.id))
        .filter((edge): edge is WorkflowEditorEdge => Boolean(edge))

    const nextEdges = applyEdgeChanges(
        changes || [],
        edges || []
    ) as WorkflowEditorEdge[]

    return {
        nextNodes: nodes || [],
        nextEdges,
        removedEdges,
    }
}

export function removeContextLinksWithNodeSync(
    contextLinks: WorkflowContextLink[],
    nodeId: string
) {
    return (contextLinks || []).filter(link => {
        return (
            trim(link.source) !== trim(nodeId) && trim(link.target) !== trim(nodeId)
        )
    })
}

export function removeNodesWithGraphSync(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    changes: NodeChange[]
) {
    let nextNodes = nodes || []
    let nextEdges = edges || []
    let nextContextLinks = contextLinks || []
    const removedNodeIds: string[] = []

    ;(changes || [])
        .filter(change => change.type === 'remove')
        .forEach(change => {
            removedNodeIds.push(change.id)

            const result = deleteNodeInGraph(
                nextNodes,
                nextEdges,
                nextContextLinks,
                change.id
            )
            nextNodes = result.nextNodes
            nextEdges = result.nextEdges
            nextContextLinks = result.nextContextLinks
        })

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        removedNodeIds,
    }
}

export function deleteNodeInGraph(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    nodeId: string
) {
    const nextNodes = (nodes || []).filter(node => node.id !== nodeId)
    const nextEdges = (edges || []).filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
    )
    const nextContextLinks = removeContextLinksWithNodeSync(
        contextLinks || [],
        nodeId
    )

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
    }
}