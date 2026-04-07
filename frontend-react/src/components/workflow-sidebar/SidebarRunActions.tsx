interface SidebarRunActionsProps {
    isSaving: boolean
    isRunning: boolean
    isSwitchingWorkflow: boolean
    isDeleting: boolean
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
                                              hasRunResult,
                                              hasAnyNodes,
                                              onSave,
                                              onRun,
                                              onClearRunState,
                                          }: SidebarRunActionsProps) {
    return (
        <>
            {!hasAnyNodes ? (
                <div style={{ marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                    Add at least one node before saving or running this canvas.
                </div>
            ) : null}

            <button
                type='button'
                onClick={onSave}
                style={{ width: '100%', marginBottom: 8 }}
                disabled={isSaving || isSwitchingWorkflow || isDeleting || !hasAnyNodes}
            >
                {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
                onClick={onRun}
                style={{ width: '100%', marginBottom: 8 }}
                disabled={isRunning || isSwitchingWorkflow || isDeleting || !hasAnyNodes}
            >
                {isRunning ? 'Running...' : 'Run Draft'}
            </button>

            <button
                onClick={onClearRunState}
                style={{ width: '100%' }}
                disabled={!hasRunResult}
            >
                Clear Run State
            </button>
        </>
    )
}