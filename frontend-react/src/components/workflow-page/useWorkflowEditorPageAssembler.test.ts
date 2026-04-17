// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkflowRuntime } from '../../workflow-editor/controllers/useWorkflowRuntime'
import {
  useWorkflowEditorDisplayRunSection,
  useWorkflowEditorDisplayRunState,
} from './useWorkflowEditorDisplayRunSection'
import { useWorkflowDialogsState } from './useWorkflowDialogsState'
import { useWorkflowEditorCanvasSection } from './useWorkflowEditorCanvasSection'
import { useWorkflowEditorGraphSection } from './useWorkflowEditorGraphSection'
import { useWorkflowEditorRunSection } from './useWorkflowEditorRunSection'
import { useWorkflowEditorSubgraphTestSection } from './useWorkflowEditorSubgraphTestSection'
import { useWorkflowEditorPageAssembler } from './useWorkflowEditorPageAssembler'
import { useWorkflowPanels } from './useWorkflowPanels'

vi.mock('../../workflow-editor/controllers/useWorkflowRuntime', () => ({
  useWorkflowRuntime: vi.fn(),
}))
vi.mock('./useWorkflowEditorDisplayRunSection', () => ({
  useWorkflowEditorDisplayRunSection: vi.fn(),
  useWorkflowEditorDisplayRunState: vi.fn(),
}))
vi.mock('./useWorkflowEditorGraphSection', () => ({
  useWorkflowEditorGraphSection: vi.fn(),
}))
vi.mock('./useWorkflowEditorSubgraphTestSection', () => ({
  useWorkflowEditorSubgraphTestSection: vi.fn(),
}))
vi.mock('./useWorkflowEditorCanvasSection', () => ({
  useWorkflowEditorCanvasSection: vi.fn(),
}))
vi.mock('./useWorkflowEditorRunSection', () => ({
  useWorkflowEditorRunSection: vi.fn(),
}))
vi.mock('./useWorkflowPanels', () => ({
  useWorkflowPanels: vi.fn(),
}))
vi.mock('./useWorkflowDialogsState', () => ({
  useWorkflowDialogsState: vi.fn(),
}))

type UseWorkflowEditorPageAssemblerOptions = Parameters<
  typeof useWorkflowEditorPageAssembler
>[0]
type WorkflowEditorPageContext = UseWorkflowEditorPageAssemblerOptions['pageContext']
type WorkflowEditorGraphSectionOptions = Parameters<
  typeof useWorkflowEditorGraphSection
>[0]

function createPageContext(): WorkflowEditorPageContext {
  return {
    canvasState: {
      requestedCanvasId: 'article',
      activeCanvasId: 'article',
      activeWorkflowContextId: 7,
      temporaryCanvasId: null,
    },
    canvasActions: {
      setRequestedCanvasId: vi.fn(),
      setActiveCanvasId: vi.fn(),
      setActiveWorkflowContextId: vi.fn(),
      setTemporaryCanvasId: vi.fn(),
    },
    graphState: {
      graphSemanticVersion: 3,
      graphPersistedVersion: 2,
      committedGraphPersistedVersion: 2,
      isGraphDirty: true,
    },
    graphActions: {
      setGraphSemanticVersion: vi.fn(),
      setGraphPersistedVersion: vi.fn(),
      setCommittedGraphPersistedVersion: vi.fn(),
      handleGraphSemanticChanged: vi.fn(),
      handleGraphPersistedChanged: vi.fn(),
    },
    pageState: {
      workflowWarnings: [],
      pageErrorMessage: '',
      isSwitchingWorkflow: false,
      isModelResourcePanelOpen: false,
    },
    pageActions: {
      setWorkflowWarnings: vi.fn(),
      setPageErrorMessage: vi.fn(),
      clearPageError: vi.fn(),
      setIsSwitchingWorkflow: vi.fn(),
      setIsModelResourcePanelOpen: vi.fn(),
    },
  }
}

