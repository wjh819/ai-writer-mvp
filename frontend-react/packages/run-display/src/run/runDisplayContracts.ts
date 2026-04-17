/**
 * Stable run-display input contracts.
 *
 * This file intentionally avoids importing workflow editor ownership types
 * (for example WorkflowEditorData) so run-display can depend on a narrower
 * DTO surface.
 */
export type WorkflowState = Record<string, unknown>
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
