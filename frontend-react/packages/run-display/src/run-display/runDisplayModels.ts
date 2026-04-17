import type {
  FailureStage,
  PromptWindowMode,
  RunScope,
  RunStatus,
  StepNodeType,
  StepStatus,
  WorkflowState,
} from '../run/runDisplayInputTypes'

/**
 * run display model 灞傘€?
 *
 * 鏈枃浠惰鑹诧細
 * - 瀹氫箟鍓嶇灞曠ず灞傛秷璐圭殑 DisplayRun / DisplayStep / DisplayFailureInfo
 * - 浣滀负 transport result 涓?UI 缁勪欢涔嬮棿鐨?display model 閿氱偣
 *
 * 璐熻矗锛?
 * - 鎵胯浇灞曠ず鍙嬪ソ鐨勮繍琛岀粨鏋滄ā鍨?
 * - 鍖哄垎鍘熷 RunResult / LiveRunSnapshot 涓庡墠绔В閲婂悗鐨?DisplayRun
 *
 * 涓嶈礋璐ｏ細
 * - 瀹氫箟鍚庣 run contract
 * - 閲嶆柊璁＄畻 execution facts
 * - 缁勪欢娓叉煋閫昏緫
 *
 * 涓婁笅娓革細
 * - 涓婃父鐢?runDisplayMappers.ts 浜у嚭
 * - 涓嬫父鐢?RunResultPanel / RunResultSteps / RunStateOverview 绛夌粍浠舵秷璐?
 *
 * 褰撳墠闄愬埗锛?
 * - DisplayStep.id 鏄?display-local id锛屼笉鏄ǔ瀹氫笟鍔℃爣璇?
 * - windowId 绛夊瓧娈靛綋鍓嶄粎鐢ㄤ簬鍗曟 run 灞曠ず锛屼笉搴旇瑙嗕负 durable identity
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
 * 鍓嶇灞曠ず灞傛秷璐圭殑杩愯缁撴灉妯″瀷銆?
 *
 * 姝ｅ紡鍙ｅ緞锛?
 * - primaryState 宸茬敱 display mapper 閫夊畾
 *   - running = current_state
 *   - success = final_state
 *   - failed = partial_state
 * - failureInfo 宸叉槸鍓嶇灞曠ず鍙嬪ソ鐨勫け璐ユ憳瑕?
 * - raw 淇濈暀鍘熷 direct run result 鎴?live snapshot 渚涜皟璇曟樉绀?
 * - isStale 浠嶆槸椤甸潰灞傛敞鍏ョ殑 display 璇箟
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

