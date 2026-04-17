import { useCallback, useRef, useState } from 'react'

import { useWorkflowRuntime } from '../../workflow-editor/controllers/useWorkflowRuntime'
import { useWorkflowEditorCanvasSection } from './useWorkflowEditorCanvasSection'
import {
  useWorkflowEditorDisplayRunSection,
  useWorkflowEditorDisplayRunState,
} from './useWorkflowEditorDisplayRunSection'
import { useWorkflowEditorGraphSection } from './useWorkflowEditorGraphSection'
import { useWorkflowEditorRunSection } from './useWorkflowEditorRunSection'
import { useWorkflowEditorSubgraphTestSection } from './useWorkflowEditorSubgraphTestSection'
import { useWorkflowDialogsState } from './useWorkflowDialogsState'
import { useWorkflowPanels } from './useWorkflowPanels'
import type { useWorkflowPageContext } from './useWorkflowPageContext'

type WorkflowPageContext = ReturnType<typeof useWorkflowPageContext>

interface UseWorkflowEditorPageAssemblerOptions {
  pageContext: WorkflowPageContext
}

export function useWorkflowEditorPageAssembler({
  pageContext,
}: UseWorkflowEditorPageAssemblerOptions) {
  const {
    canvasState,
    canvasActions: pageCanvasActions,
    graphState,
    graphActions,
    pageState,
    pageActions,
  } = pageContext

  const {
    requestedCanvasId,
    activeCanvasId,
    activeWorkflowContextId,
    temporaryCanvasId,
  } = canvasState
  const {
    setRequestedCanvasId,
    setActiveCanvasId,
    setActiveWorkflowContextId,
    setTemporaryCanvasId,
  } = pageCanvasActions
  const { graphSemanticVersion, graphPersistedVersion, isGraphDirty } = graphState
  const {
    setGraphSemanticVersion,
    setGraphPersistedVersion,
    setCommittedGraphPersistedVersion,
    handleGraphSemanticChanged,
    handleGraphPersistedChanged,
  } = graphActions
  const {
    workflowWarnings,
    pageErrorMessage,
    isSwitchingWorkflow,
    isModelResourcePanelOpen,
  } = pageState
  const {
    setWorkflowWarnings,
    setPageErrorMessage,
    clearPageError,
    setIsSwitchingWorkflow,
    setIsModelResourcePanelOpen,
  } = pageActions

  const [batchInputText, setBatchInputText] = useState('')
  const [batchMaxParallel, setBatchMaxParallel] = useState(4)

  const runtime = useWorkflowRuntime()
  const graphRuntime = runtime.graphRuntime ?? {
    runInputs: runtime.runInputs,
    subgraphTest: runtime.subgraphTest,
  }
  const runExecutionRuntime = runtime.runExecutionRuntime ?? {
    runExecution: runtime.runExecution,
  }
  const sidecarAssetsRuntime = runtime.sidecarAssetsRuntime ?? {
    sidecar: runtime.sidecar,
  }
  const refreshModelResources = runtime.bootstrap.refreshModelResources

  const displayRunSection = useWorkflowEditorDisplayRunSection({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    runtimeActions: runExecutionRuntime.runExecution,
  })

  // This bridge stays at assembler level because graph and subgraph sections are
  // intentionally composed as peers, and the callback wiring is cyclical.
  const requestSubgraphTestFromCanvasRef = useRef<(nodeId: string) => void>(() => {
    // no-op until subgraph section has been initialized
  })
  const handleRequestSubgraphTestFromCanvas = useCallback((nodeId: string) => {
    requestSubgraphTestFromCanvasRef.current(nodeId)
  }, [])

  const graphSection = useWorkflowEditorGraphSection({
    runContext: displayRunSection.state.runContext,
    activeWorkflowContextId,
    onGraphSemanticChanged: handleGraphSemanticChanged,
    onGraphPersistedChanged: handleGraphPersistedChanged,
    onGraphError: setPageErrorMessage,
    onGraphClearError: clearPageError,
    onRequestSubgraphTest: handleRequestSubgraphTestFromCanvas,
    runtime: {
      runningSubgraphTestNodeId:
        graphRuntime.subgraphTest.runningSubgraphTestNodeId,
    },
    isGraphEditingLocked: displayRunSection.status.isGraphEditingLocked,
    liveRunSnapshot: displayRunSection.state.activeLiveRunSnapshot,
  })

  const { nodes, edges, contextLinks, selectedNode, selectedEdgeId } =
    graphSection.stateBindings

  const displayRunState = useWorkflowEditorDisplayRunState({
    nodes,
    selectedNode,
    displayNodes: graphSection.canvasBindings.displayNodes,
    edges,
    selectedEdgeId,
    workflowWarnings,
    runtime: runtime.bootstrap,
    pageErrorMessage,
    isGraphDirty,
    isLiveRunActive: displayRunSection.status.isLiveRunActive,
    activeLiveRunSnapshot: displayRunSection.state.activeLiveRunSnapshot,
    selectedBatchDisplayRun: displayRunSection.state.selectedBatchDisplayRun,
    batchSummary: displayRunSection.state.batchSummary,
    displayRun: displayRunSection.state.displayRun,
    isBatchResultStale: displayRunSection.state.isBatchResultStale,
    isBatchCancelRequested: displayRunSection.status.isBatchCancelRequested,
    selectedBatchItemId: displayRunSection.state.selectedBatchItemId,
    lastPollErrorMessage: displayRunSection.state.lastPollErrorMessage,
    batchLastPollErrorMessage: displayRunSection.state.batchLastPollErrorMessage,
  })

  const subgraphTestSection = useWorkflowEditorSubgraphTestSection({
    graph: {
      activeCanvasId,
      graphSemanticVersion,
      nodes: graphSection.stateBindings.nodes,
      edges: graphSection.stateBindings.edges,
      contextLinks: graphSection.stateBindings.contextLinks,
      selectedNode: graphSection.stateBindings.selectedNode,
    },
    callbacks: {
      clearPageError,
      onGraphPersistedChanged: handleGraphPersistedChanged,
      selectNodeById: graphSection.subgraphSectionBindings.selectNodeById,
    },
    runtime: {
      subgraphTest: graphRuntime.subgraphTest,
      sidecar: sidecarAssetsRuntime.sidecar,
    },
    runStatus: {
      isLiveRunActive: displayRunSection.status.isLiveRunActive,
      isBatchRunActive: displayRunSection.status.isBatchRunActive,
    },
  })

  requestSubgraphTestFromCanvasRef.current =
    subgraphTestSection.requestSubgraphTestFromCanvas

  const canvasSection = useWorkflowEditorCanvasSection({
    requestedCanvasId,
    setRequestedCanvasId,
    activeCanvasId,
    setActiveCanvasId,
    setActiveWorkflowContextId,
    temporaryCanvasId,
    setTemporaryCanvasId,
    nodes,
    edges,
    contextLinks,

    graphPersistedVersion,
    isGraphDirty,
    runtime: {
      bootstrap: runtime.bootstrap,
      persistence: runtime.persistence,
      sidecar: sidecarAssetsRuntime.sidecar,
      runInputs: graphRuntime.runInputs,
    },

    clearPageError,
    setPageErrorMessage,
    setWorkflowWarnings,
    setIsSwitchingWorkflow,
    setCommittedGraphPersistedVersion,

    replaceGraph: graphSection.workflowBindings.replaceGraph,
    resetSubgraphTestSectionForCommittedWorkflow:
      subgraphTestSection.resetSubgraphTestSectionForCommittedWorkflow,
    setGraphSemanticVersion,
    setGraphPersistedVersion,
    clearLiveRunState: displayRunSection.actions.clearLiveRunState,
    clearBatchRunState: displayRunSection.actions.clearBatchRunState,
    clearRunState: displayRunSection.actions.clearRunState,
    setBatchInputText,
    setBatchMaxParallel,

    isGraphEditingLocked: displayRunSection.status.isGraphEditingLocked,
  })

  const runSection = useWorkflowEditorRunSection({
    nodes,
    edges,
    contextLinks,
    inputNodes: graphSection.sidebarBindings.inputNodes,
    runtime: graphRuntime.runInputs,
    batchInputText,
    batchMaxParallel,
    setPageErrorMessage,
    startLiveRun: displayRunSection.actions.startLiveRun,
    startBatchRun: displayRunSection.actions.startBatchRun,
    cancelBatchRun: displayRunSection.actions.cancelBatchRun,
  })

  const handleBatchMaxParallelChange = useCallback(
    (value: number) => {
      setBatchMaxParallel(Math.min(4, Math.max(1, value || 1)))
    },
    [setBatchMaxParallel]
  )

  const handleModelResourcesChanged = useCallback(async () => {
    const result = await refreshModelResources()
    if (result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
      throw new Error(result.errorMessage)
    }
  }, [refreshModelResources, setPageErrorMessage])

  const panels = useWorkflowPanels({
    canvas: {
      requestedCanvasId,
      activeCanvasId,
      temporaryCanvasId,
      isSwitchingWorkflow,
      isLoadingWorkflow: runtime.persistence.isLoadingWorkflow,
    },
    runtime: {
      canvasList: runtime.bootstrap.canvasList,
      modelResources: runtime.bootstrap.modelResources,
      runInputs: graphRuntime.runInputs.runInputs,
      updateRunInput: graphRuntime.runInputs.updateRunInput,
      batchInputText,
      onBatchInputTextChange: setBatchInputText,
      batchMaxParallel,
      onBatchMaxParallelChange: handleBatchMaxParallelChange,
    },
    pageStatus: {
      isModelResourcePanelOpen,
      setIsModelResourcePanelOpen,
      isSaving: runtime.persistence.isSaving,
      isRunning: runtime.persistence.isRunning,
      isDeleting: runtime.persistence.isDeleting,
    },
    actions: {
      onModelResourcesChanged: handleModelResourcesChanged,
    },
    sections: {
      canvasSection,
      displayRunSection,
      displayRunState,
      graphSection,
      subgraphTestSection,
      runActions: runSection.actions,
    },
  })

  const dialogs = useWorkflowDialogsState({
    canvasDialogs: canvasSection.dialogs,
    graphDialogBindings: graphSection.dialogBindings,
    isGraphEditingLocked: displayRunSection.status.isGraphEditingLocked,
  })

  return {
    pageShellProps: {
      panels,
      dialogs,
    },
  }
}
