import { useCallback } from 'react'
import type {
    Connection,
    EdgeChange,
    NodeChange,
    OnSelectionChangeParams,
} from 'reactflow'
import { applyNodeChanges } from 'reactflow'
import type { MouseEvent as ReactMouseEvent } from 'react'

import {
    buildAddNodeResult,
    buildConnectContextLinkResult,
    buildConnectEdgeResult,
    buildDeleteNodeResult,
    buildDeleteSelectedContextLinkResult,
    buildDeleteSelectedEdgeResult,
    buildEdgesChangeResult,
    buildNodesChangeResult,
    buildUpdateNodeResult,
    buildUpdateSelectedContextLinkModeResult,
} from '../actions/workflowEditorActions'
import {
    CREATE_BINDING_HANDLE_ID,
    type WorkflowEditorEdge,
    type WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type {
    WorkflowContextLink,
    WorkflowNodeType,
} from '../workflowEditorTypes'
import type { PendingBindingRequest } from './useWorkflowGraphState'

interface GraphActionLike {
    nextNodes: WorkflowEditorNode[]
    nextEdges: WorkflowEditorEdge[]
    nextContextLinks: WorkflowContextLink[]
    selectedNodeId?: string | null
    selectedEdgeId?: string | null
    selectedContextLinkId?: string | null
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

function hasChangeId(change: EdgeChange): change is EdgeChange & { id: string } {
    return 'id' in change && typeof change.id === 'string'
}

function isContextSelectionEdge(
    edge: unknown
): edge is { relationType: 'context'; contextLinkId: string } {
    return Boolean(
        edge &&
        typeof edge === 'object' &&
        'relationType' in edge &&
        (edge as { relationType?: unknown }).relationType === 'context' &&
        'contextLinkId' in edge &&
        typeof (edge as { contextLinkId?: unknown }).contextLinkId === 'string'
    )
}

function hasEdgeId(edge: unknown): edge is { id: string } {
    return Boolean(
        edge &&
        typeof edge === 'object' &&
        'id' in edge &&
        typeof (edge as { id?: unknown }).id === 'string'
    )
}

interface UseWorkflowGraphEventsOptions {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]

    selectedNodeId: string | null
    selectedEdgeId: string | null
    selectedContextLinkId: string | null

    setNodes: (value: WorkflowEditorNode[]) => void
    setEdges: (value: WorkflowEditorEdge[]) => void
    setContextLinks: (value: WorkflowContextLink[]) => void

    setSelectedNodeId: (value: string | null) => void
    setSelectedEdgeId: (value: string | null) => void
    setSelectedContextLinkId: (value: string | null) => void
    setPendingBindingRequest: (value: PendingBindingRequest | null) => void

    onGraphSemanticChanged: () => void
    onGraphPersistedChanged: () => void
    onGraphError?: (message: string) => void
    onGraphClearError?: () => void
}

export function useWorkflowGraphEvents({
                                           nodes,
                                           edges,
                                           contextLinks,
                                           selectedNodeId,
                                           selectedEdgeId,
                                           selectedContextLinkId,
                                           setNodes,
                                           setEdges,
                                           setContextLinks,
                                           setSelectedNodeId,
                                           setSelectedEdgeId,
                                           setSelectedContextLinkId,
                                           setPendingBindingRequest,
                                           onGraphSemanticChanged,
                                           onGraphPersistedChanged,
                                           onGraphError,
                                           onGraphClearError,
                                       }: UseWorkflowGraphEventsOptions) {
    const isSemanticNodeChange = useCallback((change: NodeChange) => {
        return change.type === 'remove'
    }, [])

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const semanticChanges = (changes || []).filter(isSemanticNodeChange)
            const viewChanges = (changes || []).filter(
                change => !isSemanticNodeChange(change)
            )

            const hasPositionChange = viewChanges.some(
                change => change.type === 'position'
            )

            const nodesAfterViewChanges =
                viewChanges.length > 0
                    ? (applyNodeChanges(viewChanges, nodes) as WorkflowEditorNode[])
                    : nodes

            if (semanticChanges.length === 0) {
                if (viewChanges.length > 0) {
                    setNodes(nodesAfterViewChanges)
                }

                if (hasPositionChange) {
                    onGraphPersistedChanged()
                }

                return
            }

            const result = buildNodesChangeResult(
                nodesAfterViewChanges,
                edges,
                contextLinks,
                semanticChanges,
                selectedNodeId,
                selectedEdgeId,
                selectedContextLinkId
            )

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setSelectedNodeId(result.selectedNodeId ?? null)
            setSelectedEdgeId(result.selectedEdgeId ?? null)
            setSelectedContextLinkId(result.selectedContextLinkId ?? null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
            }

            onGraphPersistedChanged()
        },
        [
            isSemanticNodeChange,
            nodes,
            edges,
            contextLinks,
            selectedNodeId,
            selectedEdgeId,
            selectedContextLinkId,
            setNodes,
            setEdges,
            setContextLinks,
            setSelectedNodeId,
            setSelectedEdgeId,
            setSelectedContextLinkId,
            onGraphClearError,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
        ]
    )

    const onConnect = useCallback(
        (params: Connection) => {
            if (
                params.source &&
                params.target &&
                params.sourceHandle &&
                params.targetHandle === CREATE_BINDING_HANDLE_ID
            ) {
                onGraphClearError?.()
                setPendingBindingRequest({
                    source: params.source,
                    sourceOutput: params.sourceHandle,
                    target: params.target,
                })
                return
            }

            const result = buildConnectEdgeResult(nodes, edges, contextLinks, params)

            if (!isGraphActionLike(result)) {
                if (result.error) {
                    onGraphError?.(result.error)
                }
                return
            }

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }
        },
        [
            nodes,
            edges,
            contextLinks,
            setPendingBindingRequest,
            setNodes,
            setEdges,
            setContextLinks,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphError,
            onGraphClearError,
        ]
    )

    const createContextLink = useCallback(
        (params: {
            source: string
            target: string
            mode: 'continue' | 'branch'
        }): boolean => {
            const result = buildConnectContextLinkResult(
                nodes,
                edges,
                contextLinks,
                params
            )

            if (!isGraphActionLike(result)) {
                if (result.error) {
                    onGraphError?.(result.error)
                }
                return false
            }

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setSelectedContextLinkId(result.selectedContextLinkId ?? null)
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }

            return true
        },
        [
            nodes,
            edges,
            contextLinks,
            setNodes,
            setEdges,
            setContextLinks,
            setSelectedContextLinkId,
            setSelectedNodeId,
            setSelectedEdgeId,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphError,
            onGraphClearError,
        ]
    )

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const dataEdgeChanges = (changes || []).filter(change => {
                if (!hasChangeId(change)) {
                    return false
                }

                const hit = edges.find(edge => edge.id === change.id)
                return Boolean(hit)
            })

            if (dataEdgeChanges.length === 0) {
                return
            }

            const result = buildEdgesChangeResult(
                nodes,
                edges,
                contextLinks,
                dataEdgeChanges
            )

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }
        },
        [
            nodes,
            edges,
            contextLinks,
            setNodes,
            setEdges,
            setContextLinks,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphClearError,
        ]
    )

    const addNodeByType = useCallback(
        (type: WorkflowNodeType) => {
            const result = buildAddNodeResult(nodes, type)

            setNodes(result.nextNodes)
            setSelectedNodeId(result.selectedNodeId || null)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
            setPendingBindingRequest(null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }
        },
        [
            nodes,
            setNodes,
            setSelectedNodeId,
            setSelectedEdgeId,
            setSelectedContextLinkId,
            setPendingBindingRequest,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphClearError,
        ]
    )

    const updateNode = useCallback(
        (updatedNode: WorkflowEditorNode) => {
            const result = buildUpdateNodeResult(
                nodes,
                edges,
                contextLinks,
                updatedNode
            )

            if (!isGraphActionLike(result)) {
                if (result.error) {
                    onGraphError?.(result.error)
                }
                return
            }

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setSelectedNodeId(result.selectedNodeId || null)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
            }

            onGraphPersistedChanged()
        },
        [
            nodes,
            edges,
            contextLinks,
            setNodes,
            setEdges,
            setContextLinks,
            setSelectedNodeId,
            setSelectedEdgeId,
            setSelectedContextLinkId,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
            onGraphError,
            onGraphClearError,
        ]
    )

    const deleteNode = useCallback(
        (nodeId: string) => {
            const result = buildDeleteNodeResult(
                nodes,
                edges,
                contextLinks,
                nodeId,
                selectedNodeId
            )

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setSelectedNodeId(result.selectedNodeId || null)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }
        },
        [
            nodes,
            edges,
            contextLinks,
            selectedNodeId,
            setNodes,
            setEdges,
            setContextLinks,
            setSelectedNodeId,
            setSelectedEdgeId,
            setSelectedContextLinkId,
            onGraphClearError,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
        ]
    )

    const deleteSelectedEdge = useCallback(() => {
        const result = buildDeleteSelectedEdgeResult(
            nodes,
            edges,
            contextLinks,
            selectedEdgeId
        )

        if (!isGraphActionLike(result)) {
            return
        }

        setNodes(result.nextNodes)
        setEdges(result.nextEdges)
        setContextLinks(result.nextContextLinks)
        setSelectedEdgeId(result.selectedEdgeId ?? null)
        onGraphClearError?.()

        if (result.didChangeSemanticGraph) {
            onGraphSemanticChanged()
            onGraphPersistedChanged()
        }
    }, [
        nodes,
        edges,
        contextLinks,
        selectedEdgeId,
        setNodes,
        setEdges,
        setContextLinks,
        setSelectedEdgeId,
        onGraphClearError,
        onGraphSemanticChanged,
        onGraphPersistedChanged,
    ])

    const deleteSelectedContextLink = useCallback(() => {
        const result = buildDeleteSelectedContextLinkResult(
            nodes,
            edges,
            contextLinks,
            selectedContextLinkId
        )

        if (!isGraphActionLike(result)) {
            return
        }

        setNodes(result.nextNodes)
        setEdges(result.nextEdges)
        setContextLinks(result.nextContextLinks)
        setSelectedContextLinkId(result.selectedContextLinkId ?? null)
        onGraphClearError?.()

        if (result.didChangeSemanticGraph) {
            onGraphSemanticChanged()
            onGraphPersistedChanged()
        }
    }, [
        nodes,
        edges,
        contextLinks,
        selectedContextLinkId,
        setNodes,
        setEdges,
        setContextLinks,
        setSelectedContextLinkId,
        onGraphClearError,
        onGraphSemanticChanged,
        onGraphPersistedChanged,
    ])

    const handleEdgeClick = useCallback(
        (event: ReactMouseEvent, edge: unknown) => {
            event.stopPropagation()

            if (isContextSelectionEdge(edge)) {
                setSelectedContextLinkId(edge.contextLinkId)
                setSelectedEdgeId(null)
                setSelectedNodeId(null)
                return
            }

            setSelectedEdgeId(hasEdgeId(edge) ? edge.id : null)
            setSelectedContextLinkId(null)
            setSelectedNodeId(null)
        },
        [setSelectedContextLinkId, setSelectedEdgeId, setSelectedNodeId]
    )

    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        setSelectedContextLinkId(null)
    }, [setSelectedNodeId, setSelectedEdgeId, setSelectedContextLinkId])

    const handleNodeClick = useCallback(
        (_event: ReactMouseEvent, node: { id: string }) => {
            setSelectedNodeId(node.id)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
        },
        [setSelectedNodeId, setSelectedEdgeId, setSelectedContextLinkId]
    )

    const handleSelectionChange = useCallback(
        ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
            const firstSelectedNode = selectedNodes?.[0] || null
            const firstSelectedEdge = selectedEdges?.[0] || null

            if (firstSelectedNode) {
                setSelectedNodeId(firstSelectedNode.id)
                setSelectedEdgeId(null)
                setSelectedContextLinkId(null)
                return
            }

            if (firstSelectedEdge) {
                if (isContextSelectionEdge(firstSelectedEdge)) {
                    setSelectedNodeId(null)
                    setSelectedEdgeId(null)
                    setSelectedContextLinkId(firstSelectedEdge.contextLinkId)
                    return
                }

                setSelectedNodeId(null)
                setSelectedEdgeId(hasEdgeId(firstSelectedEdge) ? firstSelectedEdge.id : null)
                setSelectedContextLinkId(null)
            }
        },
        [setSelectedNodeId, setSelectedEdgeId, setSelectedContextLinkId]
    )

    const updateSelectedContextLinkMode = useCallback(
        (nextMode: 'continue' | 'branch'): boolean => {
            const result = buildUpdateSelectedContextLinkModeResult(
                nodes,
                edges,
                contextLinks,
                selectedContextLinkId,
                nextMode
            )

            if (!isGraphActionLike(result)) {
                if (result.error) {
                    onGraphError?.(result.error)
                }
                return false
            }

            setNodes(result.nextNodes)
            setEdges(result.nextEdges)
            setContextLinks(result.nextContextLinks)
            setSelectedContextLinkId(result.selectedContextLinkId ?? null)
            onGraphClearError?.()

            if (result.didChangeSemanticGraph) {
                onGraphSemanticChanged()
                onGraphPersistedChanged()
            }

            return true
        },
        [
            nodes,
            edges,
            contextLinks,
            selectedContextLinkId,
            setNodes,
            setEdges,
            setContextLinks,
            setSelectedContextLinkId,
            onGraphError,
            onGraphClearError,
            onGraphSemanticChanged,
            onGraphPersistedChanged,
        ]
    )

    const selectNodeById = useCallback(
        (nodeId: string) => {
            setSelectedNodeId(nodeId || null)
            setSelectedEdgeId(null)
            setSelectedContextLinkId(null)
        },
        [setSelectedNodeId, setSelectedEdgeId, setSelectedContextLinkId]
    )

    return {
        createContextLink,
        onNodesChange: handleNodesChange,
        onConnect,
        handleEdgesChange,
        addNodeByType,
        updateNode,
        deleteNode,
        deleteSelectedEdge,
        deleteSelectedContextLink,
        handleEdgeClick,
        handlePaneClick,
        handleNodeClick,
        handleSelectionChange,
        updateSelectedContextLinkMode,
        selectNodeById,
    }
}