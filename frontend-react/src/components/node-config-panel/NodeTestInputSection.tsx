import type {
  EffectiveSubgraphTestInputItem,
  SubgraphTestInputSource,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import { ValueBlock } from './NodeValueBlock'

interface NodeTestInputSectionProps {
  nodeId: string
  effectiveSubgraphTestInputItems: EffectiveSubgraphTestInputItem[]
  pinnedInputDraftTexts: Record<string, string>
  onPinnedInputDraftChange: (
    nodeId: string,
    targetInput: string,
    nextValue: string
  ) => void
}

function hasOwnStringKey(value: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function formatPinnedInputDraft(value: unknown): string {
  if (typeof value === 'undefined') {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getEffectiveSourceLabel(source: SubgraphTestInputSource): string {
  switch (source) {
    case 'reusable':
      return '可复用'
    case 'pinned':
      return '已固定'
    default:
      return '缺失'
  }
}

function getEffectiveSourceStyles(source: SubgraphTestInputSource) {
  switch (source) {
    case 'reusable':
      return {
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
      }
    case 'pinned':
      return {
        border: '1px solid #c7d2fe',
        background: '#eef2ff',
        color: '#4338ca',
      }
    default:
      return {
        border: '1px solid #e5e7eb',
        background: '#f8fafc',
        color: '#64748b',
      }
  }
}

export default function NodeTestInputSection({
  nodeId,
  effectiveSubgraphTestInputItems,
  pinnedInputDraftTexts,
  onPinnedInputDraftChange,
}: NodeTestInputSectionProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        测试输入
      </div>

      {effectiveSubgraphTestInputItems.length === 0 ? (
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
          当前节点暂无派生测试输入。
        </div>
      ) : (
        <>
          {effectiveSubgraphTestInputItems.map(item => {
            const hasPinnedDraft = hasOwnStringKey(
              pinnedInputDraftTexts,
              item.targetInput
            )
            const sourceStyles = getEffectiveSourceStyles(item.effectiveSource)

            return (
              <div
                key={`${nodeId}-test-input-${item.targetInput}`}
                style={{
                  marginBottom: 12,
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
                    alignItems: 'center',
                    marginBottom: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {item.targetInput}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1,
                      padding: '5px 8px',
                      borderRadius: 999,
                      ...sourceStyles,
                    }}
                  >
                    {getEffectiveSourceLabel(item.effectiveSource)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: '#666',
                    marginBottom: 8,
                  }}
                >
                  来源状态键：{item.sourceStateKey}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <ValueBlock
                    title='当前生效值'
                    value={item.effectiveValue}
                    collapsed={false}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    固定默认值
                  </label>

                  <textarea
                    value={pinnedInputDraftTexts[item.targetInput] || ''}
                    onChange={e =>
                      onPinnedInputDraftChange(
                        nodeId,
                        item.targetInput,
                        e.target.value
                      )
                    }
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                    placeholder='可选兜底值：输入字符串或 JSON'
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type='button'
                    disabled={!item.hasReusableValue}
                    onClick={() =>
                      onPinnedInputDraftChange(
                        nodeId,
                        item.targetInput,
                        formatPinnedInputDraft(item.reusableValue)
                      )
                    }
                  >
                    Use Current Value as Pinned
                  </button>

                  <button
                    type='button'
                    disabled={!hasPinnedDraft && !item.hasPinnedValue}
                    onClick={() =>
                      onPinnedInputDraftChange(nodeId, item.targetInput, '')
                    }
                  >
                    Clear Pinned
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
