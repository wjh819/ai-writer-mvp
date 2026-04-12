import { useCallback, useMemo } from 'react'

import {
  buildDiscardTemporaryCanvasConfirmationMessage,
  buildTemporaryCanvasStatusMessage,
} from './canvasLifecycleMessages'

interface CanvasSummary {
  canvas_id: string
  label: string
}

interface UseCanvasLifecycleStatusOptions {
  canvasList: CanvasSummary[]
  activeCanvasId: string
  temporaryCanvasId: string | null
}

export interface UseCanvasLifecycleStatusResult {
  isActiveCanvasTemporary: boolean
  formalCanvasIds: string[]
  remainingFormalCanvasIds: string[]
  canDeleteCurrentCanvas: boolean
  temporaryCanvasStatusMessage: string
  confirmDiscardTemporaryCanvas: (nextCanvasId?: string) => boolean
}

export function useCanvasLifecycleStatus({
  canvasList,
  activeCanvasId,
  temporaryCanvasId,
}: UseCanvasLifecycleStatusOptions): UseCanvasLifecycleStatusResult {
  const isActiveCanvasTemporary = temporaryCanvasId === activeCanvasId

  const formalCanvasIds = useMemo(
    () => canvasList.map(item => item.canvas_id),
    [canvasList]
  )

  const remainingFormalCanvasIds = useMemo(
    () => formalCanvasIds.filter(canvasId => canvasId !== activeCanvasId),
    [formalCanvasIds, activeCanvasId]
  )

  const canDeleteCurrentCanvas = isActiveCanvasTemporary
    ? formalCanvasIds.length > 0
    : formalCanvasIds.length > 1

  const temporaryCanvasStatusMessage = useMemo(() => {
    return buildTemporaryCanvasStatusMessage(
      isActiveCanvasTemporary,
      activeCanvasId
    )
  }, [isActiveCanvasTemporary, activeCanvasId])

  const confirmDiscardTemporaryCanvas = useCallback(
    (nextCanvasId?: string) => {
      if (!isActiveCanvasTemporary) {
        return true
      }

      return window.confirm(
        buildDiscardTemporaryCanvasConfirmationMessage({
          activeCanvasId,
          nextCanvasId,
        })
      )
    },
    [isActiveCanvasTemporary, activeCanvasId]
  )

  return {
    isActiveCanvasTemporary,
    formalCanvasIds,
    remainingFormalCanvasIds,
    canDeleteCurrentCanvas,
    temporaryCanvasStatusMessage,
    confirmDiscardTemporaryCanvas,
  }
}
