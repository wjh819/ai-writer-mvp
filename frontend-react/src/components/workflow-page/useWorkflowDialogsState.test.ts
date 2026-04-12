// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWorkflowDialogsState } from './useWorkflowDialogsState'

function createOptions(isGraphEditingLocked = false) {
  const onDraftCanvasIdChange = vi.fn()
  const onCloseCreateCanvasDialog = vi.fn()
  const onConfirmCreateCanvas = vi.fn()
  const onCancelPendingBinding = vi.fn()
  const onConfirmPendingBinding = vi.fn()

  return {
    canvasDialogs: {
      isCreateCanvasDialogOpen: true,
      draftCanvasId: 'new-canvas',
      createCanvasErrorMessage: 'duplicate id',
      handleDraftCanvasIdChange: onDraftCanvasIdChange,
      closeCreateCanvasDialog: onCloseCreateCanvasDialog,
      confirmCreateCanvas: onConfirmCreateCanvas,
    },
    graphDialogBindings: {
      pendingBindingRequest: {
        source: 'prompt_1',
        sourceOutput: 'text',
        target: 'prompt_2',
      },
      cancelPendingBinding: onCancelPendingBinding,
      confirmPendingBinding: onConfirmPendingBinding,
    },
    isGraphEditingLocked,
  }
}

describe('useWorkflowDialogsState', () => {
  it('collects create-canvas and pending-binding props into a single dialogs contract', () => {
    const options = createOptions(false)

    const { result } = renderHook(() => useWorkflowDialogsState(options))

    expect(result.current.workflowDialogsProps.isCreateCanvasDialogOpen).toBe(true)
    expect(result.current.workflowDialogsProps.draftCanvasId).toBe('new-canvas')
    expect(result.current.workflowDialogsProps.createCanvasErrorMessage).toBe(
      'duplicate id'
    )
    expect(result.current.workflowDialogsProps.pendingBindingRequest).toEqual({
      source: 'prompt_1',
      sourceOutput: 'text',
      target: 'prompt_2',
    })
    expect(result.current.workflowDialogsProps.onDraftCanvasIdChange).toBe(
      options.canvasDialogs.handleDraftCanvasIdChange
    )
    expect(result.current.workflowDialogsProps.onCancelPendingBinding).toBe(
      options.graphDialogBindings.cancelPendingBinding
    )
    expect(result.current.workflowDialogsProps.onConfirmPendingBinding).toBe(
      options.graphDialogBindings.confirmPendingBinding
    )
  })

  it('forwards isGraphEditingLocked from display run status', () => {
    const unlocked = createOptions(false)
    const locked = createOptions(true)

    const { result, rerender } = renderHook(
      options => useWorkflowDialogsState(options),
      {
        initialProps: unlocked,
      }
    )

    expect(result.current.workflowDialogsProps.isGraphEditingLocked).toBe(false)

    rerender(locked)

    expect(result.current.workflowDialogsProps.isGraphEditingLocked).toBe(true)
  })
})
