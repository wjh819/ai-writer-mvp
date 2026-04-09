/**
 * workflow editor 异步操作层总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 bootstrap / workflow query / workflow mutation / run mutation / result helper 拆分到子文件
 *
 * 注意：
 * - 当前仅做文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export type {
    FetchModelResourceListResult,
    FetchWorkflowListResult,
    FetchWorkflowBootstrapResult,
    FetchWorkflowDetailResult,
    SaveWorkflowResult,
    DeleteWorkflowResult,
    RunWorkflowResult,
    SubgraphTestWorkflowResult,
    StartLiveRunResult,
    FetchActiveLiveRunResult,
} from './operationResultHelpers'

export { EMPTY_WORKFLOW_SIDECAR } from './operationResultHelpers'

export {
    fetchModelResourceListResult,
    fetchWorkflowListResult,
    fetchWorkflowBootstrapResult,
} from './bootstrapQueries'

export { fetchWorkflowDetailResult } from './workflowQueries'

export {
    saveWorkflowResult,
    deleteWorkflowResult,
} from './workflowMutations'

export {
    runDraftWorkflowResult,
    runSubgraphTestResult,
    startLiveRunResult,
    fetchActiveLiveRunResult,
} from './runMutations'