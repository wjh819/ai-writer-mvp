import { useCallback, useMemo, type ComponentProps } from 'react'
import type { NodeTypes } from 'reactflow'

import type { useWorkflowRuntime } from '../../workflow-editor/controllers/useWorkflowRuntime'
import { getRunInputKey } from '../../workflow-editor/state/workflowEditorRunInputs'
import WorkflowNode from '../WorkflowNode'
import WorkflowSidebar from '../WorkflowSidebar'
import WorkflowModelResourcePanel from '../WorkflowModelResourcePanel'
import WorkflowEditorCanvasPane from './WorkflowEditorCanvasPane'
import WorkflowEditorSubgraphTestPanelSection from './WorkflowEditorSubgraphTestPanelSection'
import type { useWorkflowEditorCanvasSection } from './useWorkflowEditorCanvasSection'
import type {
  useWorkflowEditorDisplayRunSection,
  useWorkflowEditorDisplayRunState,
} from './useWorkflowEditorDisplayRunSection'
import type { useWorkflowEditorGraphSection } from './useWorkflowEditorGraphSection'
import type { useWorkflowEditorSubgraphTestSection } from './useWorkflowEditorSubgraphTestSection'

type WorkflowRuntimeState = ReturnType<typeof useWorkflowRuntime>
type CanvasSectionState = ReturnType<typeof useWorkflowEditorCanvasSection>
type DisplayRunSectionState = ReturnType<typeof useWorkflowEditorDisplayRunSection>
type DisplayRunState = ReturnType<typeof useWorkflowEditorDisplayRunState>
type GraphSectionState = ReturnType<typeof useWorkflowEditorGraphSection>
type SubgraphTestSectionState = ReturnType<typeof useWorkflowEditorSubgraphTestSection>
type SidebarProps = ComponentProps<typeof WorkflowSidebar>
type CanvasPaneProps = ComponentProps<typeof WorkflowEditorCanvasPane>
type SubgraphTestPanelProps = ComponentProps<
  typeof WorkflowEditorSubgraphTestPanelSection
>
type ModelResourcePanelProps = ComponentProps<typeof WorkflowModelResourcePanel>

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
}

interface UseWorkflowPanelsOptions {
  canvas: {
    requestedCanvasId: string
    activeCanvasId: string
    temporaryCanvasId: string | null
    isSwitchingWorkflow: boolean
    isLoadingWorkflow: boolean
  }
  runtime: {
    canvasList: WorkflowRuntimeState['canvasList']
    modelResources: WorkflowRuntimeState['modelResources']
    runInputs: WorkflowRuntimeState['runInputs']
    updateRunInput: WorkflowRuntimeState['updateRunInput']
    batchInputText: string
    onBatchInputTextChange: (value: string) => void
    batchMaxParallel: number
    onBatchMaxParallelChange: (value: number) => void
  }
  pageStatus: {
    isModelResourcePanelOpen: boolean
    setIsModelResourcePanelOpen: (value: boolean) => void
    isSaving: boolean
    isRunning: boolean
    isDeleting: boolean
  }
  actions: {
    onModelResourcesChanged: () => Promise<void>
  }
  sections: {
    canvasSection: CanvasSectionState
    displayRunSection: DisplayRunSectionState
    displayRunState: DisplayRunState
    graphSection: GraphSectionState
    subgraphTestSection: SubgraphTestSectionState
    runActions: {
      handleRunWorkflow: () => void | Promise<void>
      handleRunBatchWorkflow: () => void | Promise<void>
      handleCancelBatchWorkflow: () => void | Promise<void>
    }
  }
}

export interface WorkflowPanelsState {
  sidebarProps: SidebarProps
  canvasPaneProps: CanvasPaneProps
  subgraphTestPanelProps: SubgraphTestPanelProps
  modelResourcePanelProps: ModelResourcePanelProps | null
}

