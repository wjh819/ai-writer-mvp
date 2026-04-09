import { useWorkflowBootstrap } from './useWorkflowBootstrap'
import {
    useWorkflowPersistence,
    type FetchActiveLiveRunActionResult,
    type RunWorkflowActionResult,
    type StartLiveRunActionResult,
} from './useWorkflowPersistence'
import { useWorkflowRunInputs } from './useWorkflowRunInputs'
import { useWorkflowSidecarStore } from './useWorkflowSidecarStore'
import { useWorkflowSubgraphTestStore } from './useWorkflowSubgraphTestStore'

/**
 * workflow runtime controller。
 *
 * 本文件角色：
 * - 作为前端 workflow runtime 侧的总入口 Hook
 * - 组合 bootstrap / persistence / runInputs / sidecar / subgraph test 五个子域
 * - 对外继续暴露稳定的 runtime controller API
 *
 * 负责：
 * - 维持既有 useWorkflowRuntime() 外部调用面不变
 * - 统一组装 workflow 列表、model resource、save/run/load、sidecar 与 subgraph test 能力
 *
 * 不负责：
 * - 图规则与 graph 同步
 * - workflow 默认值补齐
 * - 正式 workflow 合法性裁决
 * - run display 语义映射
 *
 * 上下游：
 * - 上游由 WorkflowEditor 页面级组件消费
 * - 下游拆分到各子 hook 内部实现
 */
