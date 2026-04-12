// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWorkflowPanels } from './useWorkflowPanels'

type UseWorkflowPanelsOptions = Parameters<typeof useWorkflowPanels>[0]

type DeepPartial<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends readonly any[]
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T

type CanvasSectionOptions = UseWorkflowPanelsOptions['sections']['canvasSection']
type DisplayRunSectionOptions =
  UseWorkflowPanelsOptions['sections']['displayRunSection']
type DisplayRunStateOptions = UseWorkflowPanelsOptions['sections']['displayRunState']
type GraphSectionOptions = UseWorkflowPanelsOptions['sections']['graphSection']
type SubgraphTestSectionOptions =
  UseWorkflowPanelsOptions['sections']['subgraphTestSection']
type RunActionsOptions = UseWorkflowPanelsOptions['sections']['runActions']

function createOptions(
  overrides: DeepPartial<UseWorkflowPanelsOptions> = {}
): UseWorkflowPanelsOptions {
  const setIsModelResourcePanelOpen = vi.fn()
  const selectBatchItem = vi.fn(async () => {})

  const base: UseWorkflowPanelsOptions = {
    canvas: {
      requestedCanvasId: 'article',
      activeCanvasId: 'article',
      temporaryCanvasId: null,
      isSwitchingWorkflow: false,
      isLoadingWorkflow: false,
    },
    runtime: {
      canvasList: [],
      modelResources: [{ id: 'model-a' }] as never,
      runInputs: {},
      updateRunInput: vi.fn(),
      batchInputText: 'a\nb',
      onBatchInputTextChange: vi.fn(),
      batchMaxParallel: 2,
      onBatchMaxParallelChange: vi.fn(),
    },
    pageStatus: {
      isModelResourcePanelOpen: false,
      setIsModelResourcePanelOpen,
      isSaving: false,
      isRunning: false,
      isDeleting: false,
    },
    actions: {
      onModelResourcesChanged: vi.fn(async () => {}),
    },
    sections: {
      canvasSection: {
        dialogs: {
          isCreateCanvasDialogOpen: false,
          draftCanvasId: '',
          createCanvasErrorMessage: '',
          handleDraftCanvasIdChange: vi.fn(),
          setCreateCanvasErrorMessage: vi.fn(),
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
          isActiveCanvasTemporary: false,
          canDeleteCurrentCanvas: true,
          workflowStatusMessage: 'switching',
          temporaryCanvasStatusMessage: 'temporary',
        },
      } as never,
      displayRunSection: {
        state: {
          runContext: null,
          displayRun: null,
          activeLiveRunSnapshot: null,
          selectedBatchDisplayRun: null,
          batchSummary: null,
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
          clearAllRunState: vi.fn(),
          selectBatchItem,
        },
      } as never,
      displayRunState: {
        effectiveDisplayRun: null,
        hasBatchResult: false,
        hasAnyNodes: true,
        topLevelErrorMessage: '',
        workflowWarningsMessage: '',
        draftStatusMessage: '',
        activeRunStatusMessage: '',
        selectedEdge: null,
        selectedBatchSummaryItem: null,
        hasAnyRunArtifact: false,
        selectedDisplayNode: null,
      } as never,
      graphSection: {
        stateBindings: {
          selectedNode: { id: 'node-1' },
        },
        sidebarBindings: {
          addNodeByType: vi.fn(),
          inputNodes: [{ id: 'input-1' }],
        },
        canvasBindings: {
          selectedContextEdge: null,
          deleteSelectedEdge: vi.fn(),
          deleteSelectedContextLink: vi.fn(),
          updateSelectedContextLinkMode: vi.fn(),
          displayNodes: [],
          displayEdges: [],
          onNodesChange: vi.fn(),
          handleEdgesChange: vi.fn(),
          onConnect: vi.fn(),
          handleEdgeClick: vi.fn(),
          handlePaneClick: vi.fn(),
          handleNodeClick: vi.fn(),
          handleSelectionChange: vi.fn(),
        },
        subgraphSectionBindings: {
          updateNode: vi.fn(),
          deleteNode: vi.fn(),
        },
      } as never,
      subgraphTestSection: {
        sectionBindings: { isNodeTestLocked: false },
      } as never,
      runActions: {
        handleRunWorkflow: vi.fn(),
        handleRunBatchWorkflow: vi.fn(),
        handleCancelBatchWorkflow: vi.fn(),
      },
    },
  }

  const canvas = {
    ...base.canvas,
    ...overrides.canvas,
  } as UseWorkflowPanelsOptions['canvas']

  const runtime = {
    ...base.runtime,
    ...overrides.runtime,
  } as UseWorkflowPanelsOptions['runtime']

  const pageStatus = {
    ...base.pageStatus,
    ...overrides.pageStatus,
  } as UseWorkflowPanelsOptions['pageStatus']

  const actions = {
    ...base.actions,
    ...overrides.actions,
  } as UseWorkflowPanelsOptions['actions']

  const canvasSection = {
    ...base.sections.canvasSection,
    ...overrides.sections?.canvasSection,
    dialogs: {
      ...base.sections.canvasSection.dialogs,
      ...overrides.sections?.canvasSection?.dialogs,
    },
    actions: {
      ...base.sections.canvasSection.actions,
      ...overrides.sections?.canvasSection?.actions,
    },
    status: {
      ...base.sections.canvasSection.status,
      ...overrides.sections?.canvasSection?.status,
    },
  } as CanvasSectionOptions

  const displayRunSection = {
    ...base.sections.displayRunSection,
    ...overrides.sections?.displayRunSection,
    state: {
      ...base.sections.displayRunSection.state,
      ...overrides.sections?.displayRunSection?.state,
    },
    status: {
      ...base.sections.displayRunSection.status,
      ...overrides.sections?.displayRunSection?.status,
    },
    actions: {
      ...base.sections.displayRunSection.actions,
      ...overrides.sections?.displayRunSection?.actions,
    },
  } as DisplayRunSectionOptions

  const displayRunState = {
    ...base.sections.displayRunState,
    ...overrides.sections?.displayRunState,
  } as DisplayRunStateOptions

  const graphSection = {
    ...base.sections.graphSection,
    ...overrides.sections?.graphSection,
    stateBindings: {
      ...base.sections.graphSection.stateBindings,
      ...overrides.sections?.graphSection?.stateBindings,
    },
    sidebarBindings: {
      ...base.sections.graphSection.sidebarBindings,
      ...overrides.sections?.graphSection?.sidebarBindings,
    },
    canvasBindings: {
      ...base.sections.graphSection.canvasBindings,
      ...overrides.sections?.graphSection?.canvasBindings,
    },
    subgraphSectionBindings: {
      ...base.sections.graphSection.subgraphSectionBindings,
      ...overrides.sections?.graphSection?.subgraphSectionBindings,
    },
  } as GraphSectionOptions

  const subgraphTestSection = {
    ...base.sections.subgraphTestSection,
    ...overrides.sections?.subgraphTestSection,
    sectionBindings: {
      ...base.sections.subgraphTestSection.sectionBindings,
      ...overrides.sections?.subgraphTestSection?.sectionBindings,
    },
  } as SubgraphTestSectionOptions

  const runActions = {
    ...base.sections.runActions,
    ...overrides.sections?.runActions,
  } as RunActionsOptions

  return {
    canvas,
    runtime,
    pageStatus,
    actions,
    sections: {
      canvasSection,
      displayRunSection,
      displayRunState,
      graphSection,
      subgraphTestSection,
      runActions,
    },
  }
}

