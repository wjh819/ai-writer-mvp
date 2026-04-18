import type { RunResult } from '../../../run/runTypes'
import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type { DisplayRun } from '@aiwriter/run-display'
import type {
  EffectiveSubgraphTestInputItem,
} from '../../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import type { WorkflowSidecarNodeAssets } from '../../../workflow-editor/workflowEditorUiTypes'

export interface SubgraphTestPanelGraphOptions {
  activeCanvasId: string
  graphSemanticVersion: number
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  selectedNode: WorkflowEditorNode | null
}

export interface SubgraphTestPanelStateOptions {
  requestedSubgraphTestNodeId: string | null
  setRequestedSubgraphTestNodeId: (value: string | null) => void
  isSubgraphTestPanelExpanded: boolean
  setIsSubgraphTestPanelExpanded: (value: boolean) => void
}

export interface SubgraphTestPanelCallbacks {
  clearPageError: () => void
  onGraphPersistedChanged: () => void
  selectNodeById: (nodeId: string) => void
}

export interface SubgraphTestPanelRuntimeState {
  subgraphTestState: WorkflowState
  activeSubgraphTestResult: RunResult | null
  activeSubgraphTestStartNodeId: string | null
  subgraphTestResultsByNodeId: Record<string, RunResult>
  staleSubgraphTestResultIds: Record<string, true>
  lastSuccessfulSubgraphTestStartNodeId: string | null
}

export interface SubgraphTestRunActionResult {
  subgraphTestResult?: RunResult
  successMessage?: string
  errorMessage?: string
}

export interface SubgraphTestPanelRuntimeActions {
  markSubgraphTestResultStale: (nodeId: string) => void
  clearSubgraphTestResultStale: (nodeId: string) => void
  handleRunSubgraphTest: (
    canvasId: string,
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    startNodeId: string,
    nextSubgraphTestState: WorkflowState,
    endNodeIds?: string[]
  ) => Promise<SubgraphTestRunActionResult>
  clearSubgraphTestResult: (nodeId: string) => void
  pruneSubgraphTestArtifacts: (validNodeIds: string[]) => void
  resetSubgraphTestState: () => void
}

export interface SubgraphTestPanelRuntimeSidecar {
  getWorkflowSidecarNodeAssets: (nodeId: string) => WorkflowSidecarNodeAssets
  updateWorkflowSidecarNodeAssets: (
    nodeId: string,
    updater: (previous: WorkflowSidecarNodeAssets) => WorkflowSidecarNodeAssets
  ) => void
  pruneWorkflowSidecar: (validNodeIds: string[]) => void
}

export interface SubgraphTestPanelRuntimeOptions {
  state: SubgraphTestPanelRuntimeState
  actions: SubgraphTestPanelRuntimeActions
  sidecar: SubgraphTestPanelRuntimeSidecar
}

export interface SubgraphTestPanelFeedbackBinding {
  errorMessage: string
  infoMessage: string
  setErrorMessage: (value: string) => void
  setInfoMessage: (value: string) => void
  clear: () => void
}

export interface UseWorkflowSubgraphTestPanelOptions {
  graph: SubgraphTestPanelGraphOptions
  panelState: SubgraphTestPanelStateOptions
  callbacks: SubgraphTestPanelCallbacks
  runtime: SubgraphTestPanelRuntimeOptions
  locking: {
    isNodeTestLocked: boolean
  }
}

export interface UseWorkflowSubgraphTestPanelResult {
  panelState: {
    isSubgraphTestPanelExpanded: boolean
    setIsSubgraphTestPanelExpanded: (value: boolean) => void
    requestSubgraphTestFromCanvas: (nodeId: string) => void
    resetSubgraphTestPanelView: () => void
    isSubgraphTestLocked: boolean
  }
  feedback: {
    subgraphTestPanelErrorMessage: string
    subgraphTestInfoMessage: string
    clearSubgraphTestFeedback: () => void
  }
  inputs: {
    effectiveSubgraphTestInputItems: EffectiveSubgraphTestInputItem[]
    currentPinnedInputDraftTexts: Record<string, string>
    handlePinnedInputDraftChange: (
      nodeId: string,
      targetInput: string,
      nextValue: string
    ) => void
  }
  runner: {
    selectedSubgraphTestDisplayRun: DisplayRun | null
    handleRunSelectedSubgraphTest: () => Promise<void>
    handleClearSelectedSubgraphTestResult: () => void
    handleResetSubgraphTestReusableContext: () => void
  }
  invalidation: {
    commitSemanticGraphSnapshot: (
      nextNodes: WorkflowEditorNode[],
      nextEdges: WorkflowEditorEdge[],
      nextContextLinks: WorkflowContextLink[]
    ) => void
  }
}

