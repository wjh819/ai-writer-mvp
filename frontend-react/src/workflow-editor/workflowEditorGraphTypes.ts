import type { Edge, Node } from 'reactflow'

import type { WorkflowState } from '../shared/workflowSharedTypes'
import type { WorkflowNodeConfig } from './workflowEditorTypes'

/**
 * ReactFlow graph shell type 层。
 *
 * 本文件角色：
 * - 定义 ReactFlow 节点/边壳类型
 * - 承载前端 graph-derived 与 execution-derived 的只读展示字段
 *
 * 负责：
 * - WorkflowEditorNode / WorkflowEditorEdge / WorkflowEditorContextEdge
 * - 节点 data 壳中的只读展示字段
 * - graph handle 常量
 *
 * 不负责：
 * - 后端 canonical contract
 * - 保存态 owner
 * - runtime validation
 *
 * 上下游：
 * - 上游由 workflowEditorTypes 提供业务 config mirror types
 * - 下游由 graph / viewState / controller / components 消费
 *
 * 当前限制 / 待收口点：
 * - node.data 中同时承载 config 与多种 graph-derived/runtime-derived 字段，属于前端显示壳设计
 * - graphWindowMode / new_window 仅表示 graph truth 的只读展示摘要，不是运行时窗口实例 identity
 * - WorkflowEditorEdge / WorkflowEditorContextEdge 的 id 仅服务前端编辑与显示，不代表后端持久化 identity
 */

export type GraphWindowMode = 'new_window' | 'continue' | 'branch'
export type LiveRunDisplayStatus = 'idle' | 'running' | 'success' | 'failed'
export type SubgraphTestActionHandler = (nodeId: string) => void

export interface InboundBindingDisplayItem {
  sourceNodeId: string
  sourceOutput: string
  targetInput: string
}

/**
 * ReactFlow 节点壳中的 data 结构。
 *
 * 分层说明：
 * - config：正式业务 config mirror，属于保存链
 * - runtimeInputs / runtimeOutput / runtimePublishedState：来自最近一次 full run 的只读展示字段
 * - isRunActive / isRunRunning / isRunFailed / liveStatus / liveErrorMessage：来自当前 live run 的只读展示字段
 * - derivedTargetInputs / inboundBindings / promptVariableHints：graph/text 派生字段，不进入保存态
 * - graphWindow*：来自顶层 contextLinks 的 graph truth 摘要，不是运行态 window instance
 * - 节点测试入口字段只保留最小触发与运行态，不承载结果摘要
 */
export interface WorkflowNodeData {
  config: WorkflowNodeConfig

  // full run display fields
  isExecuted?: boolean
  stepIndex?: number
  runtimeInputs?: WorkflowState
  runtimeOutput?: unknown
  runtimePublishedState?: WorkflowState

  // live run display fields
  isRunActive?: boolean
  isRunRunning?: boolean
  isRunFailed?: boolean
  liveStatus?: LiveRunDisplayStatus
  liveErrorMessage?: string

    // node card interaction lock
    // true only while a live full run is active; used purely for UI lock display
    isNodeInteractionLocked?: boolean

  // graph-derived display fields
  derivedTargetInputs?: string[]
  inboundBindings?: InboundBindingDisplayItem[]
  promptVariableHints?: string[]

  // graph truth summary: derived from top-level contextLinks, not runtime window instance
  graphWindowMode?: GraphWindowMode
  graphWindowSourceNodeId?: string | null
  graphWindowTargetNodeIds?: string[]

  /**
   * 节点本体上的子图测试触发入口。
   *
   * 注意：
   * - 这里只暴露节点卡片按钮所需的最小 action handler
   * - 不承载结果摘要
   */
  onRequestSubgraphTest?: SubgraphTestActionHandler

  /**
   * 节点卡片上的最小子图测试运行态。
   *
   * 注意：
   * - 这里只服务按钮 loading 态
   * - 不承载结果摘要 / stale / target 等额外 UI 状态
   */
  isSubgraphTestRunning?: boolean
}

export type WorkflowEditorNode = Node<WorkflowNodeData, 'workflowNode'>

export const CREATE_BINDING_HANDLE_ID = '__new_binding__'
export const CONTEXT_SOURCE_HANDLE_ID = '__context_source__'
export const CONTEXT_TARGET_HANDLE_ID = '__context_target__'

export type WorkflowEditorEdge = Edge & {
  relationType: 'data'
  sourceOutput: string
  targetInput: string
}

export type WorkflowEditorContextEdge = Edge & {
  relationType: 'context'
  contextLinkId: string
  mode: 'continue' | 'branch'
}

export type WorkflowGraphEdge =
  | WorkflowEditorEdge
  | WorkflowEditorContextEdge

export type ExecutedNodeMap = Record<string, number>