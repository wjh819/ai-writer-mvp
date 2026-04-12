import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SubgraphTestPanelFeedbackBinding } from './subgraphTestPanelTypes'

interface UseSubgraphTestPanelStateOptions {
  requestedSubgraphTestNodeId: string | null
  setRequestedSubgraphTestNodeId: (value: string | null) => void
  isSubgraphTestPanelExpanded: boolean
  setIsSubgraphTestPanelExpanded: (value: boolean) => void
  selectNodeById: (nodeId: string) => void
  clearPageError: () => void
  isNodeTestLocked: boolean
  nodeTestLockMessage: string
}

export function useSubgraphTestPanelState({
  requestedSubgraphTestNodeId,
  setRequestedSubgraphTestNodeId,
  isSubgraphTestPanelExpanded,
  setIsSubgraphTestPanelExpanded,
  selectNodeById,
  clearPageError,
  isNodeTestLocked,
  nodeTestLockMessage,
}: UseSubgraphTestPanelStateOptions) {
  const [subgraphTestPanelErrorMessage, setSubgraphTestPanelErrorMessage] =
    useState('')
  const [subgraphTestInfoMessage, setSubgraphTestInfoMessage] = useState('')

  const clearSubgraphTestFeedback = useCallback(() => {
    setSubgraphTestPanelErrorMessage('')
    setSubgraphTestInfoMessage('')
  }, [])

  const requestSubgraphTestFromCanvas = useCallback(
    (nodeId: string) => {
      if (isNodeTestLocked) {
        setSubgraphTestPanelErrorMessage(nodeTestLockMessage)
        return
      }

      setRequestedSubgraphTestNodeId(nodeId)
      setIsSubgraphTestPanelExpanded(true)
      clearSubgraphTestFeedback()
      clearPageError()
    },
    [
      isNodeTestLocked,
      setRequestedSubgraphTestNodeId,
      setIsSubgraphTestPanelExpanded,
      clearSubgraphTestFeedback,
      clearPageError,
      nodeTestLockMessage,
    ]
  )

  const resetSubgraphTestPanelView = useCallback(() => {
    setIsSubgraphTestPanelExpanded(false)
    setRequestedSubgraphTestNodeId(null)
    clearSubgraphTestFeedback()
  }, [
    setIsSubgraphTestPanelExpanded,
    setRequestedSubgraphTestNodeId,
    clearSubgraphTestFeedback,
  ])

  useEffect(() => {
    if (!requestedSubgraphTestNodeId) {
      return
    }

    selectNodeById(requestedSubgraphTestNodeId)
    setRequestedSubgraphTestNodeId(null)
  }, [
    requestedSubgraphTestNodeId,
    selectNodeById,
    setRequestedSubgraphTestNodeId,
  ])

const feedback: SubgraphTestPanelFeedbackBinding = useMemo(
  () => ({
    errorMessage: subgraphTestPanelErrorMessage,
    infoMessage: subgraphTestInfoMessage,
    setErrorMessage: setSubgraphTestPanelErrorMessage,
    setInfoMessage: setSubgraphTestInfoMessage,
    clear: clearSubgraphTestFeedback,
  }),
  [
    subgraphTestPanelErrorMessage,
    subgraphTestInfoMessage,
    clearSubgraphTestFeedback,
  ]
)

  return {
    isSubgraphTestPanelExpanded,
    feedback,
    requestSubgraphTestFromCanvas,
    resetSubgraphTestPanelView,
  }
}
