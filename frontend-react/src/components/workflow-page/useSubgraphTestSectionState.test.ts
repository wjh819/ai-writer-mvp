// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSubgraphTestSectionState } from './subgraph/useSubgraphTestSectionState'

describe('useSubgraphTestSectionState', () => {
  it('derives lock state from live/batch run status', () => {
    const { result, rerender } = renderHook(
      ({ isLiveRunActive, isBatchRunActive }) =>
        useSubgraphTestSectionState({ isLiveRunActive, isBatchRunActive }),
      {
        initialProps: {
          isLiveRunActive: false,
          isBatchRunActive: false,
        },
      }
    )

    expect(result.current.isNodeTestLocked).toBe(false)

    rerender({ isLiveRunActive: true, isBatchRunActive: false })
    expect(result.current.isNodeTestLocked).toBe(true)

    rerender({ isLiveRunActive: false, isBatchRunActive: true })
    expect(result.current.isNodeTestLocked).toBe(true)
  })

  it('keeps section-local panel state for request/expanded flags', () => {
    const { result } = renderHook(() =>
      useSubgraphTestSectionState({
        isLiveRunActive: false,
        isBatchRunActive: false,
      })
    )

    act(() => {
      result.current.panelState.setRequestedSubgraphTestNodeId('node-1')
      result.current.panelState.setIsSubgraphTestPanelExpanded(true)
    })

    expect(result.current.panelState.requestedSubgraphTestNodeId).toBe('node-1')
    expect(result.current.panelState.isSubgraphTestPanelExpanded).toBe(true)
  })
})
