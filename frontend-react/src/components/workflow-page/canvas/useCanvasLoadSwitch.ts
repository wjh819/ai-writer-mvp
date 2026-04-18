import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  buildCanvasSwitchErrorMessage,
  buildWorkflowStatusMessage,
  getLiveRunLockedMessage,
} from './canvasLifecycleMessages'
import type {
  LoadWorkflowActionResult,
  WorkflowLoadWarning,
  WorkflowSidecarData,
} from '../../../workflow-editor/workflowEditorUiTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'

interface UseCanvasLoadSwitchOptions {
  requestedCanvasId: string
  setRequestedCanvasId: (value: string) => void
  activeCanvasId: string
  setActiveCanvasId: (value: string) => void
  setActiveWorkflowContextId: Dispatch<SetStateAction<number>>
  setTemporaryCanvasId: (value: string | null) => void
  clearPageError: () => void
  setPageErrorMessage: (message: string) => void
  setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
  setIsSwitchingWorkflow: (value: boolean) => void
  loadCurrentWorkflow: (canvasId: string) => Promise<LoadWorkflowActionResult>
  resetGraphSideEffectsForCommittedWorkflow: (
    nextNodes: WorkflowEditorNode[],
    nextEdges: WorkflowEditorEdge[],
    nextContextLinks: WorkflowContextLink[],
    nextSidecar: WorkflowSidecarData
  ) => void
  isGraphEditingLocked: boolean
  confirmDiscardTemporaryCanvas: (nextCanvasId?: string) => boolean
}

export function useCanvasLoadSwitch({
  requestedCanvasId,
  setRequestedCanvasId,
  activeCanvasId,
  setActiveCanvasId,
  setActiveWorkflowContextId,
  setTemporaryCanvasId,
  clearPageError,
  setPageErrorMessage,
  setWorkflowWarnings,
  setIsSwitchingWorkflow,
  loadCurrentWorkflow,
  resetGraphSideEffectsForCommittedWorkflow,
  isGraphEditingLocked,
  confirmDiscardTemporaryCanvas,
}: UseCanvasLoadSwitchOptions) {
  const workflowLoadEpochRef = useRef(0)
  const inFlightWorkflowLoadRef = useRef<{
    canvasId: string
    requestEpoch: number
  } | null>(null)
  const hasLoadedInitialWorkflowRef = useRef(false)

  const workflowStatusMessage = useMemo(
    () => buildWorkflowStatusMessage(requestedCanvasId, activeCanvasId),
    [requestedCanvasId, activeCanvasId]
  )

  const commitWorkflowLoad = useCallback(
    async (params: {
      targetCanvasId: string
      previousActiveCanvasId: string
      requestEpoch: number
      shouldCommitAsActiveCanvas: boolean
    }) => {
      const {
        targetCanvasId,
        previousActiveCanvasId,
        requestEpoch,
        shouldCommitAsActiveCanvas,
      } = params

      setIsSwitchingWorkflow(true)

      try {
        const result = await loadCurrentWorkflow(targetCanvasId)

        if (workflowLoadEpochRef.current !== requestEpoch) {
          return
        }

        setIsSwitchingWorkflow(false)

        if (result.errorMessage) {
          setPageErrorMessage(
            shouldCommitAsActiveCanvas
              ? buildCanvasSwitchErrorMessage({
                  targetCanvasId,
                  activeCanvasId: previousActiveCanvasId,
                  errorMessage: result.errorMessage,
                })
              : result.errorMessage
          )

          if (shouldCommitAsActiveCanvas) {
            setRequestedCanvasId(previousActiveCanvasId)
          }

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
        hasLoadedInitialWorkflowRef.current = true

        if (shouldCommitAsActiveCanvas) {
          setActiveCanvasId(targetCanvasId)
          setTemporaryCanvasId(null)
          setActiveWorkflowContextId(prev => prev + 1)
        }
      } finally {
        if (inFlightWorkflowLoadRef.current?.requestEpoch === requestEpoch) {
          inFlightWorkflowLoadRef.current = null
        }
      }
    },
    [
      setIsSwitchingWorkflow,
      loadCurrentWorkflow,
      setPageErrorMessage,
      setRequestedCanvasId,
      clearPageError,
      setWorkflowWarnings,
      resetGraphSideEffectsForCommittedWorkflow,
      setActiveCanvasId,
      setTemporaryCanvasId,
      setActiveWorkflowContextId,
    ]
  )

  useEffect(() => {
    const isInitialLoad = !hasLoadedInitialWorkflowRef.current
    const isCanvasSwitch = requestedCanvasId !== activeCanvasId

    if (!isInitialLoad && !isCanvasSwitch) {
      return
    }

    const targetCanvasId = isInitialLoad ? activeCanvasId : requestedCanvasId
    const inFlight = inFlightWorkflowLoadRef.current

    if (inFlight && inFlight.canvasId === targetCanvasId) {
      if (import.meta.env.DEV) {
        console.debug(
          '[useCanvasLoadSwitch] skip duplicate workflow load',
          targetCanvasId
        )
      }
      return
    }

    const requestEpoch = workflowLoadEpochRef.current + 1
    workflowLoadEpochRef.current = requestEpoch
    inFlightWorkflowLoadRef.current = {
      canvasId: targetCanvasId,
      requestEpoch,
    }

    void commitWorkflowLoad({
      targetCanvasId,
      previousActiveCanvasId: activeCanvasId,
      requestEpoch,
      shouldCommitAsActiveCanvas: !isInitialLoad && isCanvasSwitch,
    })
  }, [requestedCanvasId, activeCanvasId, commitWorkflowLoad])

  const requestCanvasChange = useCallback(
    (nextCanvasId: string) => {
      if (!nextCanvasId || nextCanvasId === requestedCanvasId) {
        return
      }

      if (isGraphEditingLocked) {
        setPageErrorMessage(getLiveRunLockedMessage())
        return
      }

      if (!confirmDiscardTemporaryCanvas(nextCanvasId)) {
        return
      }

      clearPageError()
      setRequestedCanvasId(nextCanvasId)
    },
    [
      requestedCanvasId,
      isGraphEditingLocked,
      setPageErrorMessage,
      confirmDiscardTemporaryCanvas,
      clearPageError,
      setRequestedCanvasId,
    ]
  )

  const markWorkflowAsLoaded = useCallback(() => {
    hasLoadedInitialWorkflowRef.current = true
  }, [])

  return {
    workflowStatusMessage,
    requestCanvasChange,
    markWorkflowAsLoaded,
  }
}

