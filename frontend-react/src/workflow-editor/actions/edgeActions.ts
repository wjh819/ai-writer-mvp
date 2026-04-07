import type { Connection, EdgeChange } from 'reactflow'

import {
    connectContextLinkWithGraphSync,
    connectEdgeWithNodeSync,
    removeEdgesWithNodeSync,
} from '../domain/workflowEditorGraph'
import {
    CONTEXT_SOURCE_HANDLE_ID,
    CONTEXT_TARGET_HANDLE_ID,
    type WorkflowEditorEdge,
    type WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type { GraphActionResult } from './actionTypes'

function getDefaultContextLinkModeForSource(
    contextLinks: WorkflowContextLink[],
    sourceNodeId: string
): 'continue' | 'branch' | null {
    const normalizedSource = String(sourceNodeId || '').trim()

    const outboundModes = (contextLinks || [])
        .filter(link => String(link.source || '').trim() === normalizedSource)
        .map(link => String(link.mode || '').trim())

    const continueCount = outboundModes.filter(mode => mode === 'continue').length

    if (continueCount > 1) {
        return null
    }

    if (outboundModes.length === 0) {
        return 'continue'
    }

    return 'branch'
}

export function buildDeleteSelectedEdgeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    selectedEdgeId: string | null
): GraphActionResult | { error: string } {
    if (!selectedEdgeId) {
        return { error: '' }
    }

    const changes: EdgeChange[] = [{ id: selectedEdgeId, type: 'remove' }]
    const { nextNodes, nextEdges, removedEdges } = removeEdgesWithNodeSync(
        nodes || [],
        edges || [],
        changes
    )

    return {
        nextNodes,
        nextEdges,
        nextContextLinks: contextLinks || [],
        selectedEdgeId: null,
        didChangeSemanticGraph: removedEdges.length > 0,
    }
}

export function buildConnectEdgeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    params: Connection
): GraphActionResult | { error: string } {
    const sourceHandle = String(params.sourceHandle || '').trim()
    const targetHandle = String(params.targetHandle || '').trim()

    const isContextConnect =
        sourceHandle === CONTEXT_SOURCE_HANDLE_ID ||
        targetHandle === CONTEXT_TARGET_HANDLE_ID

    if (isContextConnect) {
        if (
            sourceHandle !== CONTEXT_SOURCE_HANDLE_ID ||
            targetHandle !== CONTEXT_TARGET_HANDLE_ID
        ) {
            return {
                error:
                    'Context link must connect from ctx out handle to ctx in handle',
            }
        }

        const sourceNodeId = String(params.source || '').trim()
        const targetNodeId = String(params.target || '').trim()

        const defaultMode = getDefaultContextLinkModeForSource(
            contextLinks,
            sourceNodeId
        )

        if (!defaultMode) {
            return {
                error: `Prompt node '${sourceNodeId}' cannot add another outbound context link without changing the existing source topology`,
            }
        }

        const {
            nextNodes,
            nextEdges,
            nextContextLinks,
            addedContextLink,
            rejectReason,
        } = connectContextLinkWithGraphSync(nodes || [], edges || [], contextLinks || [], {
            source: sourceNodeId,
            target: targetNodeId,
            mode: defaultMode,
        })

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

    const { nextNodes, nextEdges, nextContextLinks, addedEdge, rejectReason } =
        connectEdgeWithNodeSync(nodes || [], edges || [], contextLinks || [], params)

    if (rejectReason) {
        return { error: rejectReason }
    }

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        didChangeSemanticGraph: Boolean(addedEdge),
    }
}

export function buildEdgesChangeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    changes: EdgeChange[]
): GraphActionResult {
    const { nextNodes, nextEdges, removedEdges } = removeEdgesWithNodeSync(
        nodes || [],
        edges || [],
        changes
    )

    return {
        nextNodes,
        nextEdges,
        nextContextLinks: contextLinks || [],
        didChangeSemanticGraph: removedEdges.length > 0,
    }
}