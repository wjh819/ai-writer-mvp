import { useCallback } from 'react'

import { getLiveRunLockedMessage } from './canvasLifecycleMessages'
import type {
  LoadWorkflowActionResult,
  RuntimeActionResult,
  WorkflowLoadWarning,
  WorkflowSidecarData,
} from '../../../workflow-editor/workflowEditorUiTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'

interface UseCanvasPersistenceActionsOptions {
  isGraphEditingLocked: boolean
  setPageErrorMessage: (message: string) => void
  clearPageError: () => void
  setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
  refreshWorkflowList: () => Promise<RuntimeActionResult>
  handleSave: (
    canvasId: string,
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    sidecar: WorkflowSidecarData,
    options?: { rejectIfExists?: boolean }
  ) => Promise<RuntimeActionResult>
  activeCanvasId: string
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  workflowSidecar: WorkflowSidecarData
  isActiveCanvasTemporary: boolean
  setCommittedGraphPersistedVersion: (value: number) => void
  graphPersistedVersion: number
  setTemporaryCanvasId: (value: string | null) => void
  loadCurrentWorkflow: (canvasId: string) => Promise<LoadWorkflowActionResult>
  resetGraphSideEffectsForCommittedWorkflow: (
    nextNodes: WorkflowEditorNode[],
    nextEdges: WorkflowEditorEdge[],
    nextContextLinks: WorkflowContextLink[],
    nextSidecar: WorkflowSidecarData
  ) => void
}

export function useCanvasPersistenceActions({
  isGraphEditingLocked,
  setPageErrorMessage,
  clearPageError,
  setWorkflowWarnings,
  refreshWorkflowList,
  handleSave,
  activeCanvasId,
  nodes,
  edges,
  contextLinks,
  workflowSidecar,
  isActiveCanvasTemporary,
  setCommittedGraphPersistedVersion,
  graphPersistedVersion,
  setTemporaryCanvasId,
  loadCurrentWorkflow,
  resetGraphSideEffectsForCommittedWorkflow,
}: UseCanvasPersistenceActionsOptions) {
  const handleRefreshWorkflowList = useCallback(async () => {
    const result = await refreshWorkflowList()

    if (result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
      return
    }

    clearPageError()
  }, [refreshWorkflowList, setPageErrorMessage, clearPageError])

  const handleSaveWorkflow = useCallback(async () => {
    if (isGraphEditingLocked) {
      setPageErrorMessage(getLiveRunLockedMessage())
      return
    }

    const result = await handleSave(
      activeCanvasId,
      nodes,
      edges,
      contextLinks,
      workflowSidecar,
      {
        rejectIfExists: isActiveCanvasTemporary,
      }
    )

    if (result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
      return
    }

    setCommittedGraphPersistedVersion(graphPersistedVersion)
    setWorkflowWarnings([])

    if (isActiveCanvasTemporary) {
      const refreshResult = await refreshWorkflowList()
      if (refreshResult.errorMessage) {
        setPageErrorMessage(refreshResult.errorMessage)
      } else {
        clearPageError()
      }

      setTemporaryCanvasId(null)
      return
    }

    clearPageError()
  }, [
    isGraphEditingLocked,
    setPageErrorMessage,
    handleSave,
    activeCanvasId,
    nodes,
    edges,
    contextLinks,
    workflowSidecar,
    isActiveCanvasTemporary,
    setCommittedGraphPersistedVersion,
    graphPersistedVersion,
    setWorkflowWarnings,
    refreshWorkflowList,
    clearPageError,
    setTemporaryCanvasId,
  ])

  const handleRevertToSaved = useCallback(async () => {
    if (isGraphEditingLocked) {
      setPageErrorMessage(getLiveRunLockedMessage())
      return
    }

    if (isActiveCanvasTemporary) {
      return
    }

    const result = await loadCurrentWorkflow(activeCanvasId)

    if (result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
      return
    }

    clearPageError()
    setWorkflowWarnings(result.warnings || [])
    resetGraphSideEffectsForCommittedWorkflow(
      result.nodes,
      result.edges,
      result.contextLinks,
      result.sidecar
    )
  }, [
    isGraphEditingLocked,
    setPageErrorMessage,
    isActiveCanvasTemporary,
    loadCurrentWorkflow,
    activeCanvasId,
    clearPageError,
    setWorkflowWarnings,
    resetGraphSideEffectsForCommittedWorkflow,
  ])

  return {
    handleRefreshWorkflowList,
    handleSaveWorkflow,
    handleRevertToSaved,
  }
}