export function useWorkflowRuntime(): {
    canvasList: ReturnType<typeof useWorkflowBootstrap>['canvasList']

    modelResources: ReturnType<typeof useWorkflowBootstrap>['modelResources']
    runInputs: ReturnType<typeof useWorkflowRunInputs>['runInputs']
    workflowSidecar: ReturnType<typeof useWorkflowSidecarStore>['workflowSidecar']

    isSaving: ReturnType<typeof useWorkflowPersistence>['isSaving']
    isRunning: ReturnType<typeof useWorkflowPersistence>['isRunning']
    isDeleting: ReturnType<typeof useWorkflowPersistence>['isDeleting']
    isLoadingWorkflow: ReturnType<typeof useWorkflowPersistence>['isLoadingWorkflow']
    bootstrapErrorMessage: ReturnType<typeof useWorkflowBootstrap>['bootstrapErrorMessage']

    updateRunInput: ReturnType<typeof useWorkflowRunInputs>['updateRunInput']
    refreshWorkflowList: ReturnType<typeof useWorkflowBootstrap>['refreshWorkflowList']
    refreshModelResources: ReturnType<typeof useWorkflowBootstrap>['refreshModelResources']
    loadCurrentWorkflow: ReturnType<typeof useWorkflowPersistence>['loadCurrentWorkflow']
    handleSave: ReturnType<typeof useWorkflowPersistence>['handleSave']
    handleRun: (
        ...args: Parameters<ReturnType<typeof useWorkflowPersistence>['handleRun']>
    ) => Promise<RunWorkflowActionResult>
    handleDeleteCanvas: ReturnType<typeof useWorkflowPersistence>['handleDeleteCanvas']
    syncRunInputs: ReturnType<typeof useWorkflowRunInputs>['syncRunInputs']
    resetRunInputContext: ReturnType<typeof useWorkflowRunInputs>['resetRunInputContext']

    replaceWorkflowSidecar: ReturnType<typeof useWorkflowSidecarStore>['replaceWorkflowSidecar']
    resetWorkflowSidecar: ReturnType<typeof useWorkflowSidecarStore>['resetWorkflowSidecar']
    getWorkflowSidecarNodeAssets: ReturnType<typeof useWorkflowSidecarStore>['getWorkflowSidecarNodeAssets']
    setWorkflowSidecarNodeAssets: ReturnType<typeof useWorkflowSidecarStore>['setWorkflowSidecarNodeAssets']
    updateWorkflowSidecarNodeAssets: ReturnType<typeof useWorkflowSidecarStore>['updateWorkflowSidecarNodeAssets']
    pruneWorkflowSidecar: ReturnType<typeof useWorkflowSidecarStore>['pruneWorkflowSidecar']

    subgraphTestState: ReturnType<typeof useWorkflowSubgraphTestStore>['subgraphTestState']
    activeSubgraphTestResult: ReturnType<typeof useWorkflowSubgraphTestStore>['activeSubgraphTestResult']
    activeSubgraphTestStartNodeId: ReturnType<typeof useWorkflowSubgraphTestStore>['activeSubgraphTestStartNodeId']
    subgraphTestResultsByNodeId: ReturnType<typeof useWorkflowSubgraphTestStore>['subgraphTestResultsByNodeId']
    staleSubgraphTestResultIds: ReturnType<typeof useWorkflowSubgraphTestStore>['staleSubgraphTestResultIds']
    runningSubgraphTestNodeId: ReturnType<typeof useWorkflowSubgraphTestStore>['runningSubgraphTestNodeId']
    lastSuccessfulSubgraphTestStartNodeId: ReturnType<typeof useWorkflowSubgraphTestStore>['lastSuccessfulSubgraphTestStartNodeId']

    markSubgraphTestResultStale: ReturnType<typeof useWorkflowSubgraphTestStore>['markSubgraphTestResultStale']
    clearSubgraphTestResultStale: ReturnType<typeof useWorkflowSubgraphTestStore>['clearSubgraphTestResultStale']
    handleRunSubgraphTest: ReturnType<typeof useWorkflowSubgraphTestStore>['handleRunSubgraphTest']
    clearSubgraphTestResult: ReturnType<typeof useWorkflowSubgraphTestStore>['clearSubgraphTestResult']
    pruneSubgraphTestArtifacts: ReturnType<typeof useWorkflowSubgraphTestStore>['pruneSubgraphTestArtifacts']
    resetSubgraphTestState: ReturnType<typeof useWorkflowSubgraphTestStore>['resetSubgraphTestState']
    resetSubgraphTestContext: ReturnType<typeof useWorkflowSubgraphTestStore>['resetSubgraphTestContext']
    handleStartLiveRun: (
        ...args: Parameters<ReturnType<typeof useWorkflowPersistence>['handleStartLiveRun']>
    ) => Promise<StartLiveRunActionResult>
    handleFetchActiveLiveRun: (
        ...args: Parameters<ReturnType<typeof useWorkflowPersistence>['handleFetchActiveLiveRun']>
    ) => Promise<FetchActiveLiveRunActionResult>
} {
    const bootstrap = useWorkflowBootstrap()
    const persistence = useWorkflowPersistence()
    const runInputs = useWorkflowRunInputs()
    const sidecar = useWorkflowSidecarStore()
    const subgraphTest = useWorkflowSubgraphTestStore()

    return {
        canvasList: bootstrap.canvasList,

        modelResources: bootstrap.modelResources,
        runInputs: runInputs.runInputs,
        workflowSidecar: sidecar.workflowSidecar,

        isSaving: persistence.isSaving,
        isRunning: persistence.isRunning,
        isDeleting: persistence.isDeleting,
        isLoadingWorkflow: persistence.isLoadingWorkflow,
        bootstrapErrorMessage: bootstrap.bootstrapErrorMessage,

        updateRunInput: runInputs.updateRunInput,
        refreshWorkflowList: bootstrap.refreshWorkflowList,
        refreshModelResources: bootstrap.refreshModelResources,
        loadCurrentWorkflow: persistence.loadCurrentWorkflow,
        handleSave: persistence.handleSave,
        handleRun: persistence.handleRun,
        handleDeleteCanvas: persistence.handleDeleteCanvas,
        syncRunInputs: runInputs.syncRunInputs,
        resetRunInputContext: runInputs.resetRunInputContext,

        replaceWorkflowSidecar: sidecar.replaceWorkflowSidecar,
        resetWorkflowSidecar: sidecar.resetWorkflowSidecar,
        getWorkflowSidecarNodeAssets: sidecar.getWorkflowSidecarNodeAssets,
        setWorkflowSidecarNodeAssets: sidecar.setWorkflowSidecarNodeAssets,
        updateWorkflowSidecarNodeAssets: sidecar.updateWorkflowSidecarNodeAssets,
        pruneWorkflowSidecar: sidecar.pruneWorkflowSidecar,

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
        handleStartLiveRun: persistence.handleStartLiveRun,
        handleFetchActiveLiveRun: persistence.handleFetchActiveLiveRun,
    }
}