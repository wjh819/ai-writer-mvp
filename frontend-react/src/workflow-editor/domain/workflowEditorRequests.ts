/**
 * 请求辅助层。
 *
 * 只负责提供与请求结果处理相关的轻量纯函数，
 * 包括错误消息提取与 workflowName 选择策略。
 *
 * 不负责：
 * - 发起 HTTP 请求
 * - 编排加载 / 保存 / 运行流程
 * - 管理 React 组件状态
 *
 * 上层 operations 会组合这里的函数，
 * 但本文件自身不承担异步流程控制。
 */

/**
 * 从不同形态的错误对象中提取用户可读错误信息。
 *
 * 当前兼容：
 * - response.data.detail 为字符串
 * - detail 为数组
 * - detail 为对象
 * - 普通 error.message
 * - 调用方提供的 fallback
 *
 * 返回值始终为可直接展示的字符串，
 * 以便上层无需重复处理不同错误结构。
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Request failed'
): string {
  const detail = (
    error as {
      response?: {
        data?: {
          detail?: unknown
        }
      }
      message?: string
    }
  )?.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map(item =>
        typeof item === 'string'
          ? item
          : (item as { msg?: string })?.msg || JSON.stringify(item)
      )
      .join('\n')
  }

  if (detail && typeof detail === 'object') {
    return (
      (detail as { msg?: string }).msg || JSON.stringify(detail)
    )
  }

  const message = (error as { message?: string })?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

/**
 * 在 workflow 文件列表变化后，决定当前应使用的 workflowName。
 *
 * 当前规则：
 * - 若列表为空，保留 currentName
 * - 若 currentName 仍存在，继续使用 currentName
 * - 否则若 defaultName 存在，切到 defaultName
 * - 再否则退回列表第一个文件
 *
 * 这里只负责名称选择策略，
 * 不负责加载对应 workflow 详情。
 */
export function resolveNextWorkflowName(
  files: string[],
  currentName: string,
  defaultName: string
): string {
  if (!Array.isArray(files) || files.length === 0) {
    return currentName
  }

  if (files.includes(currentName)) {
    return currentName
  }

  if (files.includes(defaultName)) {
    return defaultName
  }

  return files[0]
}