function createRuntimeMock() {
  return {
    bootstrap: {
      canvasList: [],
      modelResources: [],
      bootstrapErrorMessage: '',
      refreshWorkflowList: vi.fn(async () => ({})),
      refreshModelResources: vi.fn(async () => ({})),
    },
    persistence: {
      isSaving: false,
      isRunning: false,
      isDeleting: false,
      isLoadingWorkflow: false,
      loadCurrentWorkflow: vi.fn(async () => ({
        nodes: [],
        edges: [],
        contextLinks: [],
        sidecar: { nodes: {} },
        warnings: [],
      })),
      handleSave: vi.fn(async () => ({})),
      handleDeleteCanvas: vi.fn(async () => ({})),
    },
    runInputs: {
      runInputs: {},
      updateRunInput: vi.fn(),
      syncRunInputs: vi.fn(),
      resetRunInputContext: vi.fn(),
    },
    sidecar: {
      workflowSidecar: { nodes: {} },
      replaceWorkflowSidecar: vi.fn(),
      resetWorkflowSidecar: vi.fn(),
      getWorkflowSidecarNodeAssets: vi.fn(),
      setWorkflowSidecarNodeAssets: vi.fn(),
      updateWorkflowSidecarNodeAssets: vi.fn(),
      pruneWorkflowSidecar: vi.fn(),
    },
    subgraphTest: {
      subgraphTestState: {},
      activeSubgraphTestResult: null,
      activeSubgraphTestStartNodeId: null,
      subgraphTestResultsByNodeId: {},
      staleSubgraphTestResultIds: {},
      runningSubgraphTestNodeId: null,
      lastSuccessfulSubgraphTestStartNodeId: null,
      markSubgraphTestResultStale: vi.fn(),
      clearSubgraphTestResultStale: vi.fn(),
      handleRunSubgraphTest: vi.fn(async () => ({})),
      clearSubgraphTestResult: vi.fn(),
      pruneSubgraphTestArtifacts: vi.fn(),
      resetSubgraphTestState: vi.fn(),
      resetSubgraphTestContext: vi.fn(),
    },
    runExecution: {
      handleRun: vi.fn(async () => ({})),
      handleStartLiveRun: vi.fn(async () => ({})),
      handleFetchActiveLiveRun: vi.fn(async () => ({})),
      handleStartBatchRun: vi.fn(async () => ({})),
      handleFetchBatchSummary: vi.fn(async () => ({})),
      handleFetchBatchItemDetail: vi.fn(async () => ({})),
      handleCancelBatchRun: vi.fn(async () => ({})),
    },
  }
}

