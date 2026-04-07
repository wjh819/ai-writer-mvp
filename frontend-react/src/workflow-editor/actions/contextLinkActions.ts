import {
    connectContextLinkWithGraphSync,
    deleteContextLinkInGraph,
    updateContextLinkModeInGraph,
} from '../domain/workflowEditorGraph'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type { GraphActionResult } from './actionTypes'

export function buildDeleteSelectedContextLinkResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    selectedContextLinkId: string | null
): GraphActionResult | { error: string } {
    if (!selectedContextLinkId) {
        return { error: '' }
    }

    const { nextContextLinks } = deleteContextLinkInGraph(
        contextLinks || [],
        selectedContextLinkId
    )

    return {
        nextNodes: nodes || [],
        nextEdges: edges || [],
        nextContextLinks,
        selectedContextLinkId: null,
        didChangeSemanticGraph:
            nextContextLinks.length !== (contextLinks || []).length,
    }
}

export function buildConnectContextLinkResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    params: {
        source: string
        target: string
        mode: 'continue' | 'branch'
    }
): GraphActionResult | { error: string } {
    const {
        nextNodes,
        nextEdges,
        nextContextLinks,
        addedContextLink,
        rejectReason,
    } = connectContextLinkWithGraphSync(
        nodes || [],
        edges || [],
        contextLinks || [],
        params
    )

    if (rejectReason) {
        return { error: rejectReason }
    }

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        selectedContextLinkId: addedContextLink?.id || null,
        didChangeSemanticGraph: Boolean(addedContextLink),
    }
}

export function buildUpdateSelectedContextLinkModeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    selectedContextLinkId: string | null,
    nextMode: 'continue' | 'branch'
): GraphActionResult | { error: string } {
    if (!selectedContextLinkId) {
        return { error: 'No context link selected' }
    }

    const currentLink = (contextLinks || []).find(
        link => link.id === selectedContextLinkId
    )

    if (!currentLink) {
        return { error: `Context link not found: ${selectedContextLinkId}` }
    }

    if (currentLink.mode === nextMode) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            selectedContextLinkId,
            didChangeSemanticGraph: false,
        }
    }

    const { nextContextLinks, updatedContextLink, rejectReason } =
        updateContextLinkModeInGraph(
            contextLinks || [],
            selectedContextLinkId,
            nextMode
        )

    if (rejectReason) {
        return { error: rejectReason }
    }

    return {
        nextNodes: nodes || [],
        nextEdges: edges || [],
        nextContextLinks,
        selectedContextLinkId: updatedContextLink?.id || selectedContextLinkId,
        didChangeSemanticGraph: true,
    }
}