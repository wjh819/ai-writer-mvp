import type {
  FailureStage,
  PromptWindowMode,
  RunScope,
  RunStatus,
  StepNodeType,
  StepStatus,
} from '../../run/runTypes'
import type { PromptMode, WorkflowState } from '../../shared/workflowSharedTypes'

/**
 * run display model 层。
 *
 * 本文件角色：
 * - 定义前端展示层消费的 DisplayRun / DisplayStep / DisplayFailureInfo
 * - 作为 transport result 与 UI 组件之间的 display model 锚点
 *
 * 负责：
 * - 承载展示友好的运行结果模型
 * - 区分原始 RunResult / LiveRunSnapshot 与前端解释后的 DisplayRun
 *
 * 不负责：
 * - 定义后端 run contract
 * - 重新计算 execution facts
 * - 组件渲染逻辑
 *
 * 上下游：
 * - 上游由 runDisplayMappers.ts 产出
 * - 下游由 RunResultPanel / RunResultSteps / RunStateOverview 等组件消费
 *
 * 当前限制：
 * - DisplayStep.id 是 display-local id，不是稳定业务标识
 * - windowId 等字段当前仅用于单次 run 展示，不应被视为 durable identity
 */
export type DisplayRunSource = 'direct' | 'live'
export type DisplayRunStatus = RunStatus | 'running'
export type DisplayRunScope = RunScope
export type DisplayStepStatus = StepStatus | 'running'

export interface DisplayFailureInfo {
  typeLabel: string
  summary: string
  detail: string
  failedNode: string
}

export interface DisplayWritebackItem {
  key: string
  beforeValue: unknown
  afterValue: unknown
}

export interface DisplayWriteback {
  applied: boolean
  items: DisplayWritebackItem[]
}

export interface DisplayStep {
  id: string
  index: number

  node: string
  type: StepNodeType
  status: DisplayStepStatus

  startedAt?: string
  finishedAt?: string
  durationMs?: number

  promptMode?: PromptMode
  promptRef?: string
  promptDisplayText?: string

  inputs?: Record<string, unknown>
  renderedPrompt?: string

  output?: unknown
  errorMessage?: string
  errorDetail?: string

  windowMode?: PromptWindowMode
  windowSourceNodeId?: string
  windowId?: string
  windowParentId?: string

  writeback?: DisplayWriteback | null
}

/**
 * 前端展示层消费的运行结果模型。
 *
 * 正式口径：
 * - primaryState 已由 display mapper 选定
 *   - running = current_state
 *   - success = final_state
 *   - failed = partial_state
 * - failureInfo 已是前端展示友好的失败摘要
 * - raw 保留原始 direct run result 或 live snapshot 供调试显示
 * - isStale 仍是页面层注入的 display 语义
 */
export interface DisplayRun {
  source: DisplayRunSource

  status: DisplayRunStatus
  runScope: DisplayRunScope
  failureStage?: FailureStage

  inputState: WorkflowState
  currentState: WorkflowState
  primaryState: WorkflowState
  primaryStateTitle: string

  steps: DisplayStep[]
  failureInfo: DisplayFailureInfo | null

  raw: unknown
  isStale?: boolean

  runId?: string
  activeNodeId?: string | null
  isLive?: boolean
}