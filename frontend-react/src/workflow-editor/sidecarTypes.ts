import type { WorkflowState } from '../shared/workflowSharedTypes'

/**
 * 前端 sidecar mirror：单节点 assets。
 *
 * 正式口径：
 * - pinnedInputs：节点级显式固定输入，保存解析后的结构化值
 * - pinnedPromptContext：当前只做 round-trip，不进入主面板主流程
 * - metadata：当前只做 opaque round-trip，不进入主面板主流程
 */
export interface WorkflowSidecarNodeAssets {
    pinnedInputs: WorkflowState
    pinnedPromptContext?: Record<string, unknown> | null
    metadata: Record<string, unknown>
}

/**
 * 一个 canvas 对应一个 sidecar 文件。
 *
 * 正式口径：
 * - 以 nodeId -> assets 组织
 * - 缺失 sidecar 时视为空壳
 * - 不是第二套 workflow contract
 */
export interface WorkflowSidecarData {
    nodes: Record<string, WorkflowSidecarNodeAssets>
}