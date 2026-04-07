import type { CanvasSummary } from '../../api'

interface CanvasSwitcherProps {
    requestedCanvasId: string
    activeCanvasId: string
    effectiveCanvasList: CanvasSummary[]
    isShowingCanvasSwitchingState: boolean
    isSwitchingWorkflow: boolean
    onRequestCanvasChange: (canvasId: string) => void
}

export default function CanvasSwitcher({
                                           requestedCanvasId,
                                           activeCanvasId,
                                           effectiveCanvasList,
                                           isShowingCanvasSwitchingState,
                                           isSwitchingWorkflow,
                                           onRequestCanvasChange,
                                       }: CanvasSwitcherProps) {
    return (
        <>
            <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Canvas</label>
                <select
                    value={requestedCanvasId}
                    onChange={e => onRequestCanvasChange(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={isSwitchingWorkflow || effectiveCanvasList.length === 0}
                >
                    {effectiveCanvasList.length === 0 ? (
                        <option value={requestedCanvasId}>{requestedCanvasId}</option>
                    ) : (
                        effectiveCanvasList.map(item => (
                            <option key={item.canvas_id} value={item.canvas_id}>
                                {item.label}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                Active: {activeCanvasId || '(none)'}
            </div>

            {isShowingCanvasSwitchingState ? (
                <div style={{ fontSize: 12, color: '#1d4ed8', marginBottom: 12 }}>
                    Requested: {requestedCanvasId}
                </div>
            ) : (
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                    {isSwitchingWorkflow ? 'Loading canvas...' : 'Canvas ready'}
                </div>
            )}
        </>
    )
}