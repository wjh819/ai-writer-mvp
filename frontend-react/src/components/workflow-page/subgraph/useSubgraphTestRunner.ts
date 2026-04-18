import {
  useSubgraphTestDisplaySelection,
  type UseSubgraphTestDisplaySelectionOptions,
} from './useSubgraphTestDisplaySelection'
import {
  useSubgraphTestRunnerActions,
  type UseSubgraphTestRunnerActionsOptions,
} from './useSubgraphTestRunnerActions'

type UseSubgraphTestRunnerOptions = UseSubgraphTestDisplaySelectionOptions &
  UseSubgraphTestRunnerActionsOptions

export function useSubgraphTestRunner({
  activeCanvasId,
  nodes,
  edges,
  contextLinks,
  selectedNode,
  subgraphTestState,
  activeSubgraphTestResult,
  activeSubgraphTestStartNodeId,
  subgraphTestResultsByNodeId,
  staleSubgraphTestResultIds,
  effectiveSubgraphTestInputItems,
  isNodeTestLocked,
  nodeTestLockMessage,
  clearPageError,
  feedback,
  clearSubgraphTestResultStale,
  handleRunSubgraphTest,
  clearSubgraphTestResult,
  resetSubgraphTestState,
}: UseSubgraphTestRunnerOptions) {
  const { selectedSubgraphTestDisplayRun } = useSubgraphTestDisplaySelection({
    selectedNode,
    activeSubgraphTestResult,
    activeSubgraphTestStartNodeId,
    subgraphTestResultsByNodeId,
    staleSubgraphTestResultIds,
  })

  const {
    handleRunSelectedSubgraphTest,
    handleClearSelectedSubgraphTestResult,
    handleResetSubgraphTestReusableContext,
  } = useSubgraphTestRunnerActions({
    activeCanvasId,
    nodes,
    edges,
    contextLinks,
    selectedNode,
    subgraphTestState,
    effectiveSubgraphTestInputItems,
    isNodeTestLocked,
    nodeTestLockMessage,
    clearPageError,
    feedback,
    clearSubgraphTestResultStale,
    handleRunSubgraphTest,
    clearSubgraphTestResult,
    resetSubgraphTestState,
  })

  return {
    selectedSubgraphTestDisplayRun,
    handleRunSelectedSubgraphTest,
    handleClearSelectedSubgraphTestResult,
    handleResetSubgraphTestReusableContext,
  }
}
