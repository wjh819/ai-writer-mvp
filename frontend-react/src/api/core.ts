/**
 * 前端 HTTP request wrapper 核心常量与共享类型层。
 *
 * 本文件角色：
 * - 提供 API_BASE / 默认 canvas 常量
 * - 承载 workflow request wrapper 复用的基础类型
 *
 * 注意：
 * - 当前仅做 api.ts 文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

import type { WorkflowEditorData } from '../workflow-editor/workflowEditorTypes'
import type {
    WorkflowLoadWarning,
    WorkflowSidecarData,
} from '../workflow-editor/workflowEditorUiTypes'

export const API_BASE = 'http://127.0.0.1:8000/api'

export const DEFAULT_CANVAS_ID = 'article'

export interface CanvasSummary {
    canvas_id: string
    label: string
}

export interface SaveWorkflowOptions {
    rejectIfExists?: boolean
}

export interface SaveWorkflowRequestPayload {
    workflow: WorkflowEditorData
    sidecar?: WorkflowSidecarData
}

export interface LoadWorkflowResponse {
    workflow: WorkflowEditorData
    sidecar: WorkflowSidecarData
    warnings: WorkflowLoadWarning[]
}