import { useCallback } from 'react'

import type {
  EffectiveSubgraphTestInputItem,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type { useWorkflowRuntime } from '../../workflow-editor/controllers/useWorkflowRuntime'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type { DisplayRun } from '../run/runDisplayModels'
import type {
  SubgraphTestPanelRuntimeOptions,
  UseWorkflowSubgraphTestPanelResult,
} from './subgraphTestPanelTypes'
import { useSubgraphTestSectionState } from './useSubgraphTestSectionState'
import { useWorkflowSubgraphTestPanel } from './useWorkflowSubgraphTestPanel'

export interface WorkflowEditorSubgraphTestSectionBindings {
  isNodeTestLocked: boolean
  pinnedInputDraftTexts: Record<string, string>
  onPinnedInputDraftChange: (
    nodeId: string,
    targetInput: string,
    nextValue: string
  ) => void
  isSubgraphTestExpanded: boolean
  onSetSubgraphTestExpanded: (nextValue: boolean) => void
  effectiveSubgraphTestInputItems: EffectiveSubgraphTestInputItem[]
  onRunSubgraphTest: () => void
  onClearSubgraphTestResult: () => void
  onResetSubgraphTestContext: () => void
  selectedSubgraphTestDisplayRun: DisplayRun | null
  subgraphTestErrorMessage: string
  subgraphTestInfoMessage: string
}

interface UseWorkflowEditorSubgraphTestSectionOptions {
  graph: {
    activeCanvasId: string
    graphSemanticVersion: number
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
    selectedNode: WorkflowEditorNode | null
  }
  callbacks: {
    clearPageError: () => void
    onGraphPersistedChanged: () => void
    selectNodeById: (nodeId: string) => void
  }
  runtime: WorkflowEditorSubgraphSectionRuntimeBindings
  runStatus: {
    isLiveRunActive: boolean
    isBatchRunActive: boolean
  }
}

type WorkflowRuntimeState = ReturnType<typeof useWorkflowRuntime>
type WorkflowEditorSubgraphSectionRuntimeBindings = Pick<
  WorkflowRuntimeState,
  | 'subgraphTestState'
  | 'activeSubgraphTestResult'
  | 'activeSubgraphTestStartNodeId'
  | 'subgraphTestResultsByNodeId'
  | 'staleSubgraphTestResultIds'
  | 'lastSuccessfulSubgraphTestStartNodeId'
  | 'getWorkflowSidecarNodeAssets'
  | 'updateWorkflowSidecarNodeAssets'
  | 'pruneWorkflowSidecar'
  | 'markSubgraphTestResultStale'
  | 'clearSubgraphTestResultStale'
  | 'handleRunSubgraphTest'
  | 'clearSubgraphTestResult'
  | 'pruneSubgraphTestArtifacts'
  | 'resetSubgraphTestState'
  | 'resetSubgraphTestContext'
>

function buildSubgraphTestPanelRuntimeBindings(
  runtime: WorkflowEditorSubgraphSectionRuntimeBindings
): SubgraphTestPanelRuntimeOptions {
  return {
    state: {
      subgraphTestState: runtime.subgraphTestState,
      activeSubgraphTestResult: runtime.activeSubgraphTestResult,
      activeSubgraphTestStartNodeId: runtime.activeSubgraphTestStartNodeId,
      subgraphTestResultsByNodeId: runtime.subgraphTestResultsByNodeId,
      staleSubgraphTestResultIds: runtime.staleSubgraphTestResultIds,
      lastSuccessfulSubgraphTestStartNodeId:
        runtime.lastSuccessfulSubgraphTestStartNodeId,
    },
    actions: {
      markSubgraphTestResultStale: runtime.markSubgraphTestResultStale,
      clearSubgraphTestResultStale: runtime.clearSubgraphTestResultStale,
      handleRunSubgraphTest: runtime.handleRunSubgraphTest,
      clearSubgraphTestResult: runtime.clearSubgraphTestResult,
      pruneSubgraphTestArtifacts: runtime.pruneSubgraphTestArtifacts,
      resetSubgraphTestState: runtime.resetSubgraphTestState,
    },
    sidecar: {
      getWorkflowSidecarNodeAssets: runtime.getWorkflowSidecarNodeAssets,
      updateWorkflowSidecarNodeAssets:
        runtime.updateWorkflowSidecarNodeAssets,
      pruneWorkflowSidecar: runtime.pruneWorkflowSidecar,
    },
  }
}

function buildWorkflowEditorSubgraphTestSectionBindings(
  subgraphTestPanel: UseWorkflowSubgraphTestPanelResult
): WorkflowEditorSubgraphTestSectionBindings {
  return {
    isNodeTestLocked: subgraphTestPanel.panelState.isSubgraphTestLocked,
    pinnedInputDraftTexts: subgraphTestPanel.inputs.currentPinnedInputDraftTexts,
    onPinnedInputDraftChange: subgraphTestPanel.inputs.handlePinnedInputDraftChange,
    isSubgraphTestExpanded: subgraphTestPanel.panelState.isSubgraphTestPanelExpanded,
    onSetSubgraphTestExpanded:
      subgraphTestPanel.panelState.setIsSubgraphTestPanelExpanded,
    effectiveSubgraphTestInputItems:
      subgraphTestPanel.inputs.effectiveSubgraphTestInputItems,
    onRunSubgraphTest: subgraphTestPanel.runner.handleRunSelectedSubgraphTest,
    onClearSubgraphTestResult:
      subgraphTestPanel.runner.handleClearSelectedSubgraphTestResult,
    onResetSubgraphTestContext:
      subgraphTestPanel.runner.handleResetSubgraphTestReusableContext,
    selectedSubgraphTestDisplayRun:
      subgraphTestPanel.runner.selectedSubgraphTestDisplayRun,
    subgraphTestErrorMessage:
      subgraphTestPanel.feedback.subgraphTestPanelErrorMessage,
    subgraphTestInfoMessage: subgraphTestPanel.feedback.subgraphTestInfoMessage,
  }
}

export function useWorkflowEditorSubgraphTestSection({
  graph,
  callbacks,
  runtime,
  runStatus,
}: UseWorkflowEditorSubgraphTestSectionOptions) {
  const sectionState = useSubgraphTestSectionState({
    isLiveRunActive: runStatus.isLiveRunActive,
    isBatchRunActive: runStatus.isBatchRunActive,
  })

  const subgraphTestPanel = useWorkflowSubgraphTestPanel({
    graph,
    panelState: sectionState.panelState,
    callbacks,
    runtime: buildSubgraphTestPanelRuntimeBindings(runtime),
    locking: {
      isNodeTestLocked: sectionState.isNodeTestLocked,
    },
  })
  const { commitSemanticGraphSnapshot } = subgraphTestPanel.invalidation
  const { resetSubgraphTestPanelView } = subgraphTestPanel.panelState

  const resetSubgraphTestSectionForCommittedWorkflow = useCallback(
    (
      nextNodes: WorkflowEditorNode[],
      nextEdges: WorkflowEditorEdge[],
      nextContextLinks: WorkflowContextLink[]
    ) => {
      runtime.resetSubgraphTestContext()
      commitSemanticGraphSnapshot(nextNodes, nextEdges, nextContextLinks)
      resetSubgraphTestPanelView()
    },
    [
      runtime.resetSubgraphTestContext,
      commitSemanticGraphSnapshot,
      resetSubgraphTestPanelView,
    ]
  )

  return {
    requestSubgraphTestFromCanvas:
      subgraphTestPanel.panelState.requestSubgraphTestFromCanvas,
    resetSubgraphTestSectionForCommittedWorkflow,
    sectionBindings: buildWorkflowEditorSubgraphTestSectionBindings(
      subgraphTestPanel
    ) satisfies WorkflowEditorSubgraphTestSectionBindings,
  }
}
