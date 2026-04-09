interface WorkflowPageBannersProps {
    liveRunStatusMessage: string
    workflowStatusMessage: string
    temporaryCanvasStatusMessage: string
    topLevelErrorMessage: string
    workflowWarningsMessage: string
    draftStatusMessage: string
    onRevertToSaved: () => void | Promise<void>
    disableRevertToSaved: boolean
    revertToSavedTitle?: string
}

export default function WorkflowPageBanners({
    liveRunStatusMessage,
    workflowStatusMessage,
    temporaryCanvasStatusMessage,
    topLevelErrorMessage,
    workflowWarningsMessage,
    draftStatusMessage,
    onRevertToSaved,
    disableRevertToSaved,
    revertToSavedTitle,
}: WorkflowPageBannersProps) {
    return (
        <>
            {liveRunStatusMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #93c5fd',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Live Run</div>
                    <div>{liveRunStatusMessage}</div>
                </div>
            )}

            {workflowStatusMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Canvas Status</div>
                    <div>{workflowStatusMessage}</div>
                </div>
            )}

            {temporaryCanvasStatusMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #fcd34d',
                        background: '#fffbeb',
                        color: '#92400e',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>New Canvas</div>
                    <div>{temporaryCanvasStatusMessage}</div>
                </div>
            )}

            {topLevelErrorMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#991b1b',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Workflow Error
                    </div>
                    <div>{topLevelErrorMessage}</div>
                </div>
            )}

            {workflowWarningsMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #fcd34d',
                        background: '#fffbeb',
                        color: '#92400e',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Workflow Warnings
                    </div>
                    <div>{workflowWarningsMessage}</div>
                </div>
            )}

            {draftStatusMessage && (
                <div
                    style={{
                        margin: '8px 12px 0 12px',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #fcd34d',
                        background: '#fffbeb',
                        color: '#92400e',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Draft Status</div>
                        <div>{draftStatusMessage}</div>
                    </div>

                    <button
                        type='button'
                        onClick={onRevertToSaved}
                        disabled={disableRevertToSaved}
                        title={revertToSavedTitle}
                    >
                        Revert to Saved
                    </button>
                </div>
            )}
        </>
    )
}