describe('useWorkflowPanels', () => {
  it('merges sidebar running status and computes revert disable derived values', () => {
    const options = createOptions({
      canvas: {
        requestedCanvasId: 'draft-a',
        activeCanvasId: 'article',
        isSwitchingWorkflow: true,
      },
      sections: {
        canvasSection: {
          status: {
            isActiveCanvasTemporary: true,
            workflowStatusMessage: 'switching to draft-a',
          },
        },
        displayRunSection: {
          status: {
            isLiveRunActive: true,
          },
        },
      },
    })

    const { result } = renderHook(() => useWorkflowPanels(options))

    expect(result.current.sidebarProps.isRunning).toBe(true)
    expect(result.current.canvasPaneProps.workflowStatusMessage).toBe(
      'switching to draft-a'
    )
    expect(result.current.canvasPaneProps.disableRevertToSaved).toBe(true)
    expect(result.current.canvasPaneProps.revertToSavedTitle).toBe(
      'Unsaved blank canvases do not have a saved version yet'
    )
  })

  it('maps panel props and only exposes model resource panel props when open', () => {
    const options = createOptions()

    const { result, rerender } = renderHook(
      currentOptions => useWorkflowPanels(currentOptions),
      {
        initialProps: options,
      }
    )

    expect(result.current.modelResourcePanelProps).toBeNull()
    expect(result.current.canvasPaneProps.selectedNode).toBe(
      options.sections.graphSection.stateBindings.selectedNode
    )
    expect(result.current.subgraphTestPanelProps.subgraphTestSection).toBe(
      options.sections.subgraphTestSection.sectionBindings
    )

    result.current.canvasPaneProps.onSelectBatchItem('item-1')
    expect(
      options.sections.displayRunSection.actions.selectBatchItem
    ).toHaveBeenCalledWith('item-1')

    const openSetter = vi.fn()
    rerender(
      createOptions({
        pageStatus: {
          isModelResourcePanelOpen: true,
          setIsModelResourcePanelOpen: openSetter,
        },
      })
    )

    expect(result.current.modelResourcePanelProps).not.toBeNull()
    result.current.modelResourcePanelProps?.onClose()
    expect(openSetter).toHaveBeenCalledWith(false)

    result.current.sidebarProps.onOpenModelResources()
    expect(openSetter).toHaveBeenCalledWith(true)
  })
})