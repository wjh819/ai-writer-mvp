import type { DisplayStep } from './runDisplayModels'
import { ValueBlock } from './RunValueBlock'
import { formatDuration } from './runFormatters'

/**
 * 步骤卡片基础渲染组件。
 *
 * 职责：
 * - 统一展示单步基础元信息：node、status、type、outputKey
 * - 条件展示时序字段、inputs、renderedPrompt、window 信息、output / failure
 * - 作为步骤卡片通用壳，允许外部通过 children 在中间插入额外展示区
 *
 * 边界：
 * - 本组件只消费 DisplayStep
 * - 不负责 state writeback 差异计算
 * - 不直接依赖 workflow direct run / persisted run detail 的底层 step DTO
 */

interface RunStepCardBaseProps {
  step: DisplayStep
  children?: React.ReactNode
}

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableJsonStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b)
  )

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`)
    .join(',')}}`
}

function areEquivalentJsonValues(left: unknown, right: unknown): boolean {
  try {
    return stableJsonStringify(left) === stableJsonStringify(right)
  } catch {
    return false
  }
}

export default function RunStepCardBase({
  step,
  children,
}: RunStepCardBaseProps) {
  const isRunning = step.status === 'running'
  const isFailed = step.status === 'failed'

  const hasTiming =
    Boolean(step.startedAt) ||
    Boolean(step.finishedAt) ||
    typeof step.durationMs === 'number'

  const failureText = step.errorDetail || step.errorMessage || ''
  const failureSummary = failureText
    ? failureText.split('\n')[0]
    : '步骤执行失败'

  const writebackCount = step.writeback?.items?.length || 0

  const isAggregatedOutputStep =
    step.type === 'output' &&
    !isRunning &&
    !isFailed &&
    typeof step.output !== 'undefined' &&
    step.inputs &&
    areEquivalentJsonValues(step.inputs, step.output)

  const statusTone = isRunning
    ? {
        border: '#93c5fd',
        dot: '#2563eb',
        chipBg: '#dbeafe',
        chipText: '#1d4ed8',
      }
    : isFailed
      ? {
          border: '#fecaca',
          dot: '#dc2626',
          chipBg: '#fee2e2',
          chipText: '#991b1b',
        }
      : {
          border: '#e5e7eb',
          dot: '#2563eb',
          chipBg: '#dcfce7',
          chipText: '#166534',
        }

  const outputTitle = isAggregatedOutputStep
    ? '聚合输出'
    : step.type === 'prompt' && writebackCount > 1
      ? '原始输出'
      : '输出'

  const hasWindowInfo =
    step.type === 'prompt' &&
    Boolean(step.windowMode || step.windowId || step.windowSourceNodeId)

  const windowModeLabel =
    step.windowMode === 'new_window'
      ? '新窗口'
      : step.windowMode === 'continue'
        ? '延续'
        : step.windowMode === 'branch'
          ? '分支'
          : '-'

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${statusTone.border}`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        background: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: 16,
          width: 12,
          height: 12,
          borderRadius: 999,
          background: statusTone.dot,
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
            步骤 {step.index + 1}
          </div>
          <strong>{step.node}</strong>
        </div>

        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 999,
            background: statusTone.chipBg,
            color: statusTone.chipText,
          }}
        >
          {step.status}
        </span>
      </div>

      {isRunning ? (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            fontSize: 12,
            color: '#1d4ed8',
          }}
        >
          当前步骤正在执行，中间输出可能暂不可用。
        </div>
      ) : null}

<div
  style={{
    fontSize: 13,
    color: '#444',
    marginBottom: 10,
  }}
>
  <div>
    <strong>类型：</strong> {step.type}
  </div>
</div>

      {hasTiming && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#334155',
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <strong>开始：</strong> {step.startedAt || '-'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>结束：</strong> {step.finishedAt || '-'}
          </div>
          <div>
            <strong>耗时：</strong> {formatDuration(step.durationMs)}
          </div>
        </div>
      )}

      {hasWindowInfo && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#334155',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            会话窗口
          </div>

          <div style={{ marginBottom: 4 }}>
            <strong>模式：</strong> {windowModeLabel}
          </div>

          {step.windowSourceNodeId ? (
            <div style={{ marginBottom: 4 }}>
              <strong>来源提示节点：</strong> {step.windowSourceNodeId}
            </div>
          ) : null}

          <div style={{ marginBottom: 4 }}>
            <strong>窗口 ID：</strong> {step.windowId || '-'}
          </div>

          {step.windowParentId ? (
            <div>
              <strong>父窗口 ID：</strong> {step.windowParentId}
            </div>
          ) : null}
        </div>
      )}

      {children}

      {!isAggregatedOutputStep && (
        <>
          {step.inputs ? (
            <ValueBlock title='输入' value={step.inputs} />
          ) : (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>输入</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                当前步骤类型未记录结构化输入。
              </div>
            </div>
          )}
        </>
      )}

      {isAggregatedOutputStep && (
        <div
          style={{
            marginBottom: 8,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#f8fafc',
            fontSize: 12,
            color: '#475569',
          }}
        >
          该输出节点将多个入站绑定聚合为一个对象。由于与最终聚合输出一致，
          已隐藏单独的输入区块。
        </div>
      )}

      {step.renderedPrompt && (
        <ValueBlock title='渲染后提示词' value={step.renderedPrompt} />
      )}

      {isRunning ? (
        <div
          style={{
            marginBottom: 8,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            fontSize: 12,
            color: '#1d4ed8',
          }}
        >
          步骤仍在运行，完成后将显示最终输出。
        </div>
      ) : isFailed ? (
        <>
          <div
            style={{
              marginBottom: 8,
              padding: 10,
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              fontSize: 12,
              color: '#991b1b',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>失败摘要</div>
            <div>{failureSummary}</div>
          </div>

          <ValueBlock
            title='失败详情'
            value={failureText}
            collapsed={false}
          />
        </>
      ) : (
        typeof step.output !== 'undefined' && (
          <ValueBlock title={outputTitle} value={step.output} />
        )
      )}
    </div>
  )
}
