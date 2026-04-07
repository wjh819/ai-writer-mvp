import { useCallback } from 'react'

import { buildConnectEdgeResult } from '../actions/workflowEditorActions'
import { validateOutputFormat } from '../domain/workflowEditorValidationRules'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type { PendingBindingRequest } from './useWorkflowGraphState'

interface GraphActionLike {
    nextNodes: WorkflowEditorNode[]
    nextEdges: WorkflowEditorEdge[]
    nextContextLinks: WorkflowContextLink[]
    didChangeSemanticGraph: boolean
}

function isGraphActionLike(value: unknown): value is GraphActionLike {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'nextNodes' in value &&
        'nextEdges' in value &&
        'nextContextLinks' in value &&
        'didChangeSemanticGraph' in value
    )
}

interface UseWorkflowPendingBindingOptions {
    pendingBindingRequest: PendingBindingRequest | null
    setPendingBindingRequest: (value: PendingBindingRequest | null) => void

    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]

    setNodes: (value: WorkflowEditorNode[]) => void
    setEdges: (value: WorkflowEditorEdge[]) => void
    setContextLinks: (value: WorkflowContextLink[]) => void

    onGraphSemanticChanged: () => void
    onGraphPersistedChanged: () => void
    onGraphError?: (message: string) => void
    onGraphClearError?: () => void
}

export function useWorkflowPendingBinding({
                                              pendingBindingRequest,
                                              setPendingBindingRequest,
                                              nodes,
                                              edges,
                                              contextLinks,
                                              setNodes,
                                              setEdges,
                                              setContextLinks,
                                              onGraphSemanticChanged,
                                              onGraphPersistedChanged,
                                              onGraphError,
                                              onGraphClearError,
                                          }: UseWorkflowPendingBindingOptions) {
    const confirmPendingBinding = useCallback(
        (targetInput: string): boolean => {
            if (!pendingBindingRequest) {
                return false
            }

            const normalizedTargetInput = targetInput.trim()
            if (!normalizedTargetInput) {
                onGraphError?.('Target input is required')
                return false
            }

            const targetInputError = validateOutputFormat(normalizedTargetInput)
            if (targetInputError) {
                onGraphError?.(`Target input invalid: ${targetInputError}`)
                return false
            }

            const hasSource = nodes.some(
                node => node.id === pendingBindingRequest.source
            )
            const hasTarget = nodes.some(
                node => node.id === pendingBindingRequest.target
            )

            if (!hasSource || !hasTarget) {
                setPendingBindingRequest(null)
                onGraphError?.('Binding target/source no longer exists')
                return false
            }

            const result = buildConnectEdgeResult(nodes, edges, contextLinks, {
                source: pendingBindingRequest.source,
                sourceHandle: pendingBindingRequest.sourceOutput,
                target: pendingBindingRequest.target,
                targetHandle: normalizedTargetInput,
            })

            if (!isGraphActionLike(result)) {
                if (result.error) {
                    onGraphError?.(result.error)
                }
                return false
            }

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setPendingBindingRequest(null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }

            return true
        },
        [
            pendingBindingRequest,
            nodes,
            edges,
            contextLinks,
            setNodes,
            setEdges,
            setContextLinks,
            setPendingBindingRequest,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphError,
            onGraphClearError,
        ]
    )

    const cancelPendingBinding = useCallback(() => {
        setPendingBindingRequest(null)
    }, [setPendingBindingRequest])

    return {
        confirmPendingBinding,
        cancelPendingBinding,
    }
}