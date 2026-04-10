import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { buildDisplayRunFromDirectRun } from '../run/runDisplayMappers'
import type { DisplayRun } from '../run/runDisplayModels'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type { WorkflowBatchRunContext } from '../../workflow-editor/runContextTypes'
import type {
  BatchItemDetailResponse,
  BatchItemSummary,
  BatchSummaryResponse,
} from '../../run/runTypes'

const BATCH_POLL_INTERVAL_MS = 1000

export interface StartBatchRunActionResult {
  batchSummary?: BatchSummaryResponse
  successMessage?: string
  errorMessage?: string
}

export interface FetchBatchSummaryActionResult {
  batchSummary?: BatchSummaryResponse
  errorMessage?: string
}

export interface FetchBatchItemDetailActionResult {
  batchItemDetail?: BatchItemDetailResponse
  errorMessage?: string
}

export interface CancelBatchRunActionResult {
  batchSummary?: BatchSummaryResponse
  successMessage?: string
  errorMessage?: string
}

export interface UseBatchRunContextOptions {
  activeCanvasId: string
  activeWorkflowContextId: number
  graphSemanticVersion: number

  clearPageError: () => void

  handleStartBatchRun: (
    canvasId: string,
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    inputValues: unknown[],
    maxParallel?: number
  ) => Promise<StartBatchRunActionResult>

  handleFetchBatchSummary: (
    batchId: string
  ) => Promise<FetchBatchSummaryActionResult>

  handleFetchBatchItemDetail: (
    batchId: string,
    itemId: string
  ) => Promise<FetchBatchItemDetailActionResult>

  handleCancelBatchRun: (
    batchId: string
  ) => Promise<CancelBatchRunActionResult>
}

export interface UseBatchRunContextResult {
  batchRunContext: WorkflowBatchRunContext | null
  batchSummary: BatchSummaryResponse | null
  selectedBatchItemId: string | null
  selectedBatchItemSummary: BatchItemSummary | null
  selectedBatchItemDetail: BatchItemDetailResponse | null
  selectedBatchDisplayRun: DisplayRun | null

  isBatchRunActive: boolean
  isBatchResultStale: boolean
  isBatchCancelRequested: boolean
  lastPollErrorMessage?: string

  clearBatchRunState: () => void

  startBatchRun: (
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    inputValues: unknown[],
    inputKey: string,
    maxParallel?: number
  ) => Promise<StartBatchRunActionResult>

  selectBatchItem: (
    itemId: string
  ) => Promise<FetchBatchItemDetailActionResult | undefined>

  refreshSelectedBatchItemDetail: () => Promise<
    FetchBatchItemDetailActionResult | undefined
  >

  cancelBatchRun: () => Promise<CancelBatchRunActionResult | undefined>
}

function isTerminalBatchStatus(
  status: BatchSummaryResponse['status']
): boolean {
  return status === 'finished' || status === 'cancelled'
}

function canItemHaveDetail(item: BatchItemSummary | null): boolean {
  if (!item) {
    return false
  }

  return item.status === 'succeeded' || item.status === 'failed'
}

