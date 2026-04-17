import type { WorkflowEditorData } from '../workflow-editor/workflowEditorTypes'
import type { RunResult, WorkflowState } from '@aiwriter/run-display'

export type {
  BaseStepProjection,
  FailureStage,
  InputFailedStepProjection,
  InputSuccessStepProjection,
  LiveRunSnapshot,
  LiveRunStartResponse,
  LiveRunStatus,
  OutputFailedStepProjection,
  OutputSuccessStepProjection,
  PromptFailedStepProjection,
  PromptSuccessStepProjection,
  PromptWindowMode,
  RunResult,
  RunScope,
  RunStatus,
  StepNodeType,
  StepProjection,
  StepStatus,
} from '@aiwriter/run-display'

/**
 * Frontend transport/request type mirror.
 *
 * Boundary intent:
 * - execution result + display input contracts are owned by
 *   `@aiwriter/run-display`.
 * - request payloads that carry workflow editor ownership types remain here.
 */

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
