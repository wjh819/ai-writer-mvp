import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import {
  validateContextLinkReferences,
  validateDataEdgeExecutionCycles,
  validateEdgeReferences,
  validateNodeInboundBindingRules,
  validateNodeOutputRules,
} from './workflowEditorValidationRules'

/**
 * 前端保存前总预检入口。
 *
 * 本文件角色：
 * - 编排前端轻量 validator 的执行顺序
 * - 尽早给用户返回首个可展示错误
 *
 * 负责：
 * - 组合节点规则、边规则、context link 规则、执行环规则
 * - 输出首个失败原因
 *
 * 不负责：
 * - 收集完整错误列表
 * - 外部依赖深校验
 * - 正式 contract 裁决
 * - 自动修复非法数据
 *
 * 上下游：
 * - 上游由 save 操作或 actions / controller 提供当前编辑态
 * - 下游返回首个错误字符串，供 UI 层阻止保存
 *
 * 当前限制 / 待收口点：
 * - 只返回首个错误
 * - 最终保存以后端 normalize + validator 为准
 * - prompt 模板存在性 / model resource 存在性等依赖问题不在这里处理
 */

/**
 * prompt 节点前端轻量规则检查。
 *
 * 负责：
 * - promptMode 合法性
 * - modelResourceId 必填
 * - llm 运行参数字段存在且为 number
 * - template / inline 两种模式下 prompt 与 inlinePrompt 的互斥关系
 *
 * 不负责：
 * - prompt 模板实际是否存在
 * - model resource 实际是否可解析
 * - prompt 变量与 inbound bindings 的依赖匹配
 */
export function validatePromptNodeRules(nodes: WorkflowEditorNode[] = []): string {
  for (const node of nodes) {
    const config = node?.data?.config
    const nodeType = config?.type

    if (nodeType !== 'prompt') {
      continue
    }

    const promptMode =
      typeof config.promptMode === 'string' ? config.promptMode.trim() : ''

    if (!['template', 'inline'].includes(promptMode)) {
      return `Prompt node '${node.id}' has invalid prompt mode: ${promptMode || '(empty)'}`
    }

    const modelResourceId =
      typeof config.modelResourceId === 'string' ? config.modelResourceId.trim() : ''
    if (!modelResourceId) {
      return `Prompt node '${node.id}' must select a model resource`
    }

    if (!config.llm) {
      return `Prompt node '${node.id}' must declare llm config`
    }

    const { temperature, timeout, max_retries } = config.llm

    if (typeof temperature !== 'number' || Number.isNaN(temperature)) {
      return `Prompt node '${node.id}' must declare llm.temperature`
    }

    if (typeof timeout !== 'number' || !Number.isFinite(timeout)) {
      return `Prompt node '${node.id}' must declare llm.timeout`
    }

    if (typeof max_retries !== 'number' || !Number.isFinite(max_retries)) {
      return `Prompt node '${node.id}' must declare llm.max_retries`
    }

    if (promptMode === 'template') {
      const promptName = typeof config.prompt === 'string' ? config.prompt.trim() : ''
      if (!promptName) {
        return `Prompt node '${node.id}' must select a prompt`
      }

      const inlinePrompt =
        typeof config.inlinePrompt === 'string' ? config.inlinePrompt.trim() : ''
      if (inlinePrompt) {
        return `Prompt node '${node.id}' must not declare inline prompt in template mode`
      }
    }

    if (promptMode === 'inline') {
      const inlinePrompt =
        typeof config.inlinePrompt === 'string' ? config.inlinePrompt.trim() : ''
      if (!inlinePrompt) {
        return `Prompt node '${node.id}' must provide inline prompt text`
      }
      const promptName =
        typeof config.prompt === 'string' ? config.prompt.trim() : ''
      if (promptName) {
        return `Prompt node '${node.id}' must not declare prompt in inline mode`
      }
    }
  }

  return ''
}

/**
 * 前端保存前总预检查。
 *
 * 执行顺序：
 * 1. 节点 output / stateKey 规则
 * 2. prompt 节点局部规则
 * 3. edge 引用关系
 * 4. inbound binding 规则
 * 5. context link 引用关系
 * 6. 执行图环检查
 *
 * 返回：
 * - 空字符串：通过
 * - 非空字符串：首个用户可展示错误
 *
 * 注意：
 * - 这里只是 UX 层提前失败
 * - 后端保存链仍会执行唯一正式 normalize + validator
 * - 这里只返回首个错误，目标是尽早阻止保存，而不是给出完整错误清单
 */
export function validateWorkflowBeforeSave(
  nodes: WorkflowEditorNode[] = [],
  edges: WorkflowEditorEdge[] = [],
  contextLinks: WorkflowContextLink[] = []
): string {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return 'Workflow must contain at least one node'
  }

  const outputRuleError = validateNodeOutputRules(nodes)
  if (outputRuleError) {
    return String(outputRuleError || 'Output rule validation failed')
  }

  const promptRuleError = validatePromptNodeRules(nodes)
  if (promptRuleError) {
    return promptRuleError
  }

  const edgeReferenceError = validateEdgeReferences(nodes, edges)
  if (edgeReferenceError) {
    return `Edge reference error: ${String(edgeReferenceError)}`
  }

  const inboundBindingRuleError = validateNodeInboundBindingRules(nodes, edges)
  if (inboundBindingRuleError) {
    return `Binding rule error: ${String(inboundBindingRuleError)}`
  }

  const contextLinkError = validateContextLinkReferences(
    nodes,
    edges,
    contextLinks
  )
  if (contextLinkError) {
    return `Context link error: ${String(contextLinkError)}`
  }

  const dataEdgeCycleError = validateDataEdgeExecutionCycles(
    nodes,
    edges,
    contextLinks
  )
  if (dataEdgeCycleError) {
    return `Execution graph error: ${String(dataEdgeCycleError)}`
  }

  return ''
}