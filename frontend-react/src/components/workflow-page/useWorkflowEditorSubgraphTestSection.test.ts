// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { useWorkflowEditorSubgraphTestSection } from './useWorkflowEditorSubgraphTestSection'
import type { UseWorkflowSubgraphTestPanelResult } from './subgraphTestPanelTypes'
import { useWorkflowSubgraphTestPanel } from './useWorkflowSubgraphTestPanel'

vi.mock('./useWorkflowSubgraphTestPanel', () => ({
  useWorkflowSubgraphTestPanel: vi.fn(),
}))

type UseWorkflowEditorSubgraphTestSectionOptions = Parameters<
  typeof useWorkflowEditorSubgraphTestSection
>[0]

function createPanelResult(): UseWorkflowSubgraphTestPanelResult {
  return {
    panelState: {
      isSubgraphTestPanelExpanded: true,
      setIsSubgraphTestPanelExpanded: vi.fn(),
      requestSubgraphTestFromCanvas: vi.fn(),
      resetSubgraphTestPanelView: vi.fn(),
      isSubgraphTestLocked: false,
    },
    feedback: {
      subgraphTestPanelErrorMessage: 'error',
      subgraphTestInfoMessage: 'info',
      clearSubgraphTestFeedback: vi.fn(),
    },
    inputs: {
      effectiveSubgraphTestInputItems: [],
      currentPinnedInputDraftTexts: { k: 'v' },
      handlePinnedInputDraftChange: vi.fn(),
    },
    runner: {
      selectedSubgraphTestDisplayRun: null,
      handleRunSelectedSubgraphTest: vi.fn(async () => {}),
      handleClearSelectedSubgraphTestResult: vi.fn(),
      handleResetSubgraphTestReusableContext: vi.fn(),
    },
    invalidation: {
      commitSemanticGraphSnapshot: vi.fn(),
    },
  }
}

function createOptions(
  overrides: Partial<UseWorkflowEditorSubgraphTestSectionOptions> = {}
): UseWorkflowEditorSubgraphTestSectionOptions {
  const baseOptions: UseWorkflowEditorSubgraphTestSectionOptions = {
    graph: {
      activeCanvasId: 'article',
      graphSemanticVersion: 1,
      nodes: [],
      edges: [],
      contextLinks: [],
      selectedNode: null,
    },
    callbacks: {
      clearPageError: vi.fn(),
      onGraphPersistedChanged: vi.fn(),
      selectNodeById: vi.fn(),
    },
    runtime: {
      subgraphTestState: {},
      activeSubgraphTestResult: null,
      activeSubgraphTestStartNodeId: null,
      subgraphTestResultsByNodeId: {},
      staleSubgraphTestResultIds: {},
      lastSuccessfulSubgraphTestStartNodeId: null,
      getWorkflowSidecarNodeAssets: vi.fn(
        (() => ({ pinnedInputs: {}, metadata: {} })) as UseWorkflowEditorSubgraphTestSectionOptions['runtime']['getWorkflowSidecarNodeAssets']
      ),
      updateWorkflowSidecarNodeAssets: vi.fn(),
      pruneWorkflowSidecar: vi.fn(),
      markSubgraphTestResultStale: vi.fn(),
      clearSubgraphTestResultStale: vi.fn(),
      handleRunSubgraphTest: vi.fn(
        (async () => ({})) as UseWorkflowEditorSubgraphTestSectionOptions['runtime']['handleRunSubgraphTest']
      ),
      clearSubgraphTestResult: vi.fn(),
      pruneSubgraphTestArtifacts: vi.fn(),
      resetSubgraphTestState: vi.fn(),
      resetSubgraphTestContext: vi.fn(),
    },
    runStatus: {
      isLiveRunActive: false,
      isBatchRunActive: false,
    },
  }

  return {
    ...baseOptions,
    ...overrides,
  }
}

describe('useWorkflowEditorSubgraphTestSection', () => {
  const mockedUseWorkflowSubgraphTestPanel = vi.mocked(useWorkflowSubgraphTestPanel)

  beforeEach(() => {
    mockedUseWorkflowSubgraphTestPanel.mockReset()
  })

  it('exposes only adapter outputs and maps sectionBindings from panel result', () => {
    const panel = createPanelResult()
    mockedUseWorkflowSubgraphTestPanel.mockReturnValue(panel)
    const options = createOptions()

    const { result } = renderHook(() =>
      useWorkflowEditorSubgraphTestSection(options)
    )

    expect(Object.keys(result.current).sort()).toEqual(
      [
        'requestSubgraphTestFromCanvas',
        'resetSubgraphTestSectionForCommittedWorkflow',
        'sectionBindings',
      ].sort()
    )

    expect(result.current.requestSubgraphTestFromCanvas).toBe(
      panel.panelState.requestSubgraphTestFromCanvas
    )
    expect(result.current.sectionBindings).toMatchObject({
      isNodeTestLocked: panel.panelState.isSubgraphTestLocked,
      pinnedInputDraftTexts: panel.inputs.currentPinnedInputDraftTexts,
      onPinnedInputDraftChange: panel.inputs.handlePinnedInputDraftChange,
      isSubgraphTestExpanded: panel.panelState.isSubgraphTestPanelExpanded,
      onSetSubgraphTestExpanded: panel.panelState.setIsSubgraphTestPanelExpanded,
      effectiveSubgraphTestInputItems: panel.inputs.effectiveSubgraphTestInputItems,
      onRunSubgraphTest: panel.runner.handleRunSelectedSubgraphTest,
      onClearSubgraphTestResult: panel.runner.handleClearSelectedSubgraphTestResult,
      onResetSubgraphTestContext:
        panel.runner.handleResetSubgraphTestReusableContext,
      selectedSubgraphTestDisplayRun: panel.runner.selectedSubgraphTestDisplayRun,
      subgraphTestErrorMessage: panel.feedback.subgraphTestPanelErrorMessage,
      subgraphTestInfoMessage: panel.feedback.subgraphTestInfoMessage,
    })
  })

  it('passes lock state to panel and keeps section as adapter', () => {
    const panel = createPanelResult()
    mockedUseWorkflowSubgraphTestPanel.mockReturnValue(panel)
    const options = createOptions({
      runStatus: {
        isLiveRunActive: true,
        isBatchRunActive: false,
      },
    })

    renderHook(() => useWorkflowEditorSubgraphTestSection(options))

    expect(mockedUseWorkflowSubgraphTestPanel).toHaveBeenCalledTimes(1)
    expect(mockedUseWorkflowSubgraphTestPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        locking: { isNodeTestLocked: true },
      })
    )
  })

  it('committed workflow reset triggers context reset, semantic snapshot, and panel view reset', () => {
    const panel = createPanelResult()
    mockedUseWorkflowSubgraphTestPanel.mockReturnValue(panel)
    const options = createOptions()
    const { result } = renderHook(() =>
      useWorkflowEditorSubgraphTestSection(options)
    )

    act(() => {
      result.current.resetSubgraphTestSectionForCommittedWorkflow([], [], [])
    })

    expect(options.runtime.resetSubgraphTestContext).toHaveBeenCalledTimes(1)
    expect(panel.invalidation.commitSemanticGraphSnapshot).toHaveBeenCalledWith(
      [],
      [],
      []
    )
    expect(panel.panelState.resetSubgraphTestPanelView).toHaveBeenCalledTimes(1)
  })
})
