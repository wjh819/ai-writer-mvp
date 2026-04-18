import { useState } from 'react'

interface UseSubgraphTestSectionStateOptions {
  isLiveRunActive: boolean
  isBatchRunActive: boolean
}

export function useSubgraphTestSectionState({
  isLiveRunActive,
  isBatchRunActive,
}: UseSubgraphTestSectionStateOptions) {
  const [isSubgraphTestPanelExpanded, setIsSubgraphTestPanelExpanded] =
    useState(false)
  const [requestedSubgraphTestNodeId, setRequestedSubgraphTestNodeId] =
    useState<string | null>(null)

  const isNodeTestLocked = isLiveRunActive || isBatchRunActive

  return {
    isNodeTestLocked,
    panelState: {
      isSubgraphTestPanelExpanded,
      setIsSubgraphTestPanelExpanded,
      requestedSubgraphTestNodeId,
      setRequestedSubgraphTestNodeId,
    },
  }
}
