import type {
  BatchItemSummary,
  BatchSummaryResponse,
} from '../../../run/runTypes'

interface WorkflowEditorBatchSummarySectionProps {
  batchSummary: BatchSummaryResponse
  selectedBatchItemId: string | null
  selectedBatchSummaryItem: BatchItemSummary | null
  isBatchResultStale: boolean
  isBatchCancelRequested: boolean
  onSelectBatchItem: (itemId: string) => void
}

export default function WorkflowEditorBatchSummarySection({
  batchSummary,
  selectedBatchItemId,
  selectedBatchSummaryItem,
  isBatchResultStale,
  isBatchCancelRequested,
  onSelectBatchItem,
}: WorkflowEditorBatchSummarySectionProps) {
  return (
    <div
      style={{
        borderTop: '1px solid #ddd',
        padding: 12,
        maxHeight: 260,
        overflow: 'auto',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong>Batch Summary</strong>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Status: {batchSummary.status}
            {isBatchResultStale ? ' · stale' : ''}
          </div>
          {batchSummary.status === 'running' && isBatchCancelRequested ? (
            <div
              style={{
                fontSize: 12,
                color: '#92400e',
                marginTop: 6,
              }}
            >
              Cancellation requested. Running items will finish naturally.
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
          <div>Total: {batchSummary.total}</div>
          <div>Queued: {batchSummary.queued}</div>
          <div>Running: {batchSummary.running}</div>
          <div>Succeeded: {batchSummary.succeeded}</div>
          <div>Failed: {batchSummary.failed}</div>
          <div>Cancelled: {batchSummary.cancelled}</div>
          <div>
            Completed:{' '}
            {batchSummary.succeeded +
              batchSummary.failed +
              batchSummary.cancelled}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {batchSummary.items.map(item => {
          const isSelected = item.item_id === selectedBatchItemId
          return (
            <button
              key={item.item_id}
              type='button'
              onClick={() => {
                onSelectBatchItem(item.item_id)
              }}
              style={{
                textAlign: 'left',
                padding: 8,
                border: '1px solid #ddd',
                background: isSelected ? '#eef6ff' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong>#{item.index + 1}</strong> · {item.status}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {item.error_message || item.error_type || 'No error'}
              </div>
            </button>
          )
        })}
      </div>

      {selectedBatchSummaryItem ? (
        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          Selected item: #{selectedBatchSummaryItem.index + 1} ·{' '}
          {selectedBatchSummaryItem.status}
        </div>
      ) : null}
    </div>
  )
}

