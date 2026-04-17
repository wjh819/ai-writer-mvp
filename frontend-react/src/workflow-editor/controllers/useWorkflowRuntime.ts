import { useWorkflowBootstrap } from './useWorkflowBootstrap'
import { useWorkflowPersistence } from './useWorkflowPersistence'
import { useWorkflowRunInputs } from './useWorkflowRunInputs'
import { useWorkflowSidecarStore } from './useWorkflowSidecarStore'
import { useWorkflowSubgraphTestStore } from './useWorkflowSubgraphTestStore'

type WorkflowBootstrapState = ReturnType<typeof useWorkflowBootstrap>
type WorkflowPersistenceState = ReturnType<typeof useWorkflowPersistence>
type WorkflowRunInputsState = ReturnType<typeof useWorkflowRunInputs>
type WorkflowSidecarState = ReturnType<typeof useWorkflowSidecarStore>
type WorkflowSubgraphTestState = ReturnType<typeof useWorkflowSubgraphTestStore>

type WorkflowRunInputsContract = Pick<
  WorkflowRunInputsState,
  'runInputs' | 'updateRunInput' | 'syncRunInputs' | 'resetRunInputContext'
>

type WorkflowSidecarContract = Pick<
  WorkflowSidecarState,
  | 'workflowSidecar'
  | 'replaceWorkflowSidecar'
  | 'resetWorkflowSidecar'
  | 'getWorkflowSidecarNodeAssets'
  | 'setWorkflowSidecarNodeAssets'
  | 'updateWorkflowSidecarNodeAssets'
  | 'pruneWorkflowSidecar'
>

type WorkflowSubgraphTestContract = Pick<
  WorkflowSubgraphTestState,
  | 'subgraphTestState'
  | 'activeSubgraphTestResult'
  | 'activeSubgraphTestStartNodeId'
  | 'subgraphTestResultsByNodeId'
  | 'staleSubgraphTestResultIds'
  | 'runningSubgraphTestNodeId'
  | 'lastSuccessfulSubgraphTestStartNodeId'
  | 'markSubgraphTestResultStale'
  | 'clearSubgraphTestResultStale'
  | 'handleRunSubgraphTest'
  | 'clearSubgraphTestResult'
  | 'pruneSubgraphTestArtifacts'
  | 'resetSubgraphTestState'
  | 'resetSubgraphTestContext'
>

type WorkflowRunExecutionContract = Pick<
  WorkflowPersistenceState,
  | 'handleRun'
  | 'handleStartLiveRun'
  | 'handleFetchActiveLiveRun'
  | 'handleStartBatchRun'
  | 'handleFetchBatchSummary'
  | 'handleFetchBatchItemDetail'
  | 'handleCancelBatchRun'
>

export interface WorkflowGraphRuntimeState {
  runInputs: WorkflowRunInputsContract
  subgraphTest: WorkflowSubgraphTestContract
}

export interface WorkflowRunExecutionRuntimeState {
  runExecution: WorkflowRunExecutionContract
}

export interface WorkflowSidecarAssetsRuntimeState {
  sidecar: WorkflowSidecarContract
}

export interface WorkflowRuntimeState {
  bootstrap: Pick<
    WorkflowBootstrapState,
    | 'canvasList'
    | 'modelResources'
    | 'bootstrapErrorMessage'
    | 'refreshWorkflowList'
    | 'refreshModelResources'
  >
  persistence: Pick<
    WorkflowPersistenceState,
    | 'isSaving'
    | 'isRunning'
    | 'isDeleting'
    | 'isLoadingWorkflow'
    | 'loadCurrentWorkflow'
    | 'handleSave'
    | 'handleDeleteCanvas'
  >
  graphRuntime: WorkflowGraphRuntimeState
  runExecutionRuntime: WorkflowRunExecutionRuntimeState
  sidecarAssetsRuntime: WorkflowSidecarAssetsRuntimeState
  // Compatibility aliases for existing call sites while feature surfaces migrate
  runInputs: WorkflowGraphRuntimeState['runInputs']
  subgraphTest: WorkflowGraphRuntimeState['subgraphTest']
  runExecution: WorkflowRunExecutionRuntimeState['runExecution']
  sidecar: WorkflowSidecarAssetsRuntimeState['sidecar']
}

