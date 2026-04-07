import type { WorkflowState } from '../../shared/workflowSharedTypes'
import { ValueBlock } from './RunValueBlock'

/**
 * 整体 state 对照结果。
 *
 * 用于把 inputState 与 resultState 的整体差异
 * 收敛为更适合展示层消费的轻量摘要。
 */
interface OverallStateDiff {
  addedKeys: string[]
  modifiedKeys: string[]
}

/**
 * 轻量比较两个值是否相等。
 *
 * 优先使用严格相等；
 * 若不相等，则退化为 JSON 序列化后比较。
 *
 * 说明：
 * - 这里只用于 run state overview 的展示摘要
 * - 不作为底层数据相等性标准
 */
function areValuesEqual(left: unknown, right: unknown) {
  if (left === right) {
    return true
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

/**
 * 判断对象自身是否拥有某个 key。
 */
function hasOwnKey(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

/**
 * 构建 run 前后整体 state 的轻量差异摘要。
 *
 * 输出两类 key：
 * - addedKeys: 运行前不存在、运行后存在的 key
 * - modifiedKeys: 运行前后都存在且值发生变化的 key
 *
 * 注意：
 * - 这里只统计 resultState 中实际存在的 key
 * - 这里只服务整体 state 总览展示，不作为正式状态差异算法
 */
function buildOverallStateDiff(
  inputState: WorkflowState,
  resultState: WorkflowState
): OverallStateDiff {
  const addedKeys: string[] = []
  const modifiedKeys: string[] = []

  const keys = Object.keys(resultState || {})

  keys.forEach(key => {
    const beforeHasKey = hasOwnKey(inputState, key)

    if (!beforeHasKey) {
      addedKeys.push(key)
      return
    }

    if (!areValuesEqual(inputState[key], resultState[key])) {
      modifiedKeys.push(key)
    }
  })

  return {
    addedKeys,
    modifiedKeys,
  }
}

/**
 * 某一类 key 摘要列表的展示组件。
 */
function SummaryKeyList({
  title,
  keys,
}: {
  title: string
  keys: string[]
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 10,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {title} ({keys.length})
      </div>
      {keys.length === 0 ? (
        <div style={{ fontSize: 12, color: '#64748b' }}>None</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keys.map(key => (
            <span
              key={key}
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#f1f5f9',
                color: '#334155',
              }}
            >
              {key}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 运行 state 总览组件。
 *
 * 本文件角色：
 * - 展示 run 前 inputState 与主结果 state 的整体对照
 * - 输出弱解释的新增/变更字段摘要
 *
 * 职责：
 * - 并排展示 inputState 与 resultState
 * - 对 run 前后字段变化做轻量摘要
 *
 * 关键口径：
 * - 这是整体 state 对照视图，不是逐步 writeback 时间线
 * - 这里只保留新增/变更两类弱摘要，避免过度解释运行语义
 *
 * 当前限制：
 * - areValuesEqual 仅用于展示摘要，不是底层数据相等性标准
 * - 差异比较以浅层 key 集合为入口，不承担复杂结构化 diff 语义
 */
export default function RunStateOverview({
  inputState,
  resultState,
  resultStateTitle = 'Result State',
}: {
  inputState: WorkflowState
  resultState: WorkflowState
  resultStateTitle?: string
}) {
  const overallDiff = buildOverallStateDiff(inputState, resultState)

  return (
    <>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Run State Overview</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <ValueBlock title='Input State' value={inputState} />
        <ValueBlock title={resultStateTitle} value={resultState} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <SummaryKeyList
          title='New fields (missing before run)'
          keys={overallDiff.addedKeys}
        />
        <SummaryKeyList title='Updated fields' keys={overallDiff.modifiedKeys} />
      </div>
    </>
  )
}