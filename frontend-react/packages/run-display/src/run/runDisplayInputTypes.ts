import type {
  FailureStage,
  LiveRunSnapshot,
  PromptWindowMode,
  RunResult,
  RunScope,
  RunStatus,
  WorkflowState,
  StepNodeType,
  StepProjection,
  StepStatus,
} from './runDisplayContracts'

// Stable input contract bridge for run-display.
// This keeps run-display coupled to a narrow type anchor without pulling
// workflow editor payload ownership types.
export type {
  FailureStage,
  LiveRunSnapshot,
  PromptWindowMode,
  RunResult,
  RunScope,
  RunStatus,
  WorkflowState,
  StepNodeType,
  StepProjection,
  StepStatus,
}