export function useWorkflowRuntime(): WorkflowRuntimeState {
  const bootstrap = useWorkflowBootstrap()
  const persistence = useWorkflowPersistence()
  const runInputs = useWorkflowRunInputs()
  const sidecar = useWorkflowSidecarStore()
  const subgraphTest = useWorkflowSubgraphTestStore()

  const runInputsContract: WorkflowRunInputsContract = {
    runInputs: runInputs.runInputs,
    updateRunInput: runInputs.updateRunInput,
    syncRunInputs: runInputs.syncRunInputs,
    resetRunInputContext: runInputs.resetRunInputContext,
  }

  const sidecarContract: WorkflowSidecarContract = {
    workflowSidecar: sidecar.workflowSidecar,
    replaceWorkflowSidecar: sidecar.replaceWorkflowSidecar,
    resetWorkflowSidecar: sidecar.resetWorkflowSidecar,
    getWorkflowSidecarNodeAssets: sidecar.getWorkflowSidecarNodeAssets,
    setWorkflowSidecarNodeAssets: sidecar.setWorkflowSidecarNodeAssets,
    updateWorkflowSidecarNodeAssets: sidecar.updateWorkflowSidecarNodeAssets,
    pruneWorkflowSidecar: sidecar.pruneWorkflowSidecar,
  }

  const subgraphTestContract: WorkflowSubgraphTestContract = {
    subgraphTestState: subgraphTest.subgraphTestState,
    activeSubgraphTestResult: subgraphTest.activeSubgraphTestResult,
    activeSubgraphTestStartNodeId: subgraphTest.activeSubgraphTestStartNodeId,
    subgraphTestResultsByNodeId: subgraphTest.subgraphTestResultsByNodeId,
    staleSubgraphTestResultIds: subgraphTest.staleSubgraphTestResultIds,
    runningSubgraphTestNodeId: subgraphTest.runningSubgraphTestNodeId,
    lastSuccessfulSubgraphTestStartNodeId:
      subgraphTest.lastSuccessfulSubgraphTestStartNodeId,
    markSubgraphTestResultStale: subgraphTest.markSubgraphTestResultStale,
    clearSubgraphTestResultStale: subgraphTest.clearSubgraphTestResultStale,
    handleRunSubgraphTest: subgraphTest.handleRunSubgraphTest,
    clearSubgraphTestResult: subgraphTest.clearSubgraphTestResult,
    pruneSubgraphTestArtifacts: subgraphTest.pruneSubgraphTestArtifacts,
    resetSubgraphTestState: subgraphTest.resetSubgraphTestState,
    resetSubgraphTestContext: subgraphTest.resetSubgraphTestContext,
  }

  const runExecutionContract: WorkflowRunExecutionContract = {
    handleRun: persistence.handleRun,
    handleStartLiveRun: persistence.handleStartLiveRun,
    handleFetchActiveLiveRun: persistence.handleFetchActiveLiveRun,
    handleStartBatchRun: persistence.handleStartBatchRun,
    handleFetchBatchSummary: persistence.handleFetchBatchSummary,
    handleFetchBatchItemDetail: persistence.handleFetchBatchItemDetail,
    handleCancelBatchRun: persistence.handleCancelBatchRun,
  }

  return {
    bootstrap: {
      canvasList: bootstrap.canvasList,
      modelResources: bootstrap.modelResources,
      bootstrapErrorMessage: bootstrap.bootstrapErrorMessage,
      refreshWorkflowList: bootstrap.refreshWorkflowList,
      refreshModelResources: bootstrap.refreshModelResources,
    },
    persistence: {
      isSaving: persistence.isSaving,
      isRunning: persistence.isRunning,
      isDeleting: persistence.isDeleting,
      isLoadingWorkflow: persistence.isLoadingWorkflow,
      loadCurrentWorkflow: persistence.loadCurrentWorkflow,
      handleSave: persistence.handleSave,
      handleDeleteCanvas: persistence.handleDeleteCanvas,
    },
    graphRuntime: {
      runInputs: runInputsContract,
      subgraphTest: subgraphTestContract,
    },
    runExecutionRuntime: {
      runExecution: runExecutionContract,
    },
    sidecarAssetsRuntime: {
      sidecar: sidecarContract,
    },
    runInputs: runInputsContract,
    subgraphTest: subgraphTestContract,
    runExecution: runExecutionContract,
    sidecar: sidecarContract,
  }
}
