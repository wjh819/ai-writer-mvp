import type { RunResult } from '../../run/runTypes'
import { useWorkflowGraphEvents } from './useWorkflowGraphEvents'
import { useWorkflowGraphSelection } from './useWorkflowGraphSelection'
import { useWorkflowGraphState } from './useWorkflowGraphState'
import { useWorkflowPendingBinding } from './useWorkflowPendingBinding'

interface UseWorkflowGraphEditorOptions {
    runResult: RunResult | null
    onGraphSemanticChanged: () => void
    onGraphPersistedChanged: () => void
    onGraphError?: (message: string) => void
    onGraphClearError?: () => void

    onRequestSubgraphTest?: (nodeId: string) => void
    runningSubgraphTestNodeId?: string | null
}

export function useWorkflowGraphEditor({
                                           runResult,
                                           onGraphSemanticChanged,
                                           onGraphPersistedChanged,
                                           onGraphError,
                                           onGraphClearError,
                                           onRequestSubgraphTest,
                                           runningSubgraphTestNodeId,
                                       }: UseWorkflowGraphEditorOptions) {
    const graphState = useWorkflowGraphState()

    const graphSelection = useWorkflowGraphSelection({
        nodes: graphState.nodes,
        edges: graphState.edges,
        contextLinks: graphState.contextLinks,

        selectedNodeId: graphState.selectedNodeId,
        selectedEdgeId: graphState.selectedEdgeId,
        selectedContextLinkId: graphState.selectedContextLinkId,

        runResult,
        onRequestSubgraphTest,
        runningSubgraphTestNodeId,
    })

    const pendingBinding = useWorkflowPendingBinding({
        pendingBindingRequest: graphState.pendingBindingRequest,
        setPendingBindingRequest: graphState.setPendingBindingRequest,

        nodes: graphState.nodes,
        edges: graphState.edges,
        contextLinks: graphState.contextLinks,

        setNodes: graphState.setNodes,
        setEdges: graphState.setEdges,
        setContextLinks: graphState.setContextLinks,

        onGraphSemanticChanged,
        onGraphPersistedChanged,
        onGraphError,
        onGraphClearError,
    })

    const graphEvents = useWorkflowGraphEvents({
        nodes: graphState.nodes,
        edges: graphState.edges,
        contextLinks: graphState.contextLinks,

        selectedNodeId: graphState.selectedNodeId,
        selectedEdgeId: graphState.selectedEdgeId,
        selectedContextLinkId: graphState.selectedContextLinkId,

        setNodes: graphState.setNodes,
        setEdges: graphState.setEdges,
        setContextLinks: graphState.setContextLinks,

        setSelectedNodeId: graphState.setSelectedNodeId,
        setSelectedEdgeId: graphState.setSelectedEdgeId,
        setSelectedContextLinkId: graphState.setSelectedContextLinkId,
        setPendingBindingRequest: graphState.setPendingBindingRequest,

        onGraphSemanticChanged,
        onGraphPersistedChanged,
        onGraphError,
        onGraphClearError,
    })

    return {
        nodes: graphState.nodes,
        edges: graphState.edges,
        contextLinks: graphState.contextLinks,

        selectedNode: graphSelection.selectedNode,
        selectedNodeId: graphState.selectedNodeId,
        selectedEdgeId: graphState.selectedEdgeId,
        selectedContextLinkId: graphState.selectedContextLinkId,
        selectedContextEdge: graphSelection.selectedContextEdge,

        inputNodes: graphSelection.inputNodes,
        displayNodes: graphSelection.displayNodes,
        displayEdges: graphSelection.displayEdges,

        pendingBindingRequest: graphState.pendingBindingRequest,
        confirmPendingBinding: pendingBinding.confirmPendingBinding,
        cancelPendingBinding: pendingBinding.cancelPendingBinding,

        createContextLink: graphEvents.createContextLink,
        onNodesChange: graphEvents.onNodesChange,
        onConnect: graphEvents.onConnect,
        handleEdgesChange: graphEvents.handleEdgesChange,
        addNodeByType: graphEvents.addNodeByType,
        updateNode: graphEvents.updateNode,
        deleteNode: graphEvents.deleteNode,
        deleteSelectedEdge: graphEvents.deleteSelectedEdge,
        deleteSelectedContextLink: graphEvents.deleteSelectedContextLink,
        handleEdgeClick: graphEvents.handleEdgeClick,
        handlePaneClick: graphEvents.handlePaneClick,
        handleNodeClick: graphEvents.handleNodeClick,
        handleSelectionChange: graphEvents.handleSelectionChange,
        replaceGraph: graphState.replaceGraph,
        updateSelectedContextLinkMode: graphEvents.updateSelectedContextLinkMode,
        selectNodeById: graphEvents.selectNodeById,
    }
}