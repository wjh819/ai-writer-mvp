import type { WorkflowState } from '../shared/workflowSharedTypes'
import type { WorkflowEditorData } from '../workflow-editor/workflowEditorTypes'

/**
 * 前端 direct run / subgraph test / batch run transport type 镜像层。
 *
 * 本文件角色：
 * - 镜像后端 RunResult / RunStep / batch transport contract
 * - 为 api.ts 与 run display 层提供静态类型约束
 *
 * 负责：
 * - 定义前端消费 direct run / subgraph test response 的基础类型
 * - 定义 run-draft / subgraph test / batch run 请求体镜像
 * - 作为 display mapper 与 run 组件的 transport type 锚点
 *
 * 不负责：
 * - 定义后端 run contract
 * - execution internal facts
 * - persisted run detail contract
 *
 * 上下游：
 * - 上游来自 api.ts 返回的 transport response
 * - 下游由 run display / batch page context / run 组件消费
 */

export type StepNodeType = 'input' | 'prompt' | 'output'
export type StepStatus = 'success' | 'failed'
export type RunStatus = 'success' | 'failed'
export type RunScope = 'full' | 'subgraph'
export type FailureStage = 'request' | 'definition' | 'execution'
export type PromptWindowMode = 'new_window' | 'continue' | 'branch'

export interface BaseStepProjection {
  node: string
  started_at?: string
  finished_at?: string
  duration_ms?: number
}

export interface InputSuccessStepProjection extends BaseStepProjection {
  type: 'input'
  status: 'success'
  output: unknown
  published_state: WorkflowState
}

export interface InputFailedStepProjection extends BaseStepProjection {
  type: 'input'
  status: 'failed'
  error_message: string
  error_detail?: string
}

export interface PromptSuccessStepProjection extends BaseStepProjection {
  type: 'prompt'
  status: 'success'
  inputs: Record<string, unknown>
  rendered_prompt: string
  output: string
  published_state: WorkflowState

  window_mode: PromptWindowMode
  window_source_node_id?: string | null
  window_id: string
  window_parent_id?: string | null
}

export interface PromptFailedStepProjection extends BaseStepProjection {
  type: 'prompt'
  status: 'failed'
  inputs: Record<string, unknown>
  rendered_prompt: string | null
  error_message: string
  error_detail?: string

  window_mode?: PromptWindowMode | null
  window_source_node_id?: string | null
  window_id?: string | null
  window_parent_id?: string | null
}

export interface OutputSuccessStepProjection extends BaseStepProjection {
  type: 'output'
  status: 'success'
  inputs: Record<string, unknown>
  output: unknown
  published_state: WorkflowState
}

export interface OutputFailedStepProjection extends BaseStepProjection {
  type: 'output'
  status: 'failed'
  inputs: Record<string, unknown>
  error_message: string
  error_detail?: string
}

export type StepProjection =
  | InputSuccessStepProjection
  | InputFailedStepProjection
  | PromptSuccessStepProjection
  | PromptFailedStepProjection
  | OutputSuccessStepProjection
  | OutputFailedStepProjection

export interface RunResult {
  status: RunStatus
  run_scope: RunScope
  input_state: WorkflowState
  final_state: WorkflowState
  partial_state?: WorkflowState | null
  steps: StepProjection[]
  error_type?: string
  error_message?: string
  error_detail?: string
  failure_stage?: FailureStage
}

export type LiveRunStatus = 'idle' | 'running' | 'success' | 'failed'

export interface LiveRunStartResponse {
  run_id: string
  status: 'running'
}

export interface LiveRunSnapshot {
  run_id: string | null
  canvas_id?: string | null

  status: LiveRunStatus
  run_scope: 'full'

  active_node_id?: string | null

  input_state: WorkflowState
  current_state: WorkflowState
  final_state: WorkflowState
  partial_state?: WorkflowState | null

  steps: StepProjection[]

  error_type?: string
  error_message?: string
  error_detail?: string
  failure_stage?: FailureStage

  started_at?: string
  finished_at?: string
}

export interface RunDraftWorkflowPayload {
  workflow: WorkflowEditorData
  input_state: WorkflowState
  prompt_overrides: Record<string, string>
}

export interface SubgraphTestRequestPayload {
  workflow: WorkflowEditorData
  start_node_id: string
  end_node_ids?: string[]
  test_state: WorkflowState
  prompt_overrides: Record<string, string>
}

export type BatchRunStatus = 'running' | 'finished' | 'cancelled'
export type BatchItemStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export interface BatchRunRequestPayload {
  workflow: WorkflowEditorData
  input_values: unknown[]
  max_parallel?: number
}

export interface BatchItemSummary {
  item_id: string
  index: number
  status: BatchItemStatus

  started_at?: string | null
  finished_at?: string | null

  error_type?: string | null
  error_message?: string | null
}

export interface BatchSummaryResponse {
  batch_id: string
  status: BatchRunStatus
  cancel_requested: boolean

  total: number
  queued: number
  running: number
  succeeded: number
  failed: number
  cancelled: number

  items: BatchItemSummary[]
}

export interface BatchItemDetailResponse {
  item_id: string
  index: number
  run_result: RunResult
}