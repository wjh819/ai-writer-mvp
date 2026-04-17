import type { DisplayWriteback } from './runDisplayModels'
import { ValueBlock } from './RunValueBlock'

interface RunStepWritebackSectionProps {
  writeback?: DisplayWriteback | null
}

export default function RunStepWritebackSection({
  writeback,
}: RunStepWritebackSectionProps) {
  if (!writeback?.applied || !writeback.items.length) {
    return null
  }

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        State Writeback
        {writeback.items.length > 1 ? ` (${writeback.items.length})` : ''}
      </div>

      {writeback.items.map((item, index) => (
        <div
          key={`${item.key}-${index}`}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 10,
            background: '#fff',
            marginBottom: index === writeback.items.length - 1 ? 0 : 10,
          }}
        >
          <div style={{ marginBottom: 8, fontSize: 13 }}>
            <strong>key:</strong> {item.key}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <ValueBlock title='Before' value={item.beforeValue} />
            <ValueBlock title='After' value={item.afterValue} />
          </div>
        </div>
      ))}
    </div>
  )
}