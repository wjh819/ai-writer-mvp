import type {
  BatchItemDetailResponse,
  BatchSummaryResponse,
  LiveRunSnapshot,
  RunResult,
} from '../run/runTypes'

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

export interface WorkflowLiveRunContext {
  canvasId: string
  workflowContextId: number
  graphSemanticVersion: number
  runId: string | null
  snapshot: LiveRunSnapshot | null
  isPolling: boolean
  lastPollErrorMessage?: string
}

/**
 * batch run 在页面层的归属上下文。
 *
 * 正式规则：
 * - batch summary / item detail 不携带 UI/page context
 * - page 层用 WorkflowBatchRunContext 记录它属于哪个 active workflow context
 * - 同一 workflow context 内 graph semantic 变化后，batch 结果只保留参考价值
 * - 跨 workflow context 时，该 batch 必须失效，不得继续展示为当前页面事实
 * - cancelRequested 是页面 / controller 侧局部语义，不是后端 transport 正式状态
 */
export interface WorkflowBatchRunContext {
  batchId: string
  canvasId: string
  workflowContextId: number
  graphSemanticVersion: number
  inputKey: string

  batchSummary: BatchSummaryResponse | null

  selectedItemId: string | null
  selectedItemDetail: BatchItemDetailResponse | null

  isPolling: boolean
  cancelRequested: boolean
  lastPollErrorMessage?: string
}