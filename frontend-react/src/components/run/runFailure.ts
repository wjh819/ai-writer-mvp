/**
 * run failure 展示辅助层。
 *
 * 本文件角色：
 * - 将 error_type 转为前端展示 label
 * - 将任意错误值转为可展示文本
 *
 * 不负责：
 * - 拥有错误分类体系
 * - 决定失败摘要优先级
 *
 * 当前限制：
 * - error_type label 映射为手写前端镜像，需与后端同步
 * - 对对象错误当前直接 JSON.stringify，更偏调试展示而非专门文案
 */
export function getErrorText(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || typeof value === 'undefined') {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

export function mapErrorTypeLabel(errorType?: string) {
  /**
   * 将后端 error_type 映射为前端展示标签。
   *
   * 注意：
   * - 这里只做展示文案映射
   * - 未知 error_type 会统一回退为 'Run Failed'
   */
  switch (errorType) {
    case 'missing_inputs':
      return 'Missing Inputs'
    case 'prompt_render_failed':
      return 'Prompt Render Failed'
    case 'structured_output_invalid':
      return 'Structured Output Invalid'
    case 'workflow_definition_error':
      return 'Workflow Definition Error'
    case 'node_execution_failed':
      return 'Node Execution Failed'
    case 'request_invalid':
    case 'request_error':
      return 'Request Failed'
    case 'unexpected_error':
      return 'Unexpected Error'
    default:
      return 'Run Failed'
  }
}