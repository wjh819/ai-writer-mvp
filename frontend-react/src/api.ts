/**
 * 前端 HTTP request wrapper 总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 workflow / run / prompt / model resource request wrapper 拆分到子文件
 *
 * 注意：
 * - 当前仅做 api.ts 文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export {
    API_BASE,
    DEFAULT_CANVAS_ID,
    type CanvasSummary,
    type SaveWorkflowOptions,
    type SaveWorkflowRequestPayload,
    type LoadWorkflowResponse,
} from './api/core'

export {
    listWorkflows,
    loadWorkflow,
    saveWorkflow,
    deleteWorkflow,
} from './api/workflowApi'

export {
    runDraftWorkflow,
    runSubgraphTestWorkflow,
} from './api/runApi'

export { getPrompts } from './api/promptApi'

export {
    getModelResources,
    getModelResourcesStatus,
    createModelResource,
    updateModelResource,
    deleteModelResource,
} from './api/modelResourceApi'