import type { RunResult } from '../run/runTypes'

/**
 * direct run / subgraph test 结果在页面层的归属上下文。
 *
 * 正式规则：
 * - runResult 不携带 UI/page context
 * - page 层用 WorkflowRunContext 记录它属于哪个 active workflow context
 * - 同一 workflow context 内 graph semantic 变化可标记 stale
 * - 跨 workflow context 时，该 run 必须失效，不得继续展示为当前页面事实
 */
export interface WorkflowRunContext {
    canvasId: string
    workflowContextId: number
    graphSemanticVersion: number
    runResult: RunResult
}