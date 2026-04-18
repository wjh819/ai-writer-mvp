import { useMemo, type ComponentProps } from 'react'

import WorkflowDialogs from '../shell/WorkflowDialogs'

type WorkflowDialogsProps = ComponentProps<typeof WorkflowDialogs>

interface CanvasDialogsBindings {
  isCreateCanvasDialogOpen: boolean
  draftCanvasId: string
  createCanvasErrorMessage: string
  handleDraftCanvasIdChange: (value: string) => void
  closeCreateCanvasDialog: () => void
  confirmCreateCanvas: () => void
}

interface GraphDialogBindings {
  pendingBindingRequest: WorkflowDialogsProps['pendingBindingRequest']
  cancelPendingBinding: WorkflowDialogsProps['onCancelPendingBinding']
  confirmPendingBinding: WorkflowDialogsProps['onConfirmPendingBinding']
}

interface UseWorkflowDialogsStateOptions {
  canvasDialogs: CanvasDialogsBindings
  graphDialogBindings: GraphDialogBindings
  isGraphEditingLocked: boolean
}

export interface WorkflowDialogsState {
  workflowDialogsProps: WorkflowDialogsProps
}

export function useWorkflowDialogsState({
  canvasDialogs,
  graphDialogBindings,
  isGraphEditingLocked,
}: UseWorkflowDialogsStateOptions): WorkflowDialogsState {
  const workflowDialogsProps = useMemo<WorkflowDialogsProps>(
    () => ({
      isCreateCanvasDialogOpen: canvasDialogs.isCreateCanvasDialogOpen,
      draftCanvasId: canvasDialogs.draftCanvasId,
      createCanvasErrorMessage: canvasDialogs.createCanvasErrorMessage,
      onDraftCanvasIdChange: canvasDialogs.handleDraftCanvasIdChange,
      onCloseCreateCanvasDialog: canvasDialogs.closeCreateCanvasDialog,
      onConfirmCreateCanvas: canvasDialogs.confirmCreateCanvas,
      pendingBindingRequest: graphDialogBindings.pendingBindingRequest,
      onCancelPendingBinding: graphDialogBindings.cancelPendingBinding,
      onConfirmPendingBinding: graphDialogBindings.confirmPendingBinding,
      isGraphEditingLocked,
    }),
    [
      canvasDialogs.isCreateCanvasDialogOpen,
      canvasDialogs.draftCanvasId,
      canvasDialogs.createCanvasErrorMessage,
      canvasDialogs.handleDraftCanvasIdChange,
      canvasDialogs.closeCreateCanvasDialog,
      canvasDialogs.confirmCreateCanvas,
      graphDialogBindings.pendingBindingRequest,
      graphDialogBindings.cancelPendingBinding,
      graphDialogBindings.confirmPendingBinding,
      isGraphEditingLocked,
    ]
  )

  return {
    workflowDialogsProps,
  }
}
