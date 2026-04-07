import type {
  WorkflowContextLink,
  WorkflowEditorData,
} from '../workflowEditorTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../workflowEditorGraphTypes'

/**
 * 前端编辑态与后端接口态映射层。
 *
 * 本文件角色：
 * - 负责 ReactFlow 编辑壳 <-> 后端 workflow transport shape 的纯映射
 *
 * 负责：
 * - WorkflowEditorNode[] / WorkflowEditorEdge[] / contextLinks -> WorkflowEditorData
 * - WorkflowEditorData -> ReactFlow nodes / edges
 *
 * 不负责：
 * - contract normalize
 * - 默认值补齐
 * - 合法性修复
 * - 业务规则裁决
 *
 * 上下游：
 * - 上游由 controller / operations 层传入当前编辑态或后端返回数据
 * - 下游供 save/load 流程消费
 *
 * 当前限制 / 待收口点：
 * - position 缺失时的兜底仅属于前端显示壳，不属于正式 workflow 语义
 * - edge id 为前端显示/操作 identity，不是后端持久化字段
 */

function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  return String(value).trim()
}

function buildWorkflowEdgeId(params: {
  source: string
  sourceOutput: string
  target: string
  targetInput: string
}): string {
  return [
    'edge',
    trim(params.source),
    trim(params.sourceOutput),
    trim(params.target),
    trim(params.targetInput),
  ].join('::')
}

/**
 * 构建保存/运行链使用的前端 editor payload。
 *
 * 负责：
 * - 提取 ReactFlow node 壳中的业务字段
 * - 输出后端 workflow transport shape
 *
 * 不负责：
 * - 对 config 再做 normalize
 * - 修正非法 position / config / contextLinks
 *
 * 注意：
 * - 本函数默认上游已完成前端局部 coerce
 * - 最终以后端 normalize + validator 为准
 */
export function buildEditorPayload(
  nodes: WorkflowEditorNode[] = [],
  edges: WorkflowEditorEdge[] = [],
  contextLinks: WorkflowContextLink[] = []
): WorkflowEditorData {
  return {
    nodes: nodes.map(node => ({
      id: node.id,
      config: node.data.config,
      position: {
        x: node.position?.x,
        y: node.position?.y,
      },
    })),
    edges: edges.map(edge => ({
      source: edge.source,
      sourceOutput: edge.sourceOutput,
      target: edge.target,
      targetInput: edge.targetInput,
    })),
    contextLinks: contextLinks.map(link => ({
      id: trim(link.id),
      source: trim(link.source),
      target: trim(link.target),
      mode: link.mode,
    })),
  }
}

export function buildWorkflowContextLinks(
  data: WorkflowEditorData
): WorkflowContextLink[] {
  return (data.contextLinks || []).map(link => ({
    id: trim(link.id),
    source: trim(link.source),
    target: trim(link.target),
    mode: link.mode,
  }))
}

/**
 * 将后端 workflow transport node 映射为 ReactFlow node。
 *
 * 当前规则：
 * - node.type 固定为 'workflowNode'
 * - data 只承载业务 config
 * - position 缺失时给出 UI 展示兜底位置
 *
 * 当前限制：
 * - position fallback 仅服务前端可视化，不应被理解为正式业务默认值
 */
export function buildReactFlowNodes(data: WorkflowEditorData): WorkflowEditorNode[] {
  return (data.nodes || []).map((node, index) => ({
    id: node.id,
    type: 'workflowNode',
    data: {
      config: node.config,
    },
    position: node.position || {
      x: 120 + index * 180,
      y: 120,
    },
  }))
}

/**
 * 将后端 workflow transport edge 映射为 ReactFlow data edge 壳。
 *
 * 注意：
 * - 这里生成的 id 是前端 display / action identity
 * - 前端 edge id 仅用于当前编辑 / 显示壳，不来自后端持久化字段 identity
 */
export function buildReactFlowEdges(
  data: WorkflowEditorData
): WorkflowEditorEdge[] {
  return (data.edges || []).map(edge => {
    const source = trim(edge.source)
    const sourceOutput = trim(edge.sourceOutput)
    const target = trim(edge.target)
    const targetInput = trim(edge.targetInput)

    return {
      id: buildWorkflowEdgeId({
        source,
        sourceOutput,
        target,
        targetInput,
      }),
      source,
      target,
      relationType: 'data',
      sourceHandle: sourceOutput,
      targetHandle: targetInput,
      sourceOutput,
      targetInput,
    }
  })
}