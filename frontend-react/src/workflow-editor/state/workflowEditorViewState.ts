/**
 * viewState 总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 run step selector / runtime 派生 / graph facts / display node / display edge 拆分到子文件
 *
 * 注意：
 * - 当前仅做文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export type { WorkflowStep } from './runStepSelectors'

export {
    trim,
    isRecord,
    getStepInputs,
    getStepOutput,
    getPublishedState,
    buildLatestStepMap,
    buildExecutedNodeMap,
} from './runStepSelectors'

export { buildRuntimeFields } from './runtimeFieldDerivers'

export {
    buildUniqueStrings,
    buildDerivedTargetInputs,
    buildInboundBindings,
    buildPromptGraphWindowFacts,
    buildNodeTestFields,
} from './graphFactDerivers'

export { buildDisplayNodes } from './displayNodeBuilders'
export { buildDisplayEdges } from './displayEdgeBuilders'

/**
 * 兼容转发：
 * - buildSelectedNode 的正式 owner 仍在 workflowEditorSelection.ts
 * - 这里只保留旧入口，避免潜在历史 import 断掉
 */
export { buildSelectedNode } from './workflowEditorSelection'