describe('useWorkflowEditorPageAssembler', () => {
  const mockedUseWorkflowRuntime = vi.mocked(useWorkflowRuntime)
  const mockedUseWorkflowEditorDisplayRunSection = vi.mocked(
    useWorkflowEditorDisplayRunSection
  )
  const mockedUseWorkflowEditorDisplayRunState = vi.mocked(
    useWorkflowEditorDisplayRunState
  )
  const mockedUseWorkflowEditorGraphSection = vi.mocked(
    useWorkflowEditorGraphSection
  )
  const mockedUseWorkflowEditorSubgraphTestSection = vi.mocked(
    useWorkflowEditorSubgraphTestSection
  )
  const mockedUseWorkflowEditorCanvasSection = vi.mocked(
    useWorkflowEditorCanvasSection
  )
  const mockedUseWorkflowEditorRunSection = vi.mocked(useWorkflowEditorRunSection)
  const mockedUseWorkflowPanels = vi.mocked(useWorkflowPanels)
  const mockedUseWorkflowDialogsState = vi.mocked(useWorkflowDialogsState)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps section bridge wiring and only exposes panels+dialogs contract', () => {
    const pageContext = createPageContext()
    const runtime = createRuntimeMock()

    const runResult = { status: 'succeeded' }
    const inputNodes = [{ id: 'input-1' }]
    const graphNodes = [{ id: 'n1' }]
    const graphEdges = [{ id: 'e1' }]
    const contextLinks = [{ id: 'c1' }]

    mockedUseWorkflowRuntime.mockReturnValue(runtime as never)

    const displayRunSection = {
      state: {
        runContext: { workflowContextId: 7, runResult },
        activeLiveRunSnapshot: null,
        selectedBatchDisplayRun: null,
        batchSummary: null,
        displayRun: null,
        isBatchResultStale: false,
        selectedBatchItemId: null,
        lastPollErrorMessage: '',
        batchLastPollErrorMessage: '',
      },
      status: {
        isGraphEditingLocked: false,
        isLiveRunActive: false,
        isBatchRunActive: false,
        isBatchCancelRequested: false,
      },
      actions: {
        clearLiveRunState: vi.fn(),
        clearBatchRunState: vi.fn(),
        clearRunState: vi.fn(),
        clearAllRunState: vi.fn(),
        startLiveRun: vi.fn(async () => ({})),
        startBatchRun: vi.fn(async () => ({})),
        selectBatchItem: vi.fn(async () => ({})),
        cancelBatchRun: vi.fn(async () => ({})),
      },
    }
    mockedUseWorkflowEditorDisplayRunSection.mockReturnValue(
      displayRunSection as never
    )

    const displayRunState = {
      selectedEdge: null,
      selectedDisplayNode: null,
      topLevelErrorMessage: '',
      workflowWarningsMessage: '',
      draftStatusMessage: '',
      activeRunStatusMessage: '',
      selectedBatchSummaryItem: null,
      hasAnyRunArtifact: false,
      effectiveDisplayRun: null,
      hasBatchResult: false,
      hasAnyNodes: true,
    }
    mockedUseWorkflowEditorDisplayRunState.mockReturnValue(displayRunState as never)

    const graphSection = {
      stateBindings: {
        nodes: graphNodes,
        edges: graphEdges,
        contextLinks,
        selectedNode: null,
        selectedEdgeId: null,
      },
      sidebarBindings: {
        addNodeByType: vi.fn(),
        inputNodes,
      },
      canvasBindings: {
        selectedContextEdge: null,
        displayNodes: [],
        displayEdges: [],
        onNodesChange: vi.fn(),
        handleEdgesChange: vi.fn(),
        onConnect: vi.fn(),
        handleEdgeClick: vi.fn(),
        handlePaneClick: vi.fn(),
        handleNodeClick: vi.fn(),
        handleSelectionChange: vi.fn(),
        deleteSelectedEdge: vi.fn(),
        deleteSelectedContextLink: vi.fn(),
        updateSelectedContextLinkMode: vi.fn(),
      },
      subgraphSectionBindings: {
        updateNode: vi.fn(),
        deleteNode: vi.fn(),
        selectNodeById: vi.fn(),
      },
      dialogBindings: {
        pendingBindingRequest: null,
        confirmPendingBinding: vi.fn(),
        cancelPendingBinding: vi.fn(),
      },
      workflowBindings: {
        replaceGraph: vi.fn(),
      },
    }
    mockedUseWorkflowEditorGraphSection.mockReturnValue(graphSection as never)

    const subgraphTestSection = {
      requestSubgraphTestFromCanvas: vi.fn(),
      resetSubgraphTestSectionForCommittedWorkflow: vi.fn(),
      sectionBindings: {
        isNodeTestLocked: false,
      },
    }
    mockedUseWorkflowEditorSubgraphTestSection.mockReturnValue(
      subgraphTestSection as never
    )

    const canvasSection = {
      dialogs: {
        isCreateCanvasDialogOpen: false,
        draftCanvasId: '',
        createCanvasErrorMessage: '',
        handleDraftCanvasIdChange: vi.fn(),
        openCreateCanvasDialog: vi.fn(),
        closeCreateCanvasDialog: vi.fn(),
        confirmCreateCanvas: vi.fn(),
      },
      actions: {
        requestCanvasChange: vi.fn(),
        handleRefreshWorkflowList: vi.fn(async () => {}),
        handleDeleteCurrentCanvas: vi.fn(async () => {}),
        handleSaveWorkflow: vi.fn(async () => {}),
        handleRevertToSaved: vi.fn(async () => {}),
      },
      status: {
        canDeleteCurrentCanvas: true,
        isActiveCanvasTemporary: false,
        workflowStatusMessage: '',
        temporaryCanvasStatusMessage: '',
      },
    }
    mockedUseWorkflowEditorCanvasSection.mockReturnValue(canvasSection as never)

    const runSection = {
      actions: {
        handleRunWorkflow: vi.fn(),
        handleRunBatchWorkflow: vi.fn(),
        handleCancelBatchWorkflow: vi.fn(),
      },
    }
    mockedUseWorkflowEditorRunSection.mockReturnValue(runSection as never)

    const panels = {
      sidebarProps: { requestedCanvasId: 'article' },
      canvasPaneProps: { workflowStatusMessage: '' },
      subgraphTestPanelProps: { selectedNode: null },
      modelResourcePanelProps: null,
    }
    mockedUseWorkflowPanels.mockReturnValue(panels as never)

    const dialogs = {
      workflowDialogsProps: {
        isCreateCanvasDialogOpen: false,
      },
    }
    mockedUseWorkflowDialogsState.mockReturnValue(dialogs as never)

    const { result } = renderHook(() =>
      useWorkflowEditorPageAssembler({ pageContext })
    )

    const [graphArgs] = mockedUseWorkflowEditorGraphSection.mock.calls[0] as [
      WorkflowEditorGraphSectionOptions,
    ]
    graphArgs.onRequestSubgraphTest?.('node-1')
    expect(subgraphTestSection.requestSubgraphTestFromCanvas).toHaveBeenCalledWith(
      'node-1'
    )

    expect(mockedUseWorkflowEditorCanvasSection).toHaveBeenCalledWith(
      expect.objectContaining({
        replaceGraph: graphSection.workflowBindings.replaceGraph,
        resetSubgraphTestSectionForCommittedWorkflow:
          subgraphTestSection.resetSubgraphTestSectionForCommittedWorkflow,
        clearLiveRunState: displayRunSection.actions.clearLiveRunState,
        clearBatchRunState: displayRunSection.actions.clearBatchRunState,
        clearRunState: displayRunSection.actions.clearRunState,
      })
    )

    expect(mockedUseWorkflowEditorRunSection).toHaveBeenCalledWith(
      expect.objectContaining({
        inputNodes,
        startLiveRun: displayRunSection.actions.startLiveRun,
        startBatchRun: displayRunSection.actions.startBatchRun,
        cancelBatchRun: displayRunSection.actions.cancelBatchRun,
      })
    )

    expect(mockedUseWorkflowPanels).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.objectContaining({
          canvasSection,
          displayRunSection,
          displayRunState,
          graphSection,
          subgraphTestSection,
          runActions: runSection.actions,
        }),
      })
    )
