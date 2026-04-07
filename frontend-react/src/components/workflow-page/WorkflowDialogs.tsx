import { useEffect, useRef, useState } from 'react'

interface PendingBindingRequest {
    source: string
    sourceOutput: string
    target: string
}

interface WorkflowDialogsProps {
    isCreateCanvasDialogOpen: boolean
    draftCanvasId: string
    createCanvasErrorMessage: string
    onDraftCanvasIdChange: (value: string) => void
    onCloseCreateCanvasDialog: () => void
    onConfirmCreateCanvas: () => void

    pendingBindingRequest: PendingBindingRequest | null
    onCancelPendingBinding: () => void
    onConfirmPendingBinding: (targetInput: string) => boolean
}

export default function WorkflowDialogs({
                                            isCreateCanvasDialogOpen,
                                            draftCanvasId,
                                            createCanvasErrorMessage,
                                            onDraftCanvasIdChange,
                                            onCloseCreateCanvasDialog,
                                            onConfirmCreateCanvas,

                                            pendingBindingRequest,
                                            onCancelPendingBinding,
                                            onConfirmPendingBinding,
                                        }: WorkflowDialogsProps) {
    const createCanvasInputRef = useRef<HTMLInputElement | null>(null)
    const pendingTargetInputRef = useRef<HTMLInputElement | null>(null)
    const [pendingTargetInput, setPendingTargetInput] = useState('')

    useEffect(() => {
        if (isCreateCanvasDialogOpen) {
            createCanvasInputRef.current?.focus()
        }
    }, [isCreateCanvasDialogOpen])

    useEffect(() => {
        if (!pendingBindingRequest) {
            setPendingTargetInput('')
            return
        }

        pendingTargetInputRef.current?.focus()
    }, [pendingBindingRequest])

    return (
        <>
            {isCreateCanvasDialogOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={onCloseCreateCanvasDialog}
                >
                    <div
                        style={{
                            width: 420,
                            background: '#fff',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                            Create Blank Canvas
                        </div>

                        <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                            Enter a new canvas id. The blank canvas will exist locally first
                            and become a formal canvas after the first successful save.
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                                Canvas ID
                            </label>
                            <input
                                ref={createCanvasInputRef}
                                value={draftCanvasId}
                                onChange={e => onDraftCanvasIdChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') {
                                        onCloseCreateCanvasDialog()
                                        return
                                    }

                                    if (e.key === 'Enter') {
                                        onConfirmCreateCanvas()
                                    }
                                }}
                                style={{ width: '100%' }}
                                placeholder='e.g. article_draft_2'
                            />
                        </div>

                        {createCanvasErrorMessage && (
                            <div
                                style={{
                                    marginBottom: 12,
                                    padding: 10,
                                    borderRadius: 8,
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#991b1b',
                                    fontSize: 12,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {createCanvasErrorMessage}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button type='button' onClick={onCloseCreateCanvasDialog}>
                                Cancel
                            </button>
                            <button type='button' onClick={onConfirmCreateCanvas}>
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingBindingRequest && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => {
                        onCancelPendingBinding()
                        setPendingTargetInput('')
                    }}
                >
                    <div
                        style={{
                            width: 360,
                            background: '#fff',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                            Create Binding
                        </div>

                        <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                            {pendingBindingRequest.source}.{pendingBindingRequest.sourceOutput}
                            {' -> '}
                            {pendingBindingRequest.target}
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                                Target Input
                            </label>
                            <input
                                ref={pendingTargetInputRef}
                                value={pendingTargetInput}
                                onChange={e => setPendingTargetInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') {
                                        onCancelPendingBinding()
                                        setPendingTargetInput('')
                                        return
                                    }

                                    if (e.key === 'Enter') {
                                        const ok = onConfirmPendingBinding(pendingTargetInput)
                                        if (ok) {
                                            setPendingTargetInput('')
                                        }
                                    }
                                }}
                                style={{ width: '100%' }}
                                placeholder='e.g. topic / outline / draft'
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type='button'
                                onClick={() => {
                                    onCancelPendingBinding()
                                    setPendingTargetInput('')
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                onClick={() => {
                                    const ok = onConfirmPendingBinding(pendingTargetInput)
                                    if (ok) {
                                        setPendingTargetInput('')
                                    }
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}