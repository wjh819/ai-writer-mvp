import { useCallback, useEffect, useRef } from 'react'

import type { RunResult } from '../../../run/runTypes'
import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import {
  shouldInvalidateSubgraphTestContextForSemanticChange,
  type SemanticGraphSnapshot,
} from './subgraphTestInvalidationRules'
import type { SubgraphTestPanelFeedbackBinding } from './subgraphTestPanelTypes'

interface UseSubgraphTestInvalidationOptions {
  graphSemanticVersion: number
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  subgraphTestResultsByNodeId: Record<string, RunResult>
  subgraphTestState: WorkflowState
  activeSubgraphTestResult: RunResult | null
  activeSubgraphTestStartNodeId: string | null
  lastSuccessfulSubgraphTestStartNodeId: string | null
  markSubgraphTestResultStale: (nodeId: string) => void
  resetSubgraphTestState: () => void
  feedback: Pick<
    SubgraphTestPanelFeedbackBinding,
    'setErrorMessage' | 'setInfoMessage'
  >
}

export function useSubgraphTestInvalidation({
  graphSemanticVersion,
  nodes,
  edges,
  contextLinks,
  subgraphTestResultsByNodeId,
  subgraphTestState,
  activeSubgraphTestResult,
  activeSubgraphTestStartNodeId,
  lastSuccessfulSubgraphTestStartNodeId,
  markSubgraphTestResultStale,
  resetSubgraphTestState,
  feedback,
}: UseSubgraphTestInvalidationOptions) {
  const semanticGraphSnapshotRef = useRef<SemanticGraphSnapshot | null>(null)

  const commitSemanticGraphSnapshot = useCallback(
    (
      nextNodes: WorkflowEditorNode[],
      nextEdges: WorkflowEditorEdge[],
      nextContextLinks: WorkflowContextLink[]
    ) => {
      semanticGraphSnapshotRef.current = {
        nodes: nextNodes,
        edges: nextEdges,
        contextLinks: nextContextLinks,
      }
    },
    []
  )

  useEffect(() => {
    const currentSnapshot: SemanticGraphSnapshot = {
      nodes,
      edges,
      contextLinks,
    }

    if (graphSemanticVersion === 0) {
      semanticGraphSnapshotRef.current = currentSnapshot
      return
    }

    const previousSnapshot = semanticGraphSnapshotRef.current
    semanticGraphSnapshotRef.current = currentSnapshot

    if (!previousSnapshot) {
      return
    }

    const storedSubgraphTestStartNodeIds = Object.keys(
      subgraphTestResultsByNodeId || {}
    )
    const hasReusableSubgraphTestState =
      Object.keys(subgraphTestState || {}).length > 0 ||
      Boolean(lastSuccessfulSubgraphTestStartNodeId) ||
      Boolean(activeSubgraphTestResult)

    if (
      storedSubgraphTestStartNodeIds.length === 0 &&
      !hasReusableSubgraphTestState
    ) {
      return
    }

    const staleNodeIds = storedSubgraphTestStartNodeIds.filter(nodeId =>
      shouldInvalidateSubgraphTestContextForSemanticChange({
        previousSnapshot,
        nextSnapshot: currentSnapshot,
        anchorNodeId: nodeId,
      })
    )

    if (staleNodeIds.length === 0) {
      return
    }

    staleNodeIds.forEach(nodeId => {
      markSubgraphTestResultStale(nodeId)
    })

    const reusableContextAnchorNodeId =
      lastSuccessfulSubgraphTestStartNodeId ||
      activeSubgraphTestStartNodeId ||
      null

    const shouldResetReusableContext =
      hasReusableSubgraphTestState &&
      reusableContextAnchorNodeId !== null &&
      staleNodeIds.includes(reusableContextAnchorNodeId)

    if (!shouldResetReusableContext) {
      return
    }

    resetSubgraphTestState()
    feedback.setErrorMessage('')
    feedback.setInfoMessage(
      '由于上游图语义发生变化，已清空可复用的子图测试状态。已有缓存测试结果会保留，并在受影响处标记为过期。'
    )
  }, [
    graphSemanticVersion,
    nodes,
    edges,
    contextLinks,
    subgraphTestResultsByNodeId,
    subgraphTestState,
    activeSubgraphTestResult,
    activeSubgraphTestStartNodeId,
    lastSuccessfulSubgraphTestStartNodeId,
    markSubgraphTestResultStale,
    resetSubgraphTestState,
    feedback,
  ])

  return {
    commitSemanticGraphSnapshot,
  }
}

