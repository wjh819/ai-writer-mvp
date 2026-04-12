import { useCallback } from 'react'

import type { WorkflowState } from '../../shared/workflowSharedTypes'
import {
  buildMergedSubgraphTestState,
  type EffectiveSubgraphTestInputItem,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type {
  SubgraphTestPanelFeedbackBinding,
  SubgraphTestRunActionResult,
} from './subgraphTestPanelTypes'

export interface UseSubgraphTestRunnerActionsOptions {
  activeCanvasId: string
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  selectedNode: WorkflowEditorNode | null
  subgraphTestState: WorkflowState
  effectiveSubgraphTestInputItems: EffectiveSubgraphTestInputItem[]
  isNodeTestLocked: boolean
  nodeTestLockMessage: string
  clearPageError: () => void
  feedback: Pick<
    SubgraphTestPanelFeedbackBinding,
    'clear' | 'setErrorMessage' | 'setInfoMessage'
  >
  clearSubgraphTestResultStale: (nodeId: string) => void
  handleRunSubgraphTest: (
    canvasId: string,
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    startNodeId: string,
    nextSubgraphTestState: WorkflowState,
    endNodeIds?: string[]
  ) => Promise<SubgraphTestRunActionResult>
  clearSubgraphTestResult: (nodeId: string) => void
  resetSubgraphTestState: () => void
}

export function useSubgraphTestRunnerActions({
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
}: UseSubgraphTestRunnerActionsOptions) {
  const handleRunSelectedSubgraphTest = useCallback(async () => {
    if (isNodeTestLocked) {
      feedback.setErrorMessage(nodeTestLockMessage)
      return
    }

    if (!selectedNode) {
      return
    }

    const mergedSubgraphTestState = buildMergedSubgraphTestState({
      baseState: subgraphTestState || {},
      effectiveItems: effectiveSubgraphTestInputItems,
    })

    feedback.clear()

    const result = await handleRunSubgraphTest(
      activeCanvasId,
      nodes,
      edges,
      contextLinks,
      selectedNode.id,
      mergedSubgraphTestState
    )

    if (result.errorMessage) {
      feedback.setErrorMessage(result.errorMessage)
      return
    }

    if (!result.subgraphTestResult) {
      feedback.setErrorMessage('Subgraph test failed')
      return
    }

    clearPageError()
    clearSubgraphTestResultStale(selectedNode.id)

    if (result.subgraphTestResult.status === 'failed') {
      feedback.setInfoMessage('Subgraph test finished with failure state.')
      feedback.setErrorMessage(
        result.subgraphTestResult.error_message || 'Subgraph test failed'
      )
      return
    }

    feedback.setInfoMessage('Subgraph test completed.')
  }, [
    isNodeTestLocked,
    feedback,
    nodeTestLockMessage,
    selectedNode,
    subgraphTestState,
    effectiveSubgraphTestInputItems,
    handleRunSubgraphTest,
    activeCanvasId,
    nodes,
    edges,
    contextLinks,
    clearPageError,
    clearSubgraphTestResultStale,
  ])

  const handleClearSelectedSubgraphTestResult = useCallback(() => {
    if (isNodeTestLocked) {
      feedback.setErrorMessage(nodeTestLockMessage)
      return
    }

    if (!selectedNode) {
      return
    }

    clearSubgraphTestResult(selectedNode.id)
    clearSubgraphTestResultStale(selectedNode.id)
    feedback.clear()
    clearPageError()
    feedback.setInfoMessage('Current cached subgraph test result was cleared.')
  }, [
    isNodeTestLocked,
    feedback,
    nodeTestLockMessage,
    selectedNode,
    clearSubgraphTestResult,
    clearSubgraphTestResultStale,
    clearPageError,
  ])

  const handleResetSubgraphTestReusableContext = useCallback(() => {
    if (isNodeTestLocked) {
      feedback.setErrorMessage(nodeTestLockMessage)
      return
    }

    resetSubgraphTestState()
    feedback.clear()
    clearPageError()
    feedback.setInfoMessage(
      'Reusable subgraph test state was cleared. Cached subgraph test results were kept.'
    )
  }, [
    isNodeTestLocked,
    feedback,
    nodeTestLockMessage,
    resetSubgraphTestState,
    clearPageError,
  ])

  return {
    handleRunSelectedSubgraphTest,
    handleClearSelectedSubgraphTestResult,
    handleResetSubgraphTestReusableContext,
  }
}
