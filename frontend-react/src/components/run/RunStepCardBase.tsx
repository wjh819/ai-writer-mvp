import type { DisplayStep } from './runDisplayModels'
import { ValueBlock } from './RunValueBlock'
import { formatDuration } from './runFormatters'

/**
 * 步骤卡片基础渲染组件。
 *
 * 职责：
 * - 统一展示单步基础元信息：node、status、type、outputKey
 * - 条件展示 prompt 相关字段、时序字段、inputs、renderedPrompt、output / failure
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

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
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
  const isFailed = step.status === 'failed'
  const hasTiming =
    Boolean(step.startedAt) ||
    Boolean(step.finishedAt) ||
    typeof step.durationMs === 'number'

  const failureText = step.errorDetail || step.errorMessage || ''
  const failureSummary = failureText
    ? failureText.split('\n')[0]
    : 'Step execution failed'

  const writebackCount = step.writeback?.items?.length || 0

  const isAggregatedOutputStep =
    step.type === 'output' &&
    !isFailed &&
    typeof step.output !== 'undefined' &&
    step.inputs &&
    areEquivalentJsonValues(step.inputs, step.output)

  const outputTitle = isAggregatedOutputStep
    ? 'Aggregated Output'
    : step.type === 'prompt' && writebackCount > 1
      ? 'Raw Output'
      : 'Output'

  const hasWindowInfo =
    step.type === 'prompt' &&
    Boolean(step.windowMode || step.windowId || step.windowSourceNodeId)

  const windowModeLabel =
    step.windowMode === 'new_window'
      ? 'New Window'
      : step.windowMode === 'continue'
        ? 'Continue'
        : step.windowMode === 'branch'
          ? 'Branch'
          : '-'

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${isFailed ? '#fecaca' : '#e5e7eb'}`,
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
          background: isFailed ? '#dc2626' : '#2563eb',
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
            Step {step.index + 1}
          </div>
          <strong>{step.node}</strong>
        </div>

        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 999,
            background: isFailed ? '#fee2e2' : '#dcfce7',
            color: isFailed ? '#991b1b' : '#166534',
          }}
        >
          {step.status}
        </span>
      </div>

<div
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    fontSize: 13,
    color: '#444',
    marginBottom: 10,
  }}
>
  <div>
    <strong>type:</strong> {step.type}
  </div>

  {step.promptMode && (
    <div>
      <strong>prompt mode:</strong> {step.promptMode}
    </div>
  )}

  {step.promptDisplayText && (
    <div>
      <strong>prompt source:</strong> {step.promptDisplayText}
    </div>
  )}
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
            <strong>started:</strong> {step.startedAt || '-'}
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>finished:</strong> {step.finishedAt || '-'}
          </div>
          <div>
            <strong>duration:</strong> {formatDuration(step.durationMs)}
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
            Conversation Window
          </div>

          <div style={{ marginBottom: 4 }}>
            <strong>mode:</strong> {windowModeLabel}
          </div>

          {step.windowSourceNodeId ? (
            <div style={{ marginBottom: 4 }}>
              <strong>source prompt node:</strong> {step.windowSourceNodeId}
            </div>
          ) : null}

          <div style={{ marginBottom: 4 }}>
            <strong>window id:</strong> {step.windowId || '-'}
          </div>

          {step.windowParentId ? (
            <div>
              <strong>parent window id:</strong> {step.windowParentId}
            </div>
          ) : null}
        </div>
      )}

      {children}

      {!isAggregatedOutputStep && (
        <>
          {step.inputs ? (
            <ValueBlock title='Inputs' value={step.inputs} />
          ) : (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Inputs</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                No structured inputs recorded for this step type.
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
          This output node aggregated multiple inbound bindings into one object.
          The separate Inputs block is hidden because it is identical to the final
          aggregated output.
        </div>
      )}

      {step.renderedPrompt && (
        <ValueBlock title='Rendered Prompt' value={step.renderedPrompt} />
      )}

      {isFailed ? (
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
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Failure Summary</div>
            <div>{failureSummary}</div>
          </div>

          <ValueBlock
            title='Failure Detail'
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