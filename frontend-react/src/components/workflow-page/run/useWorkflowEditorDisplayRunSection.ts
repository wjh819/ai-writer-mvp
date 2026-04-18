import { useCallback } from 'react'

import { useBatchRunContext } from './useBatchRunContext'
import { useLiveRunContext } from './useLiveRunContext'
import { useWorkflowEditorDisplayState } from './useWorkflowEditorDisplayState'
import { useWorkflowRunContext } from './useWorkflowRunContext'
import type { RunResult } from '../../../run/runTypes'
import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type { WorkflowRuntimeState } from '../../../workflow-editor/controllers/useWorkflowRuntime'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import type { WorkflowLoadWarning } from '../../../workflow-editor/workflowEditorUiTypes'
import type {
  CancelBatchRunActionResult,
  FetchBatchItemDetailActionResult,
  FetchBatchSummaryActionResult,
  StartBatchRunActionResult,
} from './useBatchRunContext'
import type {
  FetchActiveLiveRunActionResult,
  StartLiveRunActionResult,
} from './useLiveRunContext'

type DisplayRunRuntimeActions = Pick<
  WorkflowRuntimeState['runExecution'],
  | 'handleRun'
  | 'handleStartLiveRun'
  | 'handleFetchActiveLiveRun'
  | 'handleStartBatchRun'
  | 'handleFetchBatchSummary'
  | 'handleFetchBatchItemDetail'
  | 'handleCancelBatchRun'
>
type DisplayRunStateRuntimeBindings = Pick<
  WorkflowRuntimeState['bootstrap'],
  'bootstrapErrorMessage'
>

interface UseWorkflowEditorDisplayRunSectionOptions {
  activeCanvasId: string
  activeWorkflowContextId: number
  graphSemanticVersion: number
  clearPageError: () => void
  runtimeActions: DisplayRunRuntimeActions
}

export function useWorkflowEditorDisplayRunSection({
  activeCanvasId,
  activeWorkflowContextId,
  graphSemanticVersion,
  clearPageError,
  runtimeActions,
}: UseWorkflowEditorDisplayRunSectionOptions) {
  const {
    runContext,
    clearRunState,
    displayRun,
    commitFinalRunResult,
  } = useWorkflowRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleRun: runtimeActions.handleRun,
  })

  const {
    liveRunSnapshot,
    isLiveRunActive,
    isGraphEditingLocked: isLiveRunGraphEditingLocked,
    lastPollErrorMessage,
    clearLiveRunState,
    startLiveRun,
  } = useLiveRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleStartLiveRun: runtimeActions.handleStartLiveRun,
    handleFetchActiveLiveRun: runtimeActions.handleFetchActiveLiveRun,
    commitFinalRunResult,
  })

  const {
    batchSummary,
    selectedBatchItemId,
    selectedBatchDisplayRun,
    isBatchRunActive,
    isBatchResultStale,
    isBatchCancelRequested,
    lastPollErrorMessage: batchLastPollErrorMessage,
    clearBatchRunState,
    startBatchRun,
    selectBatchItem,
    cancelBatchRun,
  } = useBatchRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleStartBatchRun: runtimeActions.handleStartBatchRun,
    handleFetchBatchSummary: runtimeActions.handleFetchBatchSummary,
    handleFetchBatchItemDetail: runtimeActions.handleFetchBatchItemDetail,
    handleCancelBatchRun: runtimeActions.handleCancelBatchRun,
  })

  const isGraphEditingLocked =
    isLiveRunGraphEditingLocked || isBatchRunActive

  const activeLiveRunSnapshot = isLiveRunActive ? liveRunSnapshot : null

  const clearAllRunState = useCallback(() => {
    clearLiveRunState()
    clearBatchRunState()
    clearRunState()
  }, [clearLiveRunState, clearBatchRunState, clearRunState])

  return {
    state: {
      runContext,
      displayRun,
      liveRunSnapshot,
      activeLiveRunSnapshot,
      batchSummary,
      selectedBatchItemId,
      selectedBatchDisplayRun,
      isBatchResultStale,
      lastPollErrorMessage,
      batchLastPollErrorMessage,
    },
    status: {
      isLiveRunActive,
      isBatchRunActive,
      isBatchCancelRequested,
      isGraphEditingLocked,
    },
    actions: {
      clearRunState,
      clearLiveRunState,
      clearBatchRunState,
      clearAllRunState,
      startLiveRun,
      startBatchRun,
      selectBatchItem,
      cancelBatchRun,
    },
  }
}

interface UseWorkflowEditorDisplayRunStateOptions {
  nodes: WorkflowEditorNode[]
  selectedNode: WorkflowEditorNode | null
  displayNodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  selectedEdgeId: string | null
  workflowWarnings: WorkflowLoadWarning[]
  runtime: DisplayRunStateRuntimeBindings
  pageErrorMessage: string
  isGraphDirty: boolean
  isLiveRunActive: boolean
  activeLiveRunSnapshot: ReturnType<
    typeof useWorkflowEditorDisplayRunSection
  >['state']['activeLiveRunSnapshot']
  selectedBatchDisplayRun: ReturnType<typeof useBatchRunContext>['selectedBatchDisplayRun']
  batchSummary: ReturnType<typeof useBatchRunContext>['batchSummary']
  displayRun: ReturnType<typeof useWorkflowRunContext>['displayRun']
  isBatchResultStale: boolean
  isBatchCancelRequested: boolean
  selectedBatchItemId: string | null
  lastPollErrorMessage?: string
  batchLastPollErrorMessage?: string
}

export function useWorkflowEditorDisplayRunState({
  nodes,
  selectedNode,
  displayNodes,
  edges,
  selectedEdgeId,
  workflowWarnings,
  runtime,
  pageErrorMessage,
  isGraphDirty,
  isLiveRunActive,
  activeLiveRunSnapshot,
  selectedBatchDisplayRun,
  batchSummary,
  displayRun,
  isBatchResultStale,
  isBatchCancelRequested,
  selectedBatchItemId,
  lastPollErrorMessage,
  batchLastPollErrorMessage,
}: UseWorkflowEditorDisplayRunStateOptions) {
  return useWorkflowEditorDisplayState({
    nodes,
    selectedNode,
    displayNodes,
    edges,
    selectedEdgeId,
    workflowWarnings,
    bootstrapErrorMessage: runtime.bootstrapErrorMessage,
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
  })
}