export function useWorkflowPanels({
  canvas,
  runtime,
  pageStatus,
  actions,
  sections,
}: UseWorkflowPanelsOptions): WorkflowPanelsState {
  const { dialogs: canvasDialogs, actions: canvasActions, status: canvasStatus } =
    sections.canvasSection

  const sidebarIsRunning =
    pageStatus.isRunning ||
    sections.displayRunSection.status.isLiveRunActive ||
    sections.displayRunSection.status.isBatchRunActive

  const workflowStatusMessage =
    canvas.isSwitchingWorkflow && canvas.requestedCanvasId !== canvas.activeCanvasId
      ? canvasStatus.workflowStatusMessage
      : ''

  const disableRevertToSaved =
    pageStatus.isSaving ||
    canvas.isSwitchingWorkflow ||
    pageStatus.isDeleting ||
    canvasStatus.isActiveCanvasTemporary ||
    sections.displayRunSection.status.isLiveRunActive ||
    sections.displayRunSection.status.isBatchRunActive

  const revertToSavedTitle = canvasStatus.isActiveCanvasTemporary
    ? 'Unsaved blank canvases do not have a saved version yet'
    : undefined

  const handleOpenModelResources = useCallback(() => {
    pageStatus.setIsModelResourcePanelOpen(true)
  }, [pageStatus])

  const handleCloseModelResources = useCallback(() => {
    pageStatus.setIsModelResourcePanelOpen(false)
  }, [pageStatus])

  const handleSelectBatchItem = useCallback(
    (itemId: string) => {
      void sections.displayRunSection.actions.selectBatchItem(itemId)
    },
    [sections.displayRunSection.actions]
  )

  const sidebarProps = useMemo<SidebarProps>(
    () => ({
      requestedCanvasId: canvas.requestedCanvasId,
      activeCanvasId: canvas.activeCanvasId,
      canvasList: runtime.canvasList,
      temporaryCanvasId: canvas.temporaryCanvasId,
      modelResources: runtime.modelResources,
      isSwitchingWorkflow: canvas.isSwitchingWorkflow,
      isGraphEditingLocked: sections.displayRunSection.status.isGraphEditingLocked,
      isLiveRunActive: sections.displayRunSection.status.isLiveRunActive,
      isBatchRunActive: sections.displayRunSection.status.isBatchRunActive,
      isBatchCancelRequested: sections.displayRunSection.status.isBatchCancelRequested,
      onRequestCanvasChange: canvasActions.requestCanvasChange,
      onRefreshWorkflowList: canvasActions.handleRefreshWorkflowList,
      onOpenCreateCanvas: canvasDialogs.openCreateCanvasDialog,
      onDeleteCurrentCanvas: canvasActions.handleDeleteCurrentCanvas,
      onAddNodeByType: sections.graphSection.sidebarBindings.addNodeByType,
      inputNodes: sections.graphSection.sidebarBindings.inputNodes,
      runInputs: runtime.runInputs,
      onRunInputChange: runtime.updateRunInput,
      batchInputText: runtime.batchInputText,
      onBatchInputTextChange: runtime.onBatchInputTextChange,
      batchMaxParallel: runtime.batchMaxParallel,
      onBatchMaxParallelChange: runtime.onBatchMaxParallelChange,
      onSave: canvasActions.handleSaveWorkflow,
      onRun: sections.runActions.handleRunWorkflow,
      onRunBatch: sections.runActions.handleRunBatchWorkflow,
      onCancelBatch: sections.runActions.handleCancelBatchWorkflow,
      onClearRunState: sections.displayRunSection.actions.clearAllRunState,
      onOpenModelResources: handleOpenModelResources,
      isSaving: pageStatus.isSaving,
      isRunning: sidebarIsRunning,
      isDeleting: pageStatus.isDeleting,
      hasRunResult: Boolean(sections.displayRunState.effectiveDisplayRun),
      hasBatchResult: sections.displayRunState.hasBatchResult,
      hasAnyNodes: sections.displayRunState.hasAnyNodes,
      canDeleteCurrentCanvas: canvasStatus.canDeleteCurrentCanvas,
      getRunInputKey,
    }),
    [
      canvas.requestedCanvasId,
      canvas.activeCanvasId,
      canvas.temporaryCanvasId,
      canvas.isSwitchingWorkflow,
      runtime.canvasList,
      runtime.modelResources,
      runtime.runInputs,
      runtime.updateRunInput,
      runtime.batchInputText,
      runtime.onBatchInputTextChange,
      runtime.batchMaxParallel,
      runtime.onBatchMaxParallelChange,
      sections.displayRunSection.status.isGraphEditingLocked,
      sections.displayRunSection.status.isLiveRunActive,
      sections.displayRunSection.status.isBatchRunActive,
      sections.displayRunSection.status.isBatchCancelRequested,
      sections.displayRunSection.actions.clearAllRunState,
      sections.runActions.handleRunWorkflow,
      sections.runActions.handleRunBatchWorkflow,
      sections.runActions.handleCancelBatchWorkflow,
      sections.graphSection.sidebarBindings.addNodeByType,
      sections.graphSection.sidebarBindings.inputNodes,
      sections.displayRunState.effectiveDisplayRun,
      sections.displayRunState.hasBatchResult,
      sections.displayRunState.hasAnyNodes,
      canvasActions.requestCanvasChange,
      canvasActions.handleRefreshWorkflowList,
      canvasDialogs.openCreateCanvasDialog,
      canvasActions.handleDeleteCurrentCanvas,
      canvasActions.handleSaveWorkflow,
      handleOpenModelResources,
      pageStatus.isSaving,
      sidebarIsRunning,
      pageStatus.isDeleting,
      canvasStatus.canDeleteCurrentCanvas,
    ]
  )

  const canvasPaneProps = useMemo<CanvasPaneProps>(
    () => ({
      workflowStatusMessage,
      temporaryCanvasStatusMessage: canvasStatus.temporaryCanvasStatusMessage,
      topLevelErrorMessage: sections.displayRunState.topLevelErrorMessage,
      workflowWarningsMessage: sections.displayRunState.workflowWarningsMessage,
      draftStatusMessage: sections.displayRunState.draftStatusMessage,
      activeRunStatusMessage: sections.displayRunState.activeRunStatusMessage,
      onRevertToSaved: canvasActions.handleRevertToSaved,
      disableRevertToSaved,
      revertToSavedTitle,
      selectedNode: sections.graphSection.stateBindings.selectedNode,
      selectedEdge: sections.displayRunState.selectedEdge,
      selectedContextEdge: sections.graphSection.canvasBindings.selectedContextEdge,
      isLoadingWorkflow: canvas.isSwitchingWorkflow || canvas.isLoadingWorkflow,
      isGraphEditingLocked: sections.displayRunSection.status.isGraphEditingLocked,
      onDeleteSelectedEdge: sections.graphSection.canvasBindings.deleteSelectedEdge,
      onDeleteSelectedContextEdge:
        sections.graphSection.canvasBindings.deleteSelectedContextLink,
      onSetSelectedContextEdgeMode:
        sections.graphSection.canvasBindings.updateSelectedContextLinkMode,
      displayNodes: sections.graphSection.canvasBindings.displayNodes,
      displayEdges: sections.graphSection.canvasBindings.displayEdges,
      nodeTypes,
      onNodesChange: sections.graphSection.canvasBindings.onNodesChange,
      onEdgesChange: sections.graphSection.canvasBindings.handleEdgesChange,
      onConnect: sections.graphSection.canvasBindings.onConnect,
      onEdgeClick: sections.graphSection.canvasBindings.handleEdgeClick,
      onPaneClick: sections.graphSection.canvasBindings.handlePaneClick,
      onNodeClick: sections.graphSection.canvasBindings.handleNodeClick,
      onSelectionChange: sections.graphSection.canvasBindings.handleSelectionChange,
      batchSummary: sections.displayRunSection.state.batchSummary,
      selectedBatchItemId: sections.displayRunSection.state.selectedBatchItemId,
      selectedBatchSummaryItem: sections.displayRunState.selectedBatchSummaryItem,
      isBatchResultStale: sections.displayRunSection.state.isBatchResultStale,
      isBatchCancelRequested: sections.displayRunSection.status.isBatchCancelRequested,
      onSelectBatchItem: handleSelectBatchItem,
      hasAnyRunArtifact: sections.displayRunState.hasAnyRunArtifact,
      effectiveDisplayRun: sections.displayRunState.effectiveDisplayRun,
    }),
    [
      workflowStatusMessage,
      canvasStatus.temporaryCanvasStatusMessage,
      sections.displayRunState.topLevelErrorMessage,
      sections.displayRunState.workflowWarningsMessage,
      sections.displayRunState.draftStatusMessage,
      sections.displayRunState.activeRunStatusMessage,
      canvasActions.handleRevertToSaved,
      disableRevertToSaved,
      revertToSavedTitle,
      sections.graphSection.stateBindings.selectedNode,
      sections.displayRunState.selectedEdge,
      sections.graphSection.canvasBindings.selectedContextEdge,
      canvas.isSwitchingWorkflow,
      canvas.isLoadingWorkflow,
      sections.displayRunSection.status.isGraphEditingLocked,
      sections.graphSection.canvasBindings.deleteSelectedEdge,
      sections.graphSection.canvasBindings.deleteSelectedContextLink,
      sections.graphSection.canvasBindings.updateSelectedContextLinkMode,
      sections.graphSection.canvasBindings.displayNodes,
      sections.graphSection.canvasBindings.displayEdges,
      sections.graphSection.canvasBindings.onNodesChange,
      sections.graphSection.canvasBindings.handleEdgesChange,
      sections.graphSection.canvasBindings.onConnect,
      sections.graphSection.canvasBindings.handleEdgeClick,
      sections.graphSection.canvasBindings.handlePaneClick,
      sections.graphSection.canvasBindings.handleNodeClick,
      sections.graphSection.canvasBindings.handleSelectionChange,
      sections.displayRunSection.state.batchSummary,
      sections.displayRunSection.state.selectedBatchItemId,
      sections.displayRunState.selectedBatchSummaryItem,
      sections.displayRunSection.state.isBatchResultStale,
      sections.displayRunSection.status.isBatchCancelRequested,
      handleSelectBatchItem,
      sections.displayRunState.hasAnyRunArtifact,
      sections.displayRunState.effectiveDisplayRun,
    ]
  )

  const subgraphTestPanelProps = useMemo<SubgraphTestPanelProps>(
    () => ({
      selectedNode: sections.graphSection.stateBindings.selectedNode,
      selectedDisplayNode: sections.displayRunState.selectedDisplayNode,
      isGraphEditingLocked: sections.displayRunSection.status.isGraphEditingLocked,
      onChange: sections.graphSection.subgraphSectionBindings.updateNode,
      onDelete: sections.graphSection.subgraphSectionBindings.deleteNode,
      modelResources: runtime.modelResources,
      subgraphTestSection: sections.subgraphTestSection.sectionBindings,
    }),
    [
      sections.graphSection.stateBindings.selectedNode,
      sections.displayRunState.selectedDisplayNode,
      sections.displayRunSection.status.isGraphEditingLocked,
      sections.graphSection.subgraphSectionBindings.updateNode,
      sections.graphSection.subgraphSectionBindings.deleteNode,
      runtime.modelResources,
      sections.subgraphTestSection.sectionBindings,
    ]
  )

  const modelResourcePanelProps = useMemo<ModelResourcePanelProps | null>(() => {
    if (!pageStatus.isModelResourcePanelOpen) {
      return null
    }

    return {
      modelResources: runtime.modelResources,
      onClose: handleCloseModelResources,
      onResourcesChanged: actions.onModelResourcesChanged,
    }
  }, [
    pageStatus.isModelResourcePanelOpen,
    runtime.modelResources,
    handleCloseModelResources,
    actions.onModelResourcesChanged,
  ])

  return {
    sidebarProps,
    canvasPaneProps,
    subgraphTestPanelProps,
    modelResourcePanelProps,
  }
}
