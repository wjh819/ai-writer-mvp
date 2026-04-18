interface CanvasActionsProps {
    modelResourceCount: number
    isSwitchingWorkflow: boolean
    isDeleting: boolean
    isGraphEditingLocked: boolean
    canDeleteCurrentCanvas: boolean
    isActiveCanvasTemporary: boolean
    onOpenCreateCanvas: () => void
    onDeleteCurrentCanvas: () => void | Promise<void>
    onRefreshWorkflowList: () => void
    onOpenModelResources: () => void
}

export default function CanvasActions({
    modelResourceCount,
    isSwitchingWorkflow,
    isDeleting,
    isGraphEditingLocked,
    canDeleteCurrentCanvas,
    isActiveCanvasTemporary,
    onOpenCreateCanvas,
    onDeleteCurrentCanvas,
    onRefreshWorkflowList,
    onOpenModelResources,
}: CanvasActionsProps) {
    const isActionDisabled =
        isSwitchingWorkflow || isDeleting || isGraphEditingLocked

    return (
        <>
            <button
                type='button'
                onClick={onOpenCreateCanvas}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isActionDisabled}
            >
                Create Blank Canvas
            </button>

            <button
                type='button'
                onClick={onDeleteCurrentCanvas}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isActionDisabled || !canDeleteCurrentCanvas}
                title={
                    !canDeleteCurrentCanvas
                        ? '至少需要保留一个已保存的正式画布'
                        : undefined
                }
            >
                {isDeleting
                    ? isActiveCanvasTemporary
                        ? 'Discarding...'
                        : 'Deleting...'
                    : isActiveCanvasTemporary
                      ? 'Discard Current Canvas'
                      : 'Delete Current Canvas'}
            </button>

            <button
                type='button'
                onClick={onRefreshWorkflowList}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isActionDisabled}
            >
                Refresh Canvas List
            </button>

            <button
                type='button'
                onClick={onOpenModelResources}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isActionDisabled}
            >
                Model Resources
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                {modelResourceCount === 0
                    ? '未加载模型资源'
                    : `可用模型资源：${modelResourceCount} 个`}
            </div>
        </>
    )
}
