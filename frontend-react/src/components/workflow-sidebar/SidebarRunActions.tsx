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
          Add at least one node before saving or running this canvas.
        </div>
      ) : null}

      {isLiveRunActive ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          Live run in progress. Save, run, batch run, and clear actions are
          temporarily locked.
        </div>
      ) : null}

      {isBatchRunActive && !isBatchCancelRequested ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          Batch run in progress. Save, run, and graph editing actions are
          temporarily locked.
        </div>
      ) : null}

      {isBatchRunActive && isBatchCancelRequested ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          Batch cancellation requested. Running items will finish naturally.
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