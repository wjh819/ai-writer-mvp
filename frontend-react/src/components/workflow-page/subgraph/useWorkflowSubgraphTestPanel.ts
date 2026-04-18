import { useSubgraphPinnedInputs } from './useSubgraphPinnedInputs'
import { useSubgraphTestInvalidation } from './useSubgraphTestInvalidation'
import { useSubgraphTestPanelLifecycle } from './useSubgraphTestPanelLifecycle'
import { useSubgraphTestPanelState } from './useSubgraphTestPanelState'
import { useSubgraphTestRunner } from './useSubgraphTestRunner'
import type {
  UseWorkflowSubgraphTestPanelOptions,
  UseWorkflowSubgraphTestPanelResult,
} from './subgraphTestPanelTypes'

const NODE_TEST_LOCK_MESSAGE =
  'Node test is disabled while a full run or batch run is active.'

export function useWorkflowSubgraphTestPanel({
  graph,
  panelState,
  callbacks,
  runtime,
  locking,
}: UseWorkflowSubgraphTestPanelOptions): UseWorkflowSubgraphTestPanelResult {
  const {
    feedback,
    requestSubgraphTestFromCanvas,
    resetSubgraphTestPanelView,
  } = useSubgraphTestPanelState({
    requestedSubgraphTestNodeId: panelState.requestedSubgraphTestNodeId,
    setRequestedSubgraphTestNodeId: panelState.setRequestedSubgraphTestNodeId,
    isSubgraphTestPanelExpanded: panelState.isSubgraphTestPanelExpanded,
    setIsSubgraphTestPanelExpanded: panelState.setIsSubgraphTestPanelExpanded,
    selectNodeById: callbacks.selectNodeById,
    clearPageError: callbacks.clearPageError,
    isNodeTestLocked: locking.isNodeTestLocked,
    nodeTestLockMessage: NODE_TEST_LOCK_MESSAGE,
  })

  const { commitSemanticGraphSnapshot } = useSubgraphTestInvalidation({
    graphSemanticVersion: graph.graphSemanticVersion,
    nodes: graph.nodes,
    edges: graph.edges,
    contextLinks: graph.contextLinks,
    subgraphTestResultsByNodeId: runtime.state.subgraphTestResultsByNodeId,
    subgraphTestState: runtime.state.subgraphTestState,
    activeSubgraphTestResult: runtime.state.activeSubgraphTestResult,
    activeSubgraphTestStartNodeId: runtime.state.activeSubgraphTestStartNodeId,
    lastSuccessfulSubgraphTestStartNodeId:
      runtime.state.lastSuccessfulSubgraphTestStartNodeId,
    markSubgraphTestResultStale: runtime.actions.markSubgraphTestResultStale,
    resetSubgraphTestState: runtime.actions.resetSubgraphTestState,
    feedback,
  })

  const {
    effectiveSubgraphTestInputItems,
    currentPinnedInputDraftTexts,
    handlePinnedInputDraftChange,
  } = useSubgraphPinnedInputs({
    selectedNode: graph.selectedNode,
    nodes: graph.nodes,
    edges: graph.edges,
    subgraphTestState: runtime.state.subgraphTestState,
    isNodeTestLocked: locking.isNodeTestLocked,
    nodeTestLockMessage: NODE_TEST_LOCK_MESSAGE,
    getWorkflowSidecarNodeAssets: runtime.sidecar.getWorkflowSidecarNodeAssets,
    updateWorkflowSidecarNodeAssets:
      runtime.sidecar.updateWorkflowSidecarNodeAssets,
    onGraphPersistedChanged: callbacks.onGraphPersistedChanged,
    markSubgraphTestResultStale: runtime.actions.markSubgraphTestResultStale,
    feedback,
  })

  const {
    selectedSubgraphTestDisplayRun,
    handleRunSelectedSubgraphTest,
    handleClearSelectedSubgraphTestResult,
    handleResetSubgraphTestReusableContext,
  } = useSubgraphTestRunner({
    activeCanvasId: graph.activeCanvasId,
    nodes: graph.nodes,
    edges: graph.edges,
    contextLinks: graph.contextLinks,
    selectedNode: graph.selectedNode,
    subgraphTestState: runtime.state.subgraphTestState,
    activeSubgraphTestResult: runtime.state.activeSubgraphTestResult,
    activeSubgraphTestStartNodeId: runtime.state.activeSubgraphTestStartNodeId,
    subgraphTestResultsByNodeId: runtime.state.subgraphTestResultsByNodeId,
    staleSubgraphTestResultIds: runtime.state.staleSubgraphTestResultIds,
    effectiveSubgraphTestInputItems,
    isNodeTestLocked: locking.isNodeTestLocked,
    nodeTestLockMessage: NODE_TEST_LOCK_MESSAGE,
    clearPageError: callbacks.clearPageError,
    feedback,
    clearSubgraphTestResultStale: runtime.actions.clearSubgraphTestResultStale,
    handleRunSubgraphTest: runtime.actions.handleRunSubgraphTest,
    clearSubgraphTestResult: runtime.actions.clearSubgraphTestResult,
    resetSubgraphTestState: runtime.actions.resetSubgraphTestState,
  })

  useSubgraphTestPanelLifecycle({
    nodes: graph.nodes,
    selectedNodeId: graph.selectedNode?.id || null,
    pruneSubgraphTestArtifacts: runtime.actions.pruneSubgraphTestArtifacts,
    pruneWorkflowSidecar: runtime.sidecar.pruneWorkflowSidecar,
    clearSubgraphTestFeedback: feedback.clear,
  })

  return {
    panelState: {
      isSubgraphTestPanelExpanded: panelState.isSubgraphTestPanelExpanded,
      setIsSubgraphTestPanelExpanded: panelState.setIsSubgraphTestPanelExpanded,
      requestSubgraphTestFromCanvas,
      resetSubgraphTestPanelView,
      isSubgraphTestLocked: locking.isNodeTestLocked,
    },
    feedback: {
      subgraphTestPanelErrorMessage: feedback.errorMessage,
      subgraphTestInfoMessage: feedback.infoMessage,
      clearSubgraphTestFeedback: feedback.clear,
    },
    inputs: {
      effectiveSubgraphTestInputItems,
      currentPinnedInputDraftTexts,
      handlePinnedInputDraftChange,
    },
    runner: {
      selectedSubgraphTestDisplayRun,
      handleRunSelectedSubgraphTest,
      handleClearSelectedSubgraphTestResult,
      handleResetSubgraphTestReusableContext,
    },
    invalidation: {
      commitSemanticGraphSnapshot,
    },
  }
}
