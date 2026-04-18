import { useMemo } from 'react'

import type {
  BatchItemSummary,
  BatchSummaryResponse,
  LiveRunSnapshot,
} from '../../../run/runTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowLoadWarning } from '../../../workflow-editor/workflowEditorUiTypes'
import {
  buildDisplayRunFromLiveSnapshot,
  type DisplayRun,
} from '@aiwriter/run-display'

function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }

  return String(value).trim()
}

export interface UseWorkflowEditorDisplayStateOptions {
  nodes: WorkflowEditorNode[]
  selectedNode: WorkflowEditorNode | null
  displayNodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  selectedEdgeId: string | null

  workflowWarnings: WorkflowLoadWarning[]
  bootstrapErrorMessage: string
  pageErrorMessage: string
  lastPollErrorMessage?: string
  batchLastPollErrorMessage?: string

  isGraphDirty: boolean

  isLiveRunActive: boolean
  activeLiveRunSnapshot: LiveRunSnapshot | null
  selectedBatchDisplayRun: DisplayRun | null
  batchSummary: BatchSummaryResponse | null
  displayRun: DisplayRun | null
  isBatchResultStale: boolean
  isBatchCancelRequested: boolean
  selectedBatchItemId: string | null
}

export function useWorkflowEditorDisplayState({
  nodes,
  selectedNode,
  displayNodes,
  edges,
  selectedEdgeId,
  workflowWarnings,
  bootstrapErrorMessage,
  pageErrorMessage,
  lastPollErrorMessage,
  batchLastPollErrorMessage,
  isGraphDirty,
  isLiveRunActive,
  activeLiveRunSnapshot,
  selectedBatchDisplayRun,
  batchSummary,
  displayRun,
  isBatchResultStale,
  isBatchCancelRequested,
  selectedBatchItemId,
}: UseWorkflowEditorDisplayStateOptions) {
  const selectedDisplayNode = useMemo(() => {
    if (!selectedNode) {
      return null
    }

    return displayNodes.find(node => node.id === selectedNode.id) || null
  }, [selectedNode, displayNodes])

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) {
      return null
    }

    return edges.find(edge => edge.id === selectedEdgeId) || null
  }, [edges, selectedEdgeId])

  const liveDisplayRun = useMemo(() => {
    if (!activeLiveRunSnapshot) {
      return null
    }

    return buildDisplayRunFromLiveSnapshot(activeLiveRunSnapshot)
  }, [activeLiveRunSnapshot])

  const effectiveDisplayRun = useMemo(() => {
    if (liveDisplayRun) {
      return liveDisplayRun
    }

    if (selectedBatchDisplayRun) {
      return selectedBatchDisplayRun
    }

    if (batchSummary) {
      return null
    }

    return displayRun
  }, [liveDisplayRun, selectedBatchDisplayRun, batchSummary, displayRun])

  const workflowWarningsMessage = useMemo(() => {
    if (!workflowWarnings.length) {
      return ''
    }

    return workflowWarnings
      .map(warning => {
        const suffix = warning.nodeId ? ` [${warning.nodeId}]` : ''
        return `${warning.code}${suffix}: ${warning.message}`
      })
      .join('\n')
  }, [workflowWarnings])

  const topLevelErrorMessage = [
    bootstrapErrorMessage,
    pageErrorMessage,
    lastPollErrorMessage,
    batchLastPollErrorMessage,
  ]
    .filter(Boolean)
    .join('\n')

  const draftStatusMessage = useMemo(() => {
    if (!isGraphDirty) {
      return ''
    }

    if (pageErrorMessage) {
      return '当前画布仍有未保存的草稿改动。请先修复错误再保存，或回退到最近一次已保存版本。'
    }

    return '当前画布包含未保存的草稿改动。'
  }, [isGraphDirty, pageErrorMessage])

  const activeRunStatusMessage = useMemo(() => {
    if (isLiveRunActive) {
      if (!activeLiveRunSnapshot) {
        return '实时运行正在启动...'
      }

      const activeNodeId = trim(activeLiveRunSnapshot.active_node_id)
      return activeNodeId
        ? `实时运行进行中。当前活跃节点：${activeNodeId}`
        : '实时运行进行中。'
    }

    if (batchSummary) {
      const completedCount =
        batchSummary.succeeded + batchSummary.failed + batchSummary.cancelled

      const staleSuffix = isBatchResultStale ? '（已过期）' : ''

      if (batchSummary.status === 'running' && isBatchCancelRequested) {
        return `已请求取消批处理。正在运行的条目会自然完成。已完成 ${completedCount} / ${batchSummary.total}。${staleSuffix}`
      }

      return `批处理状态：${batchSummary.status}。已完成 ${completedCount} / ${batchSummary.total}。${staleSuffix}`
    }

    return ''
  }, [
    isLiveRunActive,
    activeLiveRunSnapshot,
    batchSummary,
    isBatchResultStale,
    isBatchCancelRequested,
  ])

  const selectedBatchSummaryItem = useMemo<BatchItemSummary | null>(() => {
    if (!batchSummary || !selectedBatchItemId) {
      return null
    }

    return (
      batchSummary.items.find(item => item.item_id === selectedBatchItemId) ||
      null
    )
  }, [batchSummary, selectedBatchItemId])

  const hasAnyNodes = nodes.length > 0
  const hasBatchResult = Boolean(batchSummary)
  const hasAnyRunArtifact = Boolean(effectiveDisplayRun || batchSummary)

  return {
    selectedDisplayNode,
    selectedEdge,
    liveDisplayRun,
    effectiveDisplayRun,
    workflowWarningsMessage,
    topLevelErrorMessage,
    draftStatusMessage,
    activeRunStatusMessage,
    selectedBatchSummaryItem,
    hasAnyNodes,
    hasBatchResult,
    hasAnyRunArtifact,
  }
}

