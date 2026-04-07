import { useCallback, useState } from 'react'

import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'

export interface PendingBindingRequest {
    source: string
    sourceOutput: string
    target: string
}

export function useWorkflowGraphState() {
    const [nodes, setNodes] = useState<WorkflowEditorNode[]>([])
    const [edges, setEdges] = useState<WorkflowEditorEdge[]>([])
    const [contextLinks, setContextLinks] = useState<WorkflowContextLink[]>([])
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
    const [selectedContextLinkId, setSelectedContextLinkId] = useState<
        string | null
    >(null)
    const [pendingBindingRequest, setPendingBindingRequest] =
        useState<PendingBindingRequest | null>(null)

    const replaceGraph = useCallback(
        (
            nextNodes: WorkflowEditorNode[],
            nextEdges: WorkflowEditorEdge[],
            nextContextLinks: WorkflowContextLink[]
        ) => {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
            setPendingBindingRequest(null)
            setNodes(nextNodes)
            setEdges(nextEdges)
            setContextLinks(nextContextLinks)
        },
        []
    )

    return {
        nodes,
        setNodes,
        edges,
        setEdges,
        contextLinks,
        setContextLinks,

        selectedNodeId,
        setSelectedNodeId,
        selectedEdgeId,
        setSelectedEdgeId,
        selectedContextLinkId,
        setSelectedContextLinkId,

        pendingBindingRequest,
        setPendingBindingRequest,

        replaceGraph,
    }
}