export function useBatchRunContext(
  options: UseBatchRunContextOptions
): UseBatchRunContextResult {
  const {
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleStartBatchRun,
    handleFetchBatchSummary,
    handleFetchBatchItemDetail,
    handleCancelBatchRun,
  } = options

  const [batchRunContext, setBatchRunContext] =
    useState<WorkflowBatchRunContext | null>(null)

  const pollTimerRef = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }

    setBatchRunContext(prev => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        isPolling: false,
      }
    })
  }, [])

  const clearBatchRunState = useCallback(() => {
    stopPolling()
    setBatchRunContext(null)
  }, [stopPolling])

  const commitBatchSummary = useCallback((summary: BatchSummaryResponse) => {
    setBatchRunContext(prev => {
      if (!prev) {
        return prev
      }

      const selectedItemStillExists = prev.selectedItemId
        ? summary.items.some(item => item.item_id === prev.selectedItemId)
        : false

      return {
        ...prev,
        batchSummary: summary,
        selectedItemId: selectedItemStillExists ? prev.selectedItemId : null,
        selectedItemDetail: selectedItemStillExists
          ? prev.selectedItemDetail
          : null,
        isPolling: summary.status === 'running',
        cancelRequested: summary.cancel_requested,
        lastPollErrorMessage: undefined,
      }
    })
  }, [])

  const pollBatchSummary = useCallback(
    async (batchId: string): Promise<FetchBatchSummaryActionResult> => {
      const result = await handleFetchBatchSummary(batchId)

      if (result.errorMessage) {
        setBatchRunContext(prev => {
          if (!prev || prev.batchId !== batchId) {
            return prev
          }

          return {
            ...prev,
            lastPollErrorMessage: result.errorMessage,
          }
        })
        return result
      }

      const summary = result.batchSummary
      if (!summary) {
        return result
      }

      commitBatchSummary(summary)

      if (isTerminalBatchStatus(summary.status)) {
        stopPolling()
      }

      return result
    },
    [commitBatchSummary, handleFetchBatchSummary, stopPolling]
  )

  const startPolling = useCallback(
    (batchId: string) => {
      stopPolling()

      pollTimerRef.current = window.setInterval(() => {
        void pollBatchSummary(batchId)
      }, BATCH_POLL_INTERVAL_MS)

      setBatchRunContext(prev => {
        if (!prev || prev.batchId !== batchId) {
          return prev
        }

        return {
          ...prev,
          isPolling: true,
        }
      })
    },
    [pollBatchSummary, stopPolling]
  )

  const startBatchRun = useCallback(
    async (
      nodes: WorkflowEditorNode[],
      edges: WorkflowEditorEdge[],
      contextLinks: WorkflowContextLink[],
      inputValues: unknown[],
      inputKey: string,
      maxParallel?: number
    ): Promise<StartBatchRunActionResult> => {
      clearPageError()
      stopPolling()

      const result = await handleStartBatchRun(
        activeCanvasId,
        nodes,
        edges,
        contextLinks,
        inputValues,
        maxParallel
      )

      if (!result.batchSummary || result.errorMessage) {
        return result
      }

      const summary = result.batchSummary

      setBatchRunContext({
        batchId: summary.batch_id,
        canvasId: activeCanvasId,
        workflowContextId: activeWorkflowContextId,
        graphSemanticVersion,
        inputKey,
        batchSummary: summary,
        selectedItemId: null,
        selectedItemDetail: null,
        isPolling: summary.status === 'running',
        cancelRequested: summary.cancel_requested,
        lastPollErrorMessage: undefined,
      })

      if (summary.status === 'running') {
        startPolling(summary.batch_id)
      }

      return result
    },
    [
      activeCanvasId,
      activeWorkflowContextId,
      clearPageError,
      graphSemanticVersion,
      handleStartBatchRun,
      startPolling,
      stopPolling,
    ]
  )

  const selectBatchItem = useCallback(
    async (
      itemId: string
    ): Promise<FetchBatchItemDetailActionResult | undefined> => {
      const currentContext = batchRunContext
      if (!currentContext || !currentContext.batchSummary) {
        return undefined
      }

      const item =
        currentContext.batchSummary.items.find(
          candidate => candidate.item_id === itemId
        ) || null

      setBatchRunContext(prev => {
        if (!prev || prev.batchId !== currentContext.batchId) {
          return prev
        }

        return {
          ...prev,
          selectedItemId: itemId,
          selectedItemDetail: canItemHaveDetail(item)
            ? prev.selectedItemDetail
            : null,
        }
      })

      if (!canItemHaveDetail(item)) {
        return undefined
      }

      const result = await handleFetchBatchItemDetail(
        currentContext.batchId,
        itemId
      )

      if (result.errorMessage) {
        setBatchRunContext(prev => {
          if (
            !prev ||
            prev.batchId !== currentContext.batchId ||
            prev.selectedItemId !== itemId
          ) {
            return prev
          }

          return {
            ...prev,
            lastPollErrorMessage: result.errorMessage,
          }
        })
        return result
      }

      if (!result.batchItemDetail) {
        return result
      }

      setBatchRunContext(prev => {
        if (
          !prev ||
          prev.batchId !== currentContext.batchId ||
          prev.selectedItemId !== itemId
        ) {
          return prev
        }

        return {
          ...prev,
          selectedItemDetail: result.batchItemDetail ?? null,
          lastPollErrorMessage: undefined,
        }
      })

      return result
    },
    [batchRunContext, handleFetchBatchItemDetail]
  )

  const refreshSelectedBatchItemDetail = useCallback(async () => {
    const currentContext = batchRunContext
    const selectedItemId = currentContext?.selectedItemId

    if (!currentContext || !selectedItemId || !currentContext.batchSummary) {
      return undefined
    }

    const item =
      currentContext.batchSummary.items.find(
        candidate => candidate.item_id === selectedItemId
      ) || null

    if (!canItemHaveDetail(item)) {
      return undefined
    }

    return selectBatchItem(selectedItemId)
  }, [batchRunContext, selectBatchItem])

  const cancelBatchRun = useCallback(
    async (): Promise<CancelBatchRunActionResult | undefined> => {
      const currentContext = batchRunContext
      if (!currentContext) {
        return undefined
      }

      const result = await handleCancelBatchRun(currentContext.batchId)

      if (result.errorMessage) {
        setBatchRunContext(prev => {
          if (!prev || prev.batchId !== currentContext.batchId) {
            return prev
          }

          return {
            ...prev,
            lastPollErrorMessage: result.errorMessage,
          }
        })
        return result
      }

      setBatchRunContext(prev => {
        if (!prev || prev.batchId !== currentContext.batchId) {
          return prev
        }

        return {
          ...prev,
          batchSummary: result.batchSummary ?? prev.batchSummary,
          cancelRequested: result.batchSummary?.cancel_requested ?? true,
          lastPollErrorMessage: undefined,
        }
      })

      return result
    },
    [batchRunContext, handleCancelBatchRun]
  )

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setBatchRunContext(prev => {
      if (!prev) {
        return prev
      }

      const contextChanged =
        prev.canvasId !== activeCanvasId ||
        prev.workflowContextId !== activeWorkflowContextId

      if (!contextChanged) {
        return prev
      }

      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }

      return null
    })
  }, [activeCanvasId, activeWorkflowContextId])

  const batchSummary = batchRunContext?.batchSummary ?? null
  const selectedBatchItemId = batchRunContext?.selectedItemId ?? null

  const selectedBatchItemSummary = useMemo(() => {
    if (!batchSummary || !selectedBatchItemId) {
      return null
    }

    return (
      batchSummary.items.find(item => item.item_id === selectedBatchItemId) ||
      null
    )
  }, [batchSummary, selectedBatchItemId])

  const selectedBatchItemDetail = batchRunContext?.selectedItemDetail ?? null

  const isBatchRunActive = Boolean(
    batchRunContext &&
      batchRunContext.batchSummary &&
      batchRunContext.batchSummary.status === 'running'
  )

  const isBatchResultStale = Boolean(
    batchRunContext &&
      batchRunContext.canvasId === activeCanvasId &&
      batchRunContext.workflowContextId === activeWorkflowContextId &&
      batchRunContext.graphSemanticVersion !== graphSemanticVersion
  )

  const isBatchCancelRequested = Boolean(
    batchSummary?.cancel_requested || batchRunContext?.cancelRequested
  )

  const selectedBatchDisplayRun = useMemo<DisplayRun | null>(() => {
    if (!selectedBatchItemDetail) {
      return null
    }

    return buildDisplayRunFromDirectRun(selectedBatchItemDetail.run_result, {
      isStale: isBatchResultStale,
    })
  }, [selectedBatchItemDetail, isBatchResultStale])

  return {
    batchRunContext,
    batchSummary,
    selectedBatchItemId,
    selectedBatchItemSummary,
    selectedBatchItemDetail,
    selectedBatchDisplayRun,
    isBatchRunActive,
    isBatchResultStale,
    isBatchCancelRequested,
    lastPollErrorMessage: batchRunContext?.lastPollErrorMessage,
    clearBatchRunState,
    startBatchRun,
    selectBatchItem,
    refreshSelectedBatchItemDetail,
    cancelBatchRun,
  }
}