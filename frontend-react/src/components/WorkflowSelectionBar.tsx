import type {
  WorkflowEditorContextEdge,
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../workflow-editor/workflowEditorGraphTypes'

interface WorkflowSelectionBarProps {
  selectedNode: WorkflowEditorNode | null
  selectedEdge: WorkflowEditorEdge | null
  selectedContextEdge: WorkflowEditorContextEdge | null
  isLoadingWorkflow: boolean
  isGraphEditingLocked: boolean
  onDeleteSelectedEdge: () => void
  onDeleteSelectedContextEdge: () => void
  onSetSelectedContextEdgeMode: (mode: 'continue' | 'branch') => void
}

export default function WorkflowSelectionBar({
  selectedNode,
  selectedEdge,
  selectedContextEdge,
  isLoadingWorkflow,
  isGraphEditingLocked,
  onDeleteSelectedEdge,
  onDeleteSelectedContextEdge,
  onSetSelectedContextEdgeMode,
}: WorkflowSelectionBarProps) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        background: '#fff',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {selectedNode ? (
        <span>
          Selected Node: <strong>{selectedNode.id}</strong>
        </span>
      ) : selectedEdge ? (
        <>
          <span>
            Selected Binding:{' '}
            <strong>
              {selectedEdge.source}.{selectedEdge.sourceOutput} {'->'}{' '}
              {selectedEdge.target}.{selectedEdge.targetInput}
            </strong>
          </span>

          <button
            type='button'
            onClick={onDeleteSelectedEdge}
            disabled={isLoadingWorkflow || isGraphEditingLocked}
          >
            Delete Edge
          </button>
        </>
      ) : selectedContextEdge ? (
        <>
          <span>
            Selected Context Link:{' '}
            <strong>
              {selectedContextEdge.source} {'->'} {selectedContextEdge.target}
            </strong>{' '}
            <span style={{ opacity: 0.72 }}>({selectedContextEdge.mode})</span>
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type='button'
              onClick={() => onSetSelectedContextEdgeMode('continue')}
              disabled={
                isLoadingWorkflow ||
                isGraphEditingLocked ||
                selectedContextEdge.mode === 'continue'
              }
            >
              Set Continue
            </button>

            <button
              type='button'
              onClick={() => onSetSelectedContextEdgeMode('branch')}
              disabled={
                isLoadingWorkflow ||
                isGraphEditingLocked ||
                selectedContextEdge.mode === 'branch'
              }
            >
              Set Branch
            </button>

            <button
              type='button'
              onClick={onDeleteSelectedContextEdge}
              disabled={isLoadingWorkflow || isGraphEditingLocked}
            >
              Delete Context Link
            </button>
          </div>
        </>
      ) : (
        <span style={{ color: '#666' }}>
          {isLoadingWorkflow
            ? '加载中...'
            : isGraphEditingLocked
              ? '实时运行中，图编辑已锁定。'
              : '当前未选中节点或连线。点击紫色上下文连线可切换 continue / branch。'}
        </span>
      )}
    </div>
  )
}