expect(mockedUseWorkflowDialogsState).toHaveBeenCalledWith({
  canvasDialogs: canvasSection.dialogs,
  graphDialogBindings: graphSection.dialogBindings,
  isGraphEditingLocked: displayRunSection.status.isGraphEditingLocked,
})

    expect(result.current.pageShellProps).toEqual({
      panels,
      dialogs,
    })
  })

  it('keeps graph->subgraph bridge forwarding to latest subgraph handler across rerenders', () => {
    const firstPageContext = createPageContext()
    const secondPageContext = createPageContext()
    const runtime = createRuntimeMock()

    mockedUseWorkflowRuntime.mockReturnValue(runtime as never)
    mockedUseWorkflowEditorDisplayRunSection.mockReturnValue({
      state: {
        runContext: { workflowContextId: 7, runResult: { status: 'succeeded' } },
        activeLiveRunSnapshot: null,
        selectedBatchDisplayRun: null,
        batchSummary: null,
        displayRun: null,
        isBatchResultStale: false,
        selectedBatchItemId: null,
        lastPollErrorMessage: '',
        batchLastPollErrorMessage: '',
      },
      status: {
        isGraphEditingLocked: false,
        isLiveRunActive: false,
        isBatchRunActive: false,
        isBatchCancelRequested: false,
      },
      actions: {
        clearLiveRunState: vi.fn(),
        clearBatchRunState: vi.fn(),
        clearRunState: vi.fn(),
        clearAllRunState: vi.fn(),
        startLiveRun: vi.fn(async () => ({})),
        startBatchRun: vi.fn(async () => ({})),
        selectBatchItem: vi.fn(async () => ({})),
        cancelBatchRun: vi.fn(async () => ({})),
      },
    } as never)
    mockedUseWorkflowEditorDisplayRunState.mockReturnValue({
      selectedEdge: null,
      selectedDisplayNode: null,
      topLevelErrorMessage: '',
      workflowWarningsMessage: '',
      draftStatusMessage: '',
      activeRunStatusMessage: '',
      selectedBatchSummaryItem: null,
      hasAnyRunArtifact: false,
      effectiveDisplayRun: null,
      hasBatchResult: false,
      hasAnyNodes: true,
    } as never)
    mockedUseWorkflowEditorGraphSection.mockReturnValue({
      stateBindings: {
        nodes: [],
        edges: [],
        contextLinks: [],
        selectedNode: null,
        selectedEdgeId: null,
      },
      sidebarBindings: { addNodeByType: vi.fn(), inputNodes: [] },
      canvasBindings: {
        selectedContextEdge: null,
        displayNodes: [],
        displayEdges: [],
        onNodesChange: vi.fn(),
        handleEdgesChange: vi.fn(),
        onConnect: vi.fn(),
        handleEdgeClick: vi.fn(),
        handlePaneClick: vi.fn(),
        handleNodeClick: vi.fn(),
        handleSelectionChange: vi.fn(),
        deleteSelectedEdge: vi.fn(),
        deleteSelectedContextLink: vi.fn(),
        updateSelectedContextLinkMode: vi.fn(),
      },
      subgraphSectionBindings: {
        updateNode: vi.fn(),
        deleteNode: vi.fn(),
        selectNodeById: vi.fn(),
      },
      dialogBindings: {
        pendingBindingRequest: null,
        confirmPendingBinding: vi.fn(),
        cancelPendingBinding: vi.fn(),
      },
      workflowBindings: { replaceGraph: vi.fn() },
    } as never)

    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    mockedUseWorkflowEditorSubgraphTestSection
      .mockReturnValueOnce({
        requestSubgraphTestFromCanvas: firstHandler,
        resetSubgraphTestSectionForCommittedWorkflow: vi.fn(),
        sectionBindings: {},
      } as never)
      .mockReturnValueOnce({
        requestSubgraphTestFromCanvas: secondHandler,
        resetSubgraphTestSectionForCommittedWorkflow: vi.fn(),
        sectionBindings: {},
      } as never)

    mockedUseWorkflowEditorCanvasSection.mockReturnValue({
      dialogs: {
        isCreateCanvasDialogOpen: false,
        draftCanvasId: '',
        createCanvasErrorMessage: '',
        handleDraftCanvasIdChange: vi.fn(),
        openCreateCanvasDialog: vi.fn(),
        closeCreateCanvasDialog: vi.fn(),
        confirmCreateCanvas: vi.fn(),
      },
      actions: {
        requestCanvasChange: vi.fn(),
        handleRefreshWorkflowList: vi.fn(async () => {}),
        handleDeleteCurrentCanvas: vi.fn(async () => {}),
        handleSaveWorkflow: vi.fn(async () => {}),
        handleRevertToSaved: vi.fn(async () => {}),
      },
      status: {
        canDeleteCurrentCanvas: true,
        isActiveCanvasTemporary: false,
        workflowStatusMessage: '',
        temporaryCanvasStatusMessage: '',
      },
    } as never)
    mockedUseWorkflowEditorRunSection.mockReturnValue({
      actions: {
        handleRunWorkflow: vi.fn(),
        handleRunBatchWorkflow: vi.fn(),
        handleCancelBatchWorkflow: vi.fn(),
      },
    } as never)
    mockedUseWorkflowPanels.mockReturnValue({
      sidebarProps: {},
      canvasPaneProps: {},
      subgraphTestPanelProps: {},
      modelResourcePanelProps: null,
    } as never)
    mockedUseWorkflowDialogsState.mockReturnValue({
      workflowDialogsProps: {},
    } as never)

    const { rerender } = renderHook(
      ({ pageContext }) => useWorkflowEditorPageAssembler({ pageContext }),
      { initialProps: { pageContext: firstPageContext } }
    )

    const [firstGraphArgs] = mockedUseWorkflowEditorGraphSection.mock.calls[0] as [
      WorkflowEditorGraphSectionOptions,
    ]
    const bridge = firstGraphArgs.onRequestSubgraphTest

    rerender({ pageContext: secondPageContext })
    bridge?.('node-latest')

    expect(secondHandler).toHaveBeenCalledWith('node-latest')
    expect(firstHandler).not.toHaveBeenCalled()
  })

  it('forwards runContext and active workflow context into graph section', () => {
    const pageContext = createPageContext()
    const runtime = createRuntimeMock()

    mockedUseWorkflowRuntime.mockReturnValue(runtime as never)
    mockedUseWorkflowEditorDisplayRunSection.mockReturnValue({
      state: {
        runContext: { workflowContextId: 999, runResult: { status: 'failed' } },
        activeLiveRunSnapshot: null,
        selectedBatchDisplayRun: null,
        batchSummary: null,
        displayRun: null,
        isBatchResultStale: false,
        selectedBatchItemId: null,
        lastPollErrorMessage: '',
        batchLastPollErrorMessage: '',
      },
      status: {
        isGraphEditingLocked: false,
        isLiveRunActive: false,
        isBatchRunActive: false,
        isBatchCancelRequested: false,
      },
      actions: {
        clearLiveRunState: vi.fn(),
        clearBatchRunState: vi.fn(),
        clearRunState: vi.fn(),
        clearAllRunState: vi.fn(),
        startLiveRun: vi.fn(async () => ({})),
        startBatchRun: vi.fn(async () => ({})),
        selectBatchItem: vi.fn(async () => ({})),
        cancelBatchRun: vi.fn(async () => ({})),
      },
    } as never)
    mockedUseWorkflowEditorDisplayRunState.mockReturnValue({
      selectedEdge: null,
      selectedDisplayNode: null,
      topLevelErrorMessage: '',
      workflowWarningsMessage: '',
      draftStatusMessage: '',
      activeRunStatusMessage: '',
      selectedBatchSummaryItem: null,
      hasAnyRunArtifact: false,
      effectiveDisplayRun: null,
      hasBatchResult: false,
      hasAnyNodes: true,
    } as never)
    mockedUseWorkflowEditorGraphSection.mockReturnValue({
      stateBindings: {
        nodes: [],
        edges: [],
        contextLinks: [],
        selectedNode: null,
        selectedEdgeId: null,
      },
      sidebarBindings: { addNodeByType: vi.fn(), inputNodes: [] },
      canvasBindings: {
        selectedContextEdge: null,
        displayNodes: [],
        displayEdges: [],
        onNodesChange: vi.fn(),
        handleEdgesChange: vi.fn(),
        onConnect: vi.fn(),
        handleEdgeClick: vi.fn(),
        handlePaneClick: vi.fn(),
        handleNodeClick: vi.fn(),
        handleSelectionChange: vi.fn(),
        deleteSelectedEdge: vi.fn(),
        deleteSelectedContextLink: vi.fn(),
        updateSelectedContextLinkMode: vi.fn(),
      },
      subgraphSectionBindings: {
        updateNode: vi.fn(),
        deleteNode: vi.fn(),
        selectNodeById: vi.fn(),
      },
      dialogBindings: {
        pendingBindingRequest: null,
        confirmPendingBinding: vi.fn(),
        cancelPendingBinding: vi.fn(),
      },
      workflowBindings: { replaceGraph: vi.fn() },
    } as never)
    mockedUseWorkflowEditorSubgraphTestSection.mockReturnValue({
      requestSubgraphTestFromCanvas: vi.fn(),
      resetSubgraphTestSectionForCommittedWorkflow: vi.fn(),
      sectionBindings: {},
    } as never)
    mockedUseWorkflowEditorCanvasSection.mockReturnValue({
      dialogs: {
        isCreateCanvasDialogOpen: false,
        draftCanvasId: '',
        createCanvasErrorMessage: '',
        handleDraftCanvasIdChange: vi.fn(),
        openCreateCanvasDialog: vi.fn(),
        closeCreateCanvasDialog: vi.fn(),
        confirmCreateCanvas: vi.fn(),
      },
      actions: {
        requestCanvasChange: vi.fn(),
        handleRefreshWorkflowList: vi.fn(async () => {}),
        handleDeleteCurrentCanvas: vi.fn(async () => {}),
        handleSaveWorkflow: vi.fn(async () => {}),
        handleRevertToSaved: vi.fn(async () => {}),
      },
      status: {
        canDeleteCurrentCanvas: true,
        isActiveCanvasTemporary: false,
        workflowStatusMessage: '',
        temporaryCanvasStatusMessage: '',
      },
    } as never)
    mockedUseWorkflowEditorRunSection.mockReturnValue({
      actions: {
        handleRunWorkflow: vi.fn(),
        handleRunBatchWorkflow: vi.fn(),
        handleCancelBatchWorkflow: vi.fn(),
      },
    } as never)
    mockedUseWorkflowPanels.mockReturnValue({
      sidebarProps: {},
      canvasPaneProps: {},
      subgraphTestPanelProps: {},
      modelResourcePanelProps: null,
    } as never)
    mockedUseWorkflowDialogsState.mockReturnValue({
      workflowDialogsProps: {},
    } as never)

    renderHook(() => useWorkflowEditorPageAssembler({ pageContext }))

    expect(mockedUseWorkflowEditorGraphSection).toHaveBeenCalledWith(
      expect.objectContaining({
        runContext: {
          workflowContextId: 999,
          runResult: { status: 'failed' },
        },
        activeWorkflowContextId: 7,
      })
    )
  })
})
