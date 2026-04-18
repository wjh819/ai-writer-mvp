interface SidebarRunActionsProps {
  isSaving: boolean
  isRunning: boolean
  isSwitchingWorkflow: boolean
  isDeleting: boolean
  isGraphEditingLocked: boolean
  isLiveRunActive: boolean
  isBatchRunActive: boolean
  isBatchCancelRequested: boolean
  hasRunResult: boolean
  hasBatchResult: boolean
  hasAnyNodes: boolean
  onSave: (event?: { preventDefault?: () => void }) => void | Promise<void>
  onRun: () => void | Promise<void>
  onRunBatch: () => void | Promise<void>
  onCancelBatch: () => void | Promise<void>
  onClearRunState: () => void
}

export default function SidebarRunActions({
  isSaving,
  isRunning,
  isSwitchingWorkflow,
  isDeleting,
  isGraphEditingLocked,
  isLiveRunActive,
  isBatchRunActive,
  isBatchCancelRequested,
  hasRunResult,
  hasBatchResult,
  hasAnyNodes,
  onSave,
  onRun,
  onRunBatch,
  onCancelBatch,
  onClearRunState,
}: SidebarRunActionsProps) {
  const isActionLocked =
    isSwitchingWorkflow || isDeleting || isGraphEditingLocked

  return (
    <>
      {!hasAnyNodes ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          请先添加至少一个节点，再进行保存或运行。
        </div>
      ) : null}

      {isLiveRunActive ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          实时运行中，保存、运行、批处理运行和清空操作已暂时锁定。
        </div>
      ) : null}

      {isBatchRunActive && !isBatchCancelRequested ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          批处理运行中，保存、运行和图编辑操作已暂时锁定。
        </div>
      ) : null}

      {isBatchRunActive && isBatchCancelRequested ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          已请求取消批处理。正在运行的条目会自然完成。
        </div>
      ) : null}

      <button
        type='button'
        onClick={onSave}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={isSaving || isActionLocked || !hasAnyNodes}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>

      <button
        type='button'
        onClick={onRun}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={isRunning || isActionLocked || !hasAnyNodes}
      >
        {isRunning
          ? 'Starting Run...'
          : isLiveRunActive
            ? 'Live Run Active...'
            : isBatchRunActive
              ? 'Batch Run Active...'
              : 'Run Draft'}
      </button>

      <button
        type='button'
        onClick={onRunBatch}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={isRunning || isActionLocked || !hasAnyNodes}
      >
        {isRunning
          ? 'Starting Batch...'
          : isBatchRunActive
            ? 'Batch Run Active...'
            : isLiveRunActive
              ? 'Live Run Active...'
              : 'Run Batch'}
      </button>

      <button
        type='button'
        onClick={onCancelBatch}
        style={{ width: '100%', marginBottom: 8 }}
        disabled={!isBatchRunActive || isBatchCancelRequested}
      >
        {isBatchCancelRequested ? 'Cancel Requested...' : 'Cancel Batch'}
      </button>

      <button
        type='button'
        onClick={onClearRunState}
        style={{ width: '100%' }}
        disabled={!(hasRunResult || hasBatchResult) || isLiveRunActive}
      >
        Clear Run State
      </button>
    </>
  )
}
