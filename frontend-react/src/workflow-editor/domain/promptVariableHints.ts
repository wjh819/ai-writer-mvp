import type { PromptMode } from '../../shared/workflowSharedTypes'
/**
 * prompt 文本 hint 提取层。
 *
 * 本文件角色：
 * - 从前端可见的 prompt 文本中提取变量名提示
 *
 * 负责：
 * - 仅从 inline prompt 文本中提取 root-level 变量名 hint
 * - 为 editor UI 提供展示辅助
 *
 * 不负责：
 * - 正式输入语义定义
 * - 保存态生成
 * - binding 创建
 * - 校验 prompt 变量与 inbound bindings 的一致性
 *
 * 上下游：
 * - 上游来自 prompt 配置文本
 * - 下游由 viewState / NodeConfigPanel / PromptNodeConfigForm 展示消费
 *
 * 当前限制 / 待收口点：
 * - template 模式下当前无法读取模板正文，因此不提供 hint
 * - 当前提取逻辑只适合轻量 hint，不应被升级为正式 parser
 */
function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  return String(value).trim()
}

/**
 * 只从 inline prompt 文本里提取变量名 hint。
 *
 * 正式口径：
 * - 这是 text-derived hint，不是正式输入语义
 * - 只服务展示，不参与保存、不参与校验、不参与 binding 创建
 * - template 模式下当前不提供 hint（前端拿不到模板正文）
 */
 // 这里只做 UI hint 提取，不保证与正式 prompt 渲染/变量解析规则完全一致。
export function extractPromptVariableHints(
  promptMode: PromptMode,
  inlinePrompt: string
): string[] {
  if (promptMode !== 'inline') {
    return []
  }

  const text = String(inlinePrompt || '')
    .replace(/\{\{/g, '')
    .replace(/\}\}/g, '')

  const result: string[] = []
  const seen = new Set<string>()
  const regex = /\{([^{}]+)\}/g

  for (const match of text.matchAll(regex)) {
    const fieldName = trim(match[1])
    if (!fieldName) {
      continue
    }

    const rootName = trim(fieldName.split('.', 1)[0].split('[', 1)[0])
    if (!rootName) {
      continue
    }

    if (!seen.has(rootName)) {
      seen.add(rootName)
      result.push(rootName)
    }
  }

  return result
}