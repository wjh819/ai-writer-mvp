import type { DisplayRun } from '@aiwriter/run-display'
import { ValueBlock } from './NodeValueBlock'

interface NodeTestResultSectionProps {
  isSubgraphTestRunning: boolean
  selectedSubgraphTestDisplayRun: DisplayRun | null
  subgraphTestErrorMessage: string
  subgraphTestInfoMessage: string
  onRunSubgraphTest: () => void
  onClearSubgraphTestResult: () => void
  onResetSubgraphTestContext: () => void
}

export default function NodeTestResultSection({
  isSubgraphTestRunning,
  selectedSubgraphTestDisplayRun,
  subgraphTestErrorMessage,
  subgraphTestInfoMessage,
  onRunSubgraphTest,
  onClearSubgraphTestResult,
  onResetSubgraphTestContext,
}: NodeTestResultSectionProps) {
  const isSubgraphTestResultStale = Boolean(
    selectedSubgraphTestDisplayRun?.isStale
  )

  const primarySubgraphTestState = selectedSubgraphTestDisplayRun?.primaryState ?? {}
  const primarySubgraphTestStateTitle =
    selectedSubgraphTestDisplayRun?.primaryStateTitle ?? '状态'

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <button
          type='button'
          onClick={onRunSubgraphTest}
          disabled={isSubgraphTestRunning}
        >
          {isSubgraphTestRunning ? '运行中...' : '运行测试'}
        </button>

        <button
          type='button'
          onClick={onClearSubgraphTestResult}
          disabled={!selectedSubgraphTestDisplayRun}
        >
          清除缓存结果
        </button>

        <button type='button' onClick={onResetSubgraphTestContext}>
          重置可复用上下文
        </button>
      </div>

      {subgraphTestInfoMessage ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {subgraphTestInfoMessage}
        </div>
      ) : null}

      {subgraphTestErrorMessage ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: '1px solid #fecaca',
            borderRadius: 8,
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {subgraphTestErrorMessage}
        </div>
      ) : null}

      {selectedSubgraphTestDisplayRun ? (
        <>
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              fontSize: 12,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              状态：<strong>{selectedSubgraphTestDisplayRun.status}</strong>
            </div>

            {isSubgraphTestResultStale ? (
              <div style={{ color: '#92400e' }}>
                该缓存测试结果已不适用于当前图语义（已过期）。
              </div>
            ) : null}
          </div>

          {selectedSubgraphTestDisplayRun.failureInfo ? (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>测试失败摘要</div>

              <div style={{ marginBottom: 4 }}>
                <strong>类型：</strong> {selectedSubgraphTestDisplayRun.failureInfo.typeLabel}
              </div>

              {selectedSubgraphTestDisplayRun.failureInfo.failedNode ? (
                <div style={{ marginBottom: 4 }}>
                  <strong>失败步骤：</strong>{' '}
                  {selectedSubgraphTestDisplayRun.failureInfo.failedNode}
                </div>
              ) : null}

              {selectedSubgraphTestDisplayRun.failureStage ? (
                <div style={{ marginBottom: 4 }}>
                  <strong>失败阶段：</strong>{' '}
                  {selectedSubgraphTestDisplayRun.failureStage}
                </div>
              ) : null}

              <div style={{ marginBottom: 8 }}>
                {selectedSubgraphTestDisplayRun.failureInfo.summary}
              </div>

              {selectedSubgraphTestDisplayRun.failureInfo.detail ? (
                <ValueBlock
                  title='错误详情'
                  value={selectedSubgraphTestDisplayRun.failureInfo.detail}
                  collapsed={false}
                />
              ) : null}
            </div>
          ) : null}

          <div style={{ marginBottom: 12 }}>
            <ValueBlock
              title={primarySubgraphTestStateTitle}
              value={primarySubgraphTestState}
              collapsed={false}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              步骤
              {selectedSubgraphTestDisplayRun.steps.length > 0
                ? ` (${selectedSubgraphTestDisplayRun.steps.length})`
                : ''}
            </div>

            {selectedSubgraphTestDisplayRun.steps.length === 0 ? (
              <div
                style={{
                  padding: 10,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#f9fafb',
                  fontSize: 12,
                  color: '#666',
                }}
              >
                未返回步骤。
              </div>
            ) : (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                  展开步骤
                </summary>
                <div style={{ marginTop: 8 }}>
                  {selectedSubgraphTestDisplayRun.steps.map(step => (
                    <div
                      key={step.id}
                      style={{
                        marginBottom: 10,
                        padding: 10,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <strong>{step.node}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            color: step.status === 'failed' ? '#991b1b' : '#166534',
                          }}
                        >
                          {step.status}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {step.type}
                        {typeof step.durationMs === 'number'
                          ? ` · ${step.durationMs} ms`
                          : ''}
                      </div>

                      {step.errorMessage ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#991b1b',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {step.errorMessage}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#f9fafb',
            fontSize: 12,
            color: '#666',
          }}
        >
          当前选中节点暂无缓存测试结果。
        </div>
      )}
    </>
  )
}
