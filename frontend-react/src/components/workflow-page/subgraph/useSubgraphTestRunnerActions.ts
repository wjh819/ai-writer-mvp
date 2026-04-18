import { useCallback } from 'react'

import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import {
  buildMergedSubgraphTestState,
  type EffectiveSubgraphTestInputItem,
} from '../../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
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
      feedback.setErrorMessage('子图测试失败')
      return
    }

    clearPageError()
    clearSubgraphTestResultStale(selectedNode.id)

    if (result.subgraphTestResult.status === 'failed') {
      feedback.setInfoMessage('子图测试已结束，结果为失败状态。')
      feedback.setErrorMessage(
        result.subgraphTestResult.error_message || '子图测试失败'
      )
      return
    }

    feedback.setInfoMessage('子图测试已完成。')
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
    feedback.setInfoMessage('已清除当前缓存的子图测试结果。')
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
      '已清空可复用的子图测试状态，缓存的子图测试结果已保留。'
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

