/**
 * workflow editor 页面级 UI 上下文与动作结果类型层总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 load warnings / sidecar / runtime action result / run context 拆分到子文件
 *
 * 注意：
 * - 当前仅做文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export type { WorkflowLoadWarning } from './loadWarnings'

export type {
    WorkflowSidecarNodeAssets,
    WorkflowSidecarData,
} from './sidecarTypes'

export type {
    RuntimeActionResult,
    LoadWorkflowActionResult,
} from './runtimeActionTypes'

export type { WorkflowRunContext } from './runContextTypes'