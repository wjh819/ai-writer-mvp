/**
 * 格式化步骤耗时展示。
 *
 * 当前展示规则非常轻量：
 * - 非合法 number 返回 '-'
 * - 合法 number 统一展示为 `${durationMs} ms`
 *
 * 这里只负责展示格式化，不负责单位换算或更复杂的人类可读时长表达。
 */
export function formatDuration(durationMs?: number) {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) {
    return '-'
  }

  return `${durationMs} ms`
}