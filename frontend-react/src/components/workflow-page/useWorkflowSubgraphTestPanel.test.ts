// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSubgraphPinnedInputs } from './subgraph/useSubgraphPinnedInputs'
import { useSubgraphTestInvalidation } from './subgraph/useSubgraphTestInvalidation'
import { useSubgraphTestPanelLifecycle } from './subgraph/useSubgraphTestPanelLifecycle'
import { useSubgraphTestPanelState } from './subgraph/useSubgraphTestPanelState'
import { useSubgraphTestRunner } from './subgraph/useSubgraphTestRunner'
import { useWorkflowSubgraphTestPanel } from './subgraph/useWorkflowSubgraphTestPanel'

vi.mock('./subgraph/useSubgraphTestPanelState', () => ({
  useSubgraphTestPanelState: vi.fn(),
}))
vi.mock('./subgraph/useSubgraphTestInvalidation', () => ({
  useSubgraphTestInvalidation: vi.fn(),
}))
vi.mock('./subgraph/useSubgraphPinnedInputs', () => ({
  useSubgraphPinnedInputs: vi.fn(),
}))
vi.mock('./subgraph/useSubgraphTestRunner', () => ({
  useSubgraphTestRunner: vi.fn(),
}))
vi.mock('./subgraph/useSubgraphTestPanelLifecycle', () => ({
  useSubgraphTestPanelLifecycle: vi.fn(),
}))

describe('useWorkflowSubgraphTestPanel', () => {
  const mockedUseSubgraphTestPanelState = vi.mocked(useSubgraphTestPanelState)
  const mockedUseSubgraphTestInvalidation = vi.mocked(useSubgraphTestInvalidation)
  const mockedUseSubgraphPinnedInputs = vi.mocked(useSubgraphPinnedInputs)
  const mockedUseSubgraphTestRunner = vi.mocked(useSubgraphTestRunner)
  const mockedUseSubgraphTestPanelLifecycle = vi.mocked(
    useSubgraphTestPanelLifecycle
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('composes sub-hooks from grouped runtime/callback bindings and keeps facade outputs stable', () => {
    const requestSubgraphTestFromCanvas = vi.fn()
    const resetSubgraphTestPanelView = vi.fn()
    const feedback = {
      errorMessage: 'error',
      infoMessage: 'info',
      setErrorMessage: vi.fn(),
      setInfoMessage: vi.fn(),
      clear: vi.fn(),
    }
    mockedUseSubgraphTestPanelState.mockReturnValue({
      isSubgraphTestPanelExpanded: true,
      feedback,
      requestSubgraphTestFromCanvas,
      resetSubgraphTestPanelView,
    } as never)

    const commitSemanticGraphSnapshot = vi.fn()
    mockedUseSubgraphTestInvalidation.mockReturnValue({
      commitSemanticGraphSnapshot,
    })

    const effectiveSubgraphTestInputItems = [{ targetInput: 'x' }] as never
    const handlePinnedInputDraftChange = vi.fn()
    mockedUseSubgraphPinnedInputs.mockReturnValue({
      selectedNodeSidecarAssets: null,
      effectiveSubgraphTestInputItems,
      currentPinnedInputDraftTexts: { x: '1' },
      handlePinnedInputDraftChange,
    } as never)

    const selectedSubgraphTestDisplayRun = { status: 'succeeded' } as never
    const handleRunSelectedSubgraphTest = vi.fn(async () => {})
    const handleClearSelectedSubgraphTestResult = vi.fn()
    const handleResetSubgraphTestReusableContext = vi.fn()
    mockedUseSubgraphTestRunner.mockReturnValue({
      selectedSubgraphTestDisplayRun,
      handleRunSelectedSubgraphTest,
      handleClearSelectedSubgraphTestResult,
      handleResetSubgraphTestReusableContext,
    } as never)

    const options: Parameters<typeof useWorkflowSubgraphTestPanel>[0] = {
      graph: {
        activeCanvasId: 'article',
        graphSemanticVersion: 5,
        nodes: [{ id: 'n1' }] as never,
        edges: [{ id: 'e1' }] as never,
        contextLinks: [{ id: 'c1' }] as never,
        selectedNode: { id: 'n1' } as never,
      },
      panelState: {
        requestedSubgraphTestNodeId: 'n1',
        setRequestedSubgraphTestNodeId: vi.fn(),
        isSubgraphTestPanelExpanded: false,
        setIsSubgraphTestPanelExpanded: vi.fn(),
      },
      callbacks: {
        clearPageError: vi.fn(),
        onGraphPersistedChanged: vi.fn(),
        selectNodeById: vi.fn(),
      },
      runtime: {
        state: {
          subgraphTestState: { k: 'v' },
          activeSubgraphTestResult: null,
          activeSubgraphTestStartNodeId: null,
          subgraphTestResultsByNodeId: {},
          staleSubgraphTestResultIds: {},
          lastSuccessfulSubgraphTestStartNodeId: null,
        },
        actions: {
          markSubgraphTestResultStale: vi.fn(),
          clearSubgraphTestResultStale: vi.fn(),
          handleRunSubgraphTest: vi.fn(async () => ({})),
          clearSubgraphTestResult: vi.fn(),
          pruneSubgraphTestArtifacts: vi.fn(),
          resetSubgraphTestState: vi.fn(),
        },
        sidecar: {
          getWorkflowSidecarNodeAssets: vi.fn(
            (() => ({ pinnedInputs: {}, metadata: {} })) as never
          ),
          updateWorkflowSidecarNodeAssets: vi.fn(),
          pruneWorkflowSidecar: vi.fn(),
        },
      },
      locking: {
        isNodeTestLocked: true,
      },
    }

    const { result } = renderHook(() => useWorkflowSubgraphTestPanel(options))

    expect(mockedUseSubgraphTestPanelState).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedSubgraphTestNodeId: 'n1',
        selectNodeById: options.callbacks.selectNodeById,
        clearPageError: options.callbacks.clearPageError,
        isNodeTestLocked: true,
      })
    )
    expect(mockedUseSubgraphTestInvalidation).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSemanticVersion: 5,
        markSubgraphTestResultStale: options.runtime.actions.markSubgraphTestResultStale,
        feedback,
      })
    )
    expect(mockedUseSubgraphPinnedInputs).toHaveBeenCalledWith(
      expect.objectContaining({
        onGraphPersistedChanged: options.callbacks.onGraphPersistedChanged,
        getWorkflowSidecarNodeAssets: options.runtime.sidecar.getWorkflowSidecarNodeAssets,
        feedback,
      })
    )
    expect(mockedUseSubgraphTestRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveSubgraphTestInputItems,
        handleRunSubgraphTest: options.runtime.actions.handleRunSubgraphTest,
        feedback,
      })
    )
    expect(mockedUseSubgraphTestPanelLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        pruneSubgraphTestArtifacts: options.runtime.actions.pruneSubgraphTestArtifacts,
        pruneWorkflowSidecar: options.runtime.sidecar.pruneWorkflowSidecar,
      })
    )

    expect(result.current.panelState.requestSubgraphTestFromCanvas).toBe(
      requestSubgraphTestFromCanvas
    )
    expect(result.current.panelState.isSubgraphTestLocked).toBe(true)
    expect(result.current.feedback.subgraphTestPanelErrorMessage).toBe('error')
    expect(result.current.feedback.subgraphTestInfoMessage).toBe('info')
    expect(result.current.feedback.clearSubgraphTestFeedback).toBe(feedback.clear)
    expect(result.current.inputs.handlePinnedInputDraftChange).toBe(
      handlePinnedInputDraftChange
    )
    expect(result.current.runner.selectedSubgraphTestDisplayRun).toBe(
      selectedSubgraphTestDisplayRun
    )
    expect(result.current.invalidation.commitSemanticGraphSnapshot).toBe(
      commitSemanticGraphSnapshot
    )
  })
})
