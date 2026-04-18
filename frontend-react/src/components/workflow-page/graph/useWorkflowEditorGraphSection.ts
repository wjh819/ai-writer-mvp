import { useMemo } from 'react'

import { useWorkflowGraphEditor } from '../../../workflow-editor/controllers/useWorkflowGraphEditor'
import type { LiveRunSnapshot } from '../../../run/runTypes'
import type { WorkflowRuntimeState } from '../../../workflow-editor/controllers/useWorkflowRuntime'
import type { WorkflowRunContext } from '../../../workflow-editor/workflowEditorUiTypes'

type GraphSectionRuntimeBindings = Pick<
  WorkflowRuntimeState['subgraphTest'],
  'runningSubgraphTestNodeId'
>

interface UseWorkflowEditorGraphSectionOptions {
  runContext: WorkflowRunContext | null
  activeWorkflowContextId: number
  onGraphSemanticChanged: () => void
  onGraphPersistedChanged: () => void
  onGraphError?: (message: string) => void
  onGraphClearError?: () => void
  onRequestSubgraphTest?: (nodeId: string) => void
  runtime: GraphSectionRuntimeBindings
  isGraphEditingLocked: boolean
  liveRunSnapshot: LiveRunSnapshot | null
}

export function useWorkflowEditorGraphSection({
  runContext,
  activeWorkflowContextId,
  onGraphSemanticChanged,
  onGraphPersistedChanged,
  onGraphError,
  onGraphClearError,
  onRequestSubgraphTest,
  runtime,
  isGraphEditingLocked,
  liveRunSnapshot,
}: UseWorkflowEditorGraphSectionOptions) {
  const runResult = useMemo(() => {
    if (!runContext) {
      return null
    }

    return runContext.workflowContextId === activeWorkflowContextId
      ? runContext.runResult
      : null
  }, [runContext, activeWorkflowContextId])

  const graph = useWorkflowGraphEditor({
    runResult,
    onGraphSemanticChanged,
    onGraphPersistedChanged,
    onGraphError,
    onGraphClearError,
    onRequestSubgraphTest,
    runningSubgraphTestNodeId: runtime.runningSubgraphTestNodeId,
    isGraphEditingLocked,
    liveRunSnapshot,
  })

  return {
    stateBindings: {
      nodes: graph.nodes,
      edges: graph.edges,
      contextLinks: graph.contextLinks,
      selectedNode: graph.selectedNode,
      selectedEdgeId: graph.selectedEdgeId,
    },
    sidebarBindings: {
      addNodeByType: graph.addNodeByType,
      inputNodes: graph.inputNodes,
    },
    canvasBindings: {
      selectedContextEdge: graph.selectedContextEdge,
      displayNodes: graph.displayNodes,
      displayEdges: graph.displayEdges,
      onNodesChange: graph.onNodesChange,
      onConnect: graph.onConnect,
      handleEdgesChange: graph.handleEdgesChange,
      handleEdgeClick: graph.handleEdgeClick,
      handlePaneClick: graph.handlePaneClick,
      handleNodeClick: graph.handleNodeClick,
      handleSelectionChange: graph.handleSelectionChange,
      deleteSelectedEdge: graph.deleteSelectedEdge,
      deleteSelectedContextLink: graph.deleteSelectedContextLink,
      updateSelectedContextLinkMode: graph.updateSelectedContextLinkMode,
    },
    subgraphSectionBindings: {
      updateNode: graph.updateNode,
      deleteNode: graph.deleteNode,
      selectNodeById: graph.selectNodeById,
    },
    dialogBindings: {
      pendingBindingRequest: graph.pendingBindingRequest,
      confirmPendingBinding: graph.confirmPendingBinding,
      cancelPendingBinding: graph.cancelPendingBinding,
    },
    workflowBindings: {
      replaceGraph: graph.replaceGraph,
    },
  }
}

