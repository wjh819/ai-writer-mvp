import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  getLiveRunLockedMessage,
  normalizeCanvasId,
  validateCanvasId,
} from './canvasLifecycleMessages'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import type {
  WorkflowLoadWarning,
  WorkflowSidecarData,
} from '../../../workflow-editor/workflowEditorUiTypes'

interface CanvasSummary {
  canvas_id: string
  label: string
}

interface UseCanvasCreateDialogOptions {
  isGraphEditingLocked: boolean
  setPageErrorMessage: (message: string) => void
  clearPageError: () => void
  canvasList: CanvasSummary[]
  activeCanvasId: string
  requestedCanvasId: string
  temporaryCanvasId: string | null
  confirmDiscardTemporaryCanvas: (nextCanvasId?: string) => boolean
  setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
  resetGraphSideEffectsForCommittedWorkflow: (
    nextNodes: WorkflowEditorNode[],
    nextEdges: WorkflowEditorEdge[],
    nextContextLinks: WorkflowContextLink[],
    nextSidecar: WorkflowSidecarData
  ) => void
  setTemporaryCanvasId: (value: string | null) => void
  setRequestedCanvasId: (value: string) => void
  setActiveCanvasId: (value: string) => void
  setActiveWorkflowContextId: Dispatch<SetStateAction<number>>
  markWorkflowAsLoaded: () => void
}

export function useCanvasCreateDialog({
  isGraphEditingLocked,
  setPageErrorMessage,
  clearPageError,
  canvasList,
  activeCanvasId,
  requestedCanvasId,
  temporaryCanvasId,
  confirmDiscardTemporaryCanvas,
  setWorkflowWarnings,
  resetGraphSideEffectsForCommittedWorkflow,
  setTemporaryCanvasId,
  setRequestedCanvasId,
  setActiveCanvasId,
  setActiveWorkflowContextId,
  markWorkflowAsLoaded,
}: UseCanvasCreateDialogOptions) {
  const [isCreateCanvasDialogOpen, setIsCreateCanvasDialogOpen] =
    useState(false)
  const [draftCanvasId, setDraftCanvasId] = useState('')
  const [createCanvasErrorMessage, setCreateCanvasErrorMessage] = useState('')

  const openCreateCanvasDialog = useCallback(() => {
    if (isGraphEditingLocked) {
      setPageErrorMessage(getLiveRunLockedMessage())
      return
    }

    clearPageError()
    setCreateCanvasErrorMessage('')
    setDraftCanvasId('')
    setIsCreateCanvasDialogOpen(true)
  }, [isGraphEditingLocked, setPageErrorMessage, clearPageError])

  const closeCreateCanvasDialog = useCallback(() => {
    setIsCreateCanvasDialogOpen(false)
    setDraftCanvasId('')
    setCreateCanvasErrorMessage('')
  }, [])

  const handleDraftCanvasIdChange = useCallback((nextValue: string) => {
    setDraftCanvasId(nextValue)
    setCreateCanvasErrorMessage('')
  }, [])

  const confirmCreateCanvas = useCallback(() => {
    if (isGraphEditingLocked) {
      setPageErrorMessage(getLiveRunLockedMessage())
      return
    }

    const nextCanvasId = normalizeCanvasId(draftCanvasId)
    const validationMessage = validateCanvasId(nextCanvasId)

    if (validationMessage) {
      setCreateCanvasErrorMessage(validationMessage)
      return
    }

    const hasDuplicateInList = canvasList.some(
      item => item.canvas_id === nextCanvasId
    )

    if (
      hasDuplicateInList ||
      nextCanvasId === activeCanvasId ||
      nextCanvasId === requestedCanvasId ||
      nextCanvasId === temporaryCanvasId
    ) {
      setCreateCanvasErrorMessage(`Canvas id already exists: ${nextCanvasId}`)
      return
    }

    if (!confirmDiscardTemporaryCanvas(nextCanvasId)) {
      return
    }

    closeCreateCanvasDialog()
    clearPageError()
    setWorkflowWarnings([])
    resetGraphSideEffectsForCommittedWorkflow([], [], [], { nodes: {} })
    markWorkflowAsLoaded()
    setTemporaryCanvasId(nextCanvasId)
    setRequestedCanvasId(nextCanvasId)
    setActiveCanvasId(nextCanvasId)
    setActiveWorkflowContextId(prev => prev + 1)
  }, [
    isGraphEditingLocked,
    setPageErrorMessage,
    draftCanvasId,
    canvasList,
    activeCanvasId,
    requestedCanvasId,
    temporaryCanvasId,
    confirmDiscardTemporaryCanvas,
    closeCreateCanvasDialog,
    clearPageError,
    setWorkflowWarnings,
    resetGraphSideEffectsForCommittedWorkflow,
    markWorkflowAsLoaded,
    setTemporaryCanvasId,
    setRequestedCanvasId,
    setActiveCanvasId,
    setActiveWorkflowContextId,
  ])

  return {
    isCreateCanvasDialogOpen,
    draftCanvasId,
    createCanvasErrorMessage,
    setCreateCanvasErrorMessage,
    openCreateCanvasDialog,
    closeCreateCanvasDialog,
    handleDraftCanvasIdChange,
    confirmCreateCanvas,
  }
}

