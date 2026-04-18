// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWorkflowEditorRunSection } from './graph/useWorkflowEditorRunSection'

function createOptions(overrides: Partial<Parameters<typeof useWorkflowEditorRunSection>[0]> = {}) {
  return {
    nodes: [],
    edges: [],
    contextLinks: [],
    inputNodes: [],
    runtime: {
      runInputs: {},
      syncRunInputs: vi.fn(),
    },
    batchInputText: '',
    batchMaxParallel: 4,
    setPageErrorMessage: vi.fn(),
    startLiveRun: vi.fn(async () => ({ liveRunStart: {} })),
    startBatchRun: vi.fn(async () => ({ batchSummary: {} })),
    cancelBatchRun: vi.fn(async () => ({})),
    ...overrides,
  }
}

describe('useWorkflowEditorRunSection', () => {
  it('syncs run inputs from current inputNodes', () => {
    const firstInputNodes = [{ id: 'input-1' }] as never
    const secondInputNodes = [{ id: 'input-2' }] as never
    const options = createOptions({ inputNodes: firstInputNodes })
    const syncRunInputs = options.runtime.syncRunInputs

    const { rerender } = renderHook(hookOptions => useWorkflowEditorRunSection(hookOptions), {
      initialProps: options,
    })

    expect(syncRunInputs).toHaveBeenCalledWith(firstInputNodes)

    rerender({ ...options, inputNodes: secondInputNodes })

    expect(syncRunInputs).toHaveBeenCalledWith(secondInputNodes)
  })
})
