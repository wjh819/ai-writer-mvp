import { useCallback } from 'react'

import {
  buildDeleteConfirmationMessage,
  getLiveRunLockedMessage,
} from './canvasLifecycleMessages'
import type {
  RuntimeActionResult,
  WorkflowLoadWarning,
} from '../../workflow-editor/workflowEditorUiTypes'

interface UseCanvasDeleteActionOptions {
  isGraphEditingLocked: boolean
  setPageErrorMessage: (message: string) => void
  canDeleteCurrentCanvas: boolean
  isActiveCanvasTemporary: boolean
  activeCanvasId: string
  isGraphDirty: boolean
  formalCanvasIds: string[]
  remainingFormalCanvasIds: string[]
  clearPageError: () => void
  setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
  setRequestedCanvasId: (value: string) => void
  handleDeleteCanvas: (canvasId: string) => Promise<RuntimeActionResult>
  refreshWorkflowList: () => Promise<RuntimeActionResult>
}

export function useCanvasDeleteAction({
  isGraphEditingLocked,
  setPageErrorMessage,
  canDeleteCurrentCanvas,
  isActiveCanvasTemporary,
  activeCanvasId,
  isGraphDirty,
  formalCanvasIds,
  remainingFormalCanvasIds,
  clearPageError,
  setWorkflowWarnings,
  setRequestedCanvasId,
  handleDeleteCanvas,
  refreshWorkflowList,
}: UseCanvasDeleteActionOptions) {
  const handleDeleteCurrentCanvas = useCallback(async () => {
    if (isGraphEditingLocked) {
      setPageErrorMessage(getLiveRunLockedMessage())
      return
    }

    if (!canDeleteCurrentCanvas) {
      setPageErrorMessage('At least one formal saved canvas must remain')
      return
    }

    const nextCanvasId = isActiveCanvasTemporary
      ? formalCanvasIds[0] || ''
      : remainingFormalCanvasIds[0] || ''

    if (!nextCanvasId) {
      setPageErrorMessage('No remaining formal canvas is available')
      return
    }

    const confirmed = window.confirm(
      buildDeleteConfirmationMessage({
        isActiveCanvasTemporary,
        activeCanvasId,
        isGraphDirty,
      })
    )
    if (!confirmed) {
      return
    }

    clearPageError()
    setWorkflowWarnings([])

    if (isActiveCanvasTemporary) {
      setRequestedCanvasId(nextCanvasId)
      return
    }

    const result = await handleDeleteCanvas(activeCanvasId)
    if (result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
      return
    }

    const refreshResult = await refreshWorkflowList()
    if (refreshResult.errorMessage) {
      setPageErrorMessage(refreshResult.errorMessage)
    }

    setRequestedCanvasId(nextCanvasId)
  }, [
    isGraphEditingLocked,
    setPageErrorMessage,
    canDeleteCurrentCanvas,
    isActiveCanvasTemporary,
    formalCanvasIds,
    remainingFormalCanvasIds,
    activeCanvasId,
    isGraphDirty,
    clearPageError,
    setWorkflowWarnings,
    setRequestedCanvasId,
    handleDeleteCanvas,
    refreshWorkflowList,
  ])

  return {
    handleDeleteCurrentCanvas,
  }
}
