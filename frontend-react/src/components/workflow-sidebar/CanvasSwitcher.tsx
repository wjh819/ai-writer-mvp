import type { CanvasSummary } from '../../api'

interface CanvasSwitcherProps {
    requestedCanvasId: string
    activeCanvasId: string
    effectiveCanvasList: CanvasSummary[]
    isShowingCanvasSwitchingState: boolean
    isSwitchingWorkflow: boolean
    isGraphEditingLocked: boolean
    onRequestCanvasChange: (canvasId: string) => void
}

export default function CanvasSwitcher({
    requestedCanvasId,
    activeCanvasId,
    effectiveCanvasList,
    isShowingCanvasSwitchingState,
    isSwitchingWorkflow,
    isGraphEditingLocked,
    onRequestCanvasChange,
}: CanvasSwitcherProps) {
    const isSelectDisabled =
        isSwitchingWorkflow ||
        isGraphEditingLocked ||
        effectiveCanvasList.length === 0

    return (
        <>
            <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Canvas</label>
                <select
                    value={requestedCanvasId}
                    onChange={e => onRequestCanvasChange(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={isSelectDisabled}
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
                当前生效：{activeCanvasId || '（无）'}
            </div>

            {isShowingCanvasSwitchingState ? (
                <div style={{ fontSize: 12, color: '#1d4ed8', marginBottom: 12 }}>
                    目标切换：{requestedCanvasId}
                </div>
            ) : isGraphEditingLocked ? (
                <div style={{ fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                    实时运行中，暂时无法切换画布。
                </div>
            ) : (
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                    {isSwitchingWorkflow ? '正在加载画布...' : '画布已就绪'}
                </div>
            )}
        </>
    )
}
