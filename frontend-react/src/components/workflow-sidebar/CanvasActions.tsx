interface CanvasActionsProps {
    modelResourceCount: number
    isSwitchingWorkflow: boolean
    isDeleting: boolean
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
                                          canDeleteCurrentCanvas,
                                          isActiveCanvasTemporary,
                                          onOpenCreateCanvas,
                                          onDeleteCurrentCanvas,
                                          onRefreshWorkflowList,
                                          onOpenModelResources,
                                      }: CanvasActionsProps) {
    return (
        <>
            <button
                type='button'
                onClick={onOpenCreateCanvas}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isSwitchingWorkflow || isDeleting}
            >
                Create Blank Canvas
            </button>

            <button
                type='button'
                onClick={onDeleteCurrentCanvas}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isSwitchingWorkflow || isDeleting || !canDeleteCurrentCanvas}
                title={
                    !canDeleteCurrentCanvas
                        ? 'At least one formal saved canvas must remain'
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
                onClick={onRefreshWorkflowList}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isSwitchingWorkflow || isDeleting}
            >
                Refresh Canvas List
            </button>

            <button
                onClick={onOpenModelResources}
                style={{ width: '100%', marginTop: 8 }}
                disabled={isSwitchingWorkflow || isDeleting}
            >
                Model Resources
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                {modelResourceCount === 0
                    ? 'No model resources loaded'
                    : `${modelResourceCount} model resource(s) available`}
            </div>
        </>
    )
}