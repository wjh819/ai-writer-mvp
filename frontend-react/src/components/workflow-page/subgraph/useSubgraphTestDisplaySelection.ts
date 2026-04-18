import { useMemo } from 'react'

import type { RunResult } from '../../../run/runTypes'
import {
  buildDisplayRunFromDirectRun,
  type DisplayRun,
} from '@aiwriter/run-display'
import type { WorkflowEditorNode } from '../../../workflow-editor/workflowEditorGraphTypes'

export interface UseSubgraphTestDisplaySelectionOptions {
  selectedNode: WorkflowEditorNode | null
  activeSubgraphTestResult: RunResult | null
  activeSubgraphTestStartNodeId: string | null
  subgraphTestResultsByNodeId: Record<string, RunResult>
  staleSubgraphTestResultIds: Record<string, true>
}

export function useSubgraphTestDisplaySelection({
  selectedNode,
  activeSubgraphTestResult,
  activeSubgraphTestStartNodeId,
  subgraphTestResultsByNodeId,
  staleSubgraphTestResultIds,
}: UseSubgraphTestDisplaySelectionOptions) {
  const selectedNodeSubgraphTestResult = useMemo(() => {
    if (!selectedNode) {
      return null
    }

    if (subgraphTestResultsByNodeId[selectedNode.id]) {
      return subgraphTestResultsByNodeId[selectedNode.id]
    }

    if (activeSubgraphTestStartNodeId === selectedNode.id) {
      return activeSubgraphTestResult
    }

    return null
  }, [
    selectedNode,
    subgraphTestResultsByNodeId,
    activeSubgraphTestStartNodeId,
    activeSubgraphTestResult,
  ])

  const selectedNodeSubgraphTestResultIsStale = useMemo(() => {
    if (!selectedNode) {
      return false
    }

    return Boolean(staleSubgraphTestResultIds[selectedNode.id])
  }, [selectedNode, staleSubgraphTestResultIds])

  const selectedSubgraphTestDisplayRun = useMemo<DisplayRun | null>(() => {
    if (!selectedNodeSubgraphTestResult) {
      return null
    }

    return buildDisplayRunFromDirectRun(selectedNodeSubgraphTestResult, {
      isStale: selectedNodeSubgraphTestResultIsStale,
    })
  }, [
    selectedNodeSubgraphTestResult,
    selectedNodeSubgraphTestResultIsStale,
  ])

  return {
    selectedSubgraphTestDisplayRun,
  }
}

