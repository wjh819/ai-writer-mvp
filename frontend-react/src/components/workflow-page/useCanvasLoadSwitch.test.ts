// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCanvasLoadSwitch } from './canvas/useCanvasLoadSwitch'
import type { LoadWorkflowActionResult } from '../../workflow-editor/runtimeActionTypes'

function createLoadResult(
  overrides: Partial<LoadWorkflowActionResult> = {}
): LoadWorkflowActionResult {
  return {
    nodes: [],
    edges: [],
    contextLinks: [],
    sidecar: { nodes: {} },
    warnings: [],
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

function createBaseProps(
  overrides: Partial<
    Parameters<typeof useCanvasLoadSwitch>[0]
  > = {}
): Parameters<typeof useCanvasLoadSwitch>[0] {
  return {
    requestedCanvasId: 'article',
    setRequestedCanvasId: vi.fn(),
    activeCanvasId: 'article',
    setActiveCanvasId: vi.fn(),
    setActiveWorkflowContextId: vi.fn(),
    setTemporaryCanvasId: vi.fn(),
    clearPageError: vi.fn(),
    setPageErrorMessage: vi.fn(),
    setWorkflowWarnings: vi.fn(),
    setIsSwitchingWorkflow: vi.fn(),
    loadCurrentWorkflow: vi.fn().mockResolvedValue(createLoadResult()),
    resetGraphSideEffectsForCommittedWorkflow: vi.fn(),
    isGraphEditingLocked: false,
    confirmDiscardTemporaryCanvas: vi.fn().mockReturnValue(true),
    ...overrides,
  }
}

describe('useCanvasLoadSwitch', () => {
  it('avoids duplicate concurrent load for the initial same canvas', async () => {
    const deferred = createDeferred<LoadWorkflowActionResult>()
    const loadCurrentWorkflow = vi.fn().mockReturnValue(deferred.promise)
    const props = createBaseProps({
      loadCurrentWorkflow,
      setWorkflowWarnings: vi.fn(),
    })

    const { rerender } = renderHook(
      hookProps => useCanvasLoadSwitch(hookProps),
      { initialProps: props }
    )

    await waitFor(() => {
      expect(loadCurrentWorkflow).toHaveBeenCalledTimes(1)
      expect(loadCurrentWorkflow).toHaveBeenCalledWith('article')
    })

    rerender({
      ...props,
      setWorkflowWarnings: vi.fn(),
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(loadCurrentWorkflow).toHaveBeenCalledTimes(1)
  })

  it('loads a new canvas target when switching requested canvas', async () => {
    const loadCurrentWorkflow = vi
      .fn()
      .mockResolvedValue(createLoadResult())
    const props = createBaseProps({
      loadCurrentWorkflow,
      requestedCanvasId: 'article',
      activeCanvasId: 'article',
    })

    const { rerender } = renderHook(
      hookProps => useCanvasLoadSwitch(hookProps),
      { initialProps: props }
    )

    await waitFor(() => {
      expect(loadCurrentWorkflow).toHaveBeenCalledTimes(1)
      expect(loadCurrentWorkflow).toHaveBeenNthCalledWith(1, 'article')
    })

    rerender({
      ...props,
      requestedCanvasId: 'news',
      activeCanvasId: 'article',
    })

    await waitFor(() => {
      expect(loadCurrentWorkflow).toHaveBeenCalledTimes(2)
      expect(loadCurrentWorkflow).toHaveBeenNthCalledWith(2, 'news')
    })
  })

  it('releases in-flight guard after failure and allows retry', async () => {
    const deferred = createDeferred<LoadWorkflowActionResult>()
    const loadCurrentWorkflow = vi
      .fn()
      .mockReturnValueOnce(deferred.promise)
      .mockResolvedValue(createLoadResult())
    const props = createBaseProps({
      loadCurrentWorkflow,
      setWorkflowWarnings: vi.fn(),
    })

    const { rerender } = renderHook(
      hookProps => useCanvasLoadSwitch(hookProps),
      { initialProps: props }
    )

    await waitFor(() => {
      expect(loadCurrentWorkflow).toHaveBeenCalledTimes(1)
    })

    rerender({
      ...props,
      setWorkflowWarnings: vi.fn(),
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(loadCurrentWorkflow).toHaveBeenCalledTimes(1)

    await act(async () => {
      deferred.resolve(createLoadResult({ errorMessage: 'load failed' }))
      await deferred.promise
    })

    rerender({
      ...props,
      setWorkflowWarnings: vi.fn(),
    })

    await waitFor(() => {
      expect(loadCurrentWorkflow).toHaveBeenCalledTimes(2)
      expect(loadCurrentWorkflow).toHaveBeenNthCalledWith(2, 'article')
    })
  })
})
