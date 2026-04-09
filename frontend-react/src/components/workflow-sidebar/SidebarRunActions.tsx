interface SidebarRunActionsProps {
    isSaving: boolean
    isRunning: boolean
    isSwitchingWorkflow: boolean
    isDeleting: boolean
    isGraphEditingLocked: boolean
    isLiveRunActive: boolean
    hasRunResult: boolean
    hasAnyNodes: boolean
    onSave: (event?: { preventDefault?: () => void }) => void | Promise<void>
    onRun: () => void | Promise<void>
    onClearRunState: () => void
}

export default function SidebarRunActions({
    isSaving,
    isRunning,
    isSwitchingWorkflow,
    isDeleting,
    isGraphEditingLocked,
    isLiveRunActive,
    hasRunResult,
    hasAnyNodes,
    onSave,
    onRun,
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
                    Live run in progress. Save, run, and clear actions are temporarily locked.
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
                      : 'Run Draft'}
            </button>

            <button
                type='button'
                onClick={onClearRunState}
                style={{ width: '100%' }}
                disabled={!hasRunResult || isLiveRunActive}
            >
                Clear Run State
            </button>
        </>
    )
}