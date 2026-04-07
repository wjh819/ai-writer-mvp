import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type {
    LoadWorkflowActionResult,
    RuntimeActionResult,
    WorkflowLoadWarning,
    WorkflowSidecarData,
} from '../../workflow-editor/workflowEditorUiTypes'

const CANVAS_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

interface CanvasSummary {
    canvas_id: string
    label: string
}

interface SaveWorkflowOptions {
    rejectIfExists?: boolean
}

interface UseCanvasLifecycleOptions {
    requestedCanvasId: string
    setRequestedCanvasId: (value: string) => void
    activeCanvasId: string
    setActiveCanvasId: (value: string) => void
    setActiveWorkflowContextId: Dispatch<SetStateAction<number>>
    temporaryCanvasId: string | null
    setTemporaryCanvasId: (value: string | null) => void

    canvasList: CanvasSummary[]
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
    workflowSidecar: WorkflowSidecarData

    graphPersistedVersion: number
    isGraphDirty: boolean

    clearPageError: () => void
    setPageErrorMessage: (message: string) => void
    setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
    setIsSwitchingWorkflow: (value: boolean) => void
    setCommittedGraphPersistedVersion: (value: number) => void

    loadCurrentWorkflow: (canvasId: string) => Promise<LoadWorkflowActionResult>
    refreshWorkflowList: () => Promise<RuntimeActionResult>
    handleDeleteCanvas: (canvasId: string) => Promise<RuntimeActionResult>
    handleSave: (
        canvasId: string,
        nodes: WorkflowEditorNode[],
        edges: WorkflowEditorEdge[],
        contextLinks: WorkflowContextLink[],
        sidecar: WorkflowSidecarData,
        options?: SaveWorkflowOptions
    ) => Promise<RuntimeActionResult>

    resetGraphSideEffectsForCommittedWorkflow: (
        nextNodes: WorkflowEditorNode[],
        nextEdges: WorkflowEditorEdge[],
        nextContextLinks: WorkflowContextLink[],
        nextSidecar: WorkflowSidecarData
    ) => void
}

function buildCanvasSwitchErrorMessage(params: {
    targetCanvasId: string
    activeCanvasId: string
    errorMessage: string
}): string {
    const { targetCanvasId, activeCanvasId, errorMessage } = params

    return [
        `Failed to switch canvas to "${targetCanvasId}".`,
        `Active canvas remains "${activeCanvasId}".`,
        errorMessage,
    ].join('\n')
}

function normalizeCanvasId(value: string): string {
    return value.trim()
}

function validateCanvasId(value: string): string {
    const normalized = normalizeCanvasId(value)

    if (!normalized) {
        return 'Canvas id is required'
    }

    if (!CANVAS_ID_RE.test(normalized)) {
        return 'Canvas id must start with a letter or number, and contain only letters, numbers, underscores, and hyphens'
    }

    return ''
}

export function useCanvasLifecycle({
                                       requestedCanvasId,
                                       setRequestedCanvasId,
                                       activeCanvasId,
                                       setActiveCanvasId,
                                       setActiveWorkflowContextId,
                                       temporaryCanvasId,
                                       setTemporaryCanvasId,

                                       canvasList,
                                       nodes,
                                       edges,
                                       contextLinks,
                                       workflowSidecar,

                                       graphPersistedVersion,
                                       isGraphDirty,

                                       clearPageError,
                                       setPageErrorMessage,
                                       setWorkflowWarnings,
                                       setIsSwitchingWorkflow,
                                       setCommittedGraphPersistedVersion,

                                       loadCurrentWorkflow,
                                       refreshWorkflowList,
                                       handleDeleteCanvas,
                                       handleSave,

                                       resetGraphSideEffectsForCommittedWorkflow,
                                   }: UseCanvasLifecycleOptions) {
    const [isCreateCanvasDialogOpen, setIsCreateCanvasDialogOpen] =
        useState(false)
    const [draftCanvasId, setDraftCanvasId] = useState('')
    const [createCanvasErrorMessage, setCreateCanvasErrorMessage] = useState('')

    const workflowLoadEpochRef = useRef(0)
    const hasLoadedInitialWorkflowRef = useRef(false)

    const isActiveCanvasTemporary = temporaryCanvasId === activeCanvasId

    const formalCanvasIds = useMemo(
        () => canvasList.map(item => item.canvas_id),
        [canvasList]
    )

    const remainingFormalCanvasIds = useMemo(
        () => formalCanvasIds.filter(canvasId => canvasId !== activeCanvasId),
        [formalCanvasIds, activeCanvasId]
    )

    const canDeleteCurrentCanvas = isActiveCanvasTemporary
        ? formalCanvasIds.length > 0
        : formalCanvasIds.length > 1

    const workflowStatusMessage = useMemo(() => {
        if (!requestedCanvasId || !activeCanvasId) {
            return ''
        }

        if (requestedCanvasId === activeCanvasId) {
            return ''
        }

        return `Switching canvas from "${activeCanvasId}" to "${requestedCanvasId}"...`
    }, [requestedCanvasId, activeCanvasId])

    const temporaryCanvasStatusMessage = useMemo(() => {
        if (!isActiveCanvasTemporary) {
            return ''
        }

        return [
            `Editing unsaved blank canvas "${activeCanvasId}".`,
            'This canvas only exists locally until the first successful save.',
        ].join('\n')
    }, [isActiveCanvasTemporary, activeCanvasId])

    const confirmDiscardTemporaryCanvas = useCallback(
        (nextCanvasId?: string) => {
            if (!isActiveCanvasTemporary) {
                return true
            }

            const nextTargetText = nextCanvasId
                ? `switch to "${nextCanvasId}"`
                : 'continue'

            return window.confirm(
                [
                    `Canvas "${activeCanvasId}" has not been saved yet.`,
                    `If you ${nextTargetText}, this temporary blank canvas will be discarded.`,
                    'Do you want to proceed?',
                ].join('\n')
            )
        },
        [isActiveCanvasTemporary, activeCanvasId]
    )

    const commitWorkflowLoad = useCallback(
        async (params: {
            targetCanvasId: string
            previousActiveCanvasId: string
            requestEpoch: number
            shouldCommitAsActiveCanvas: boolean
        }) => {
            const {
                targetCanvasId,
                previousActiveCanvasId,
                requestEpoch,
                shouldCommitAsActiveCanvas,
            } = params

            setIsSwitchingWorkflow(true)

            const result = await loadCurrentWorkflow(targetCanvasId)

            if (workflowLoadEpochRef.current !== requestEpoch) {
                return
            }

            setIsSwitchingWorkflow(false)

            if (result.errorMessage) {
                setPageErrorMessage(
                    shouldCommitAsActiveCanvas
                        ? buildCanvasSwitchErrorMessage({
                            targetCanvasId,
                            activeCanvasId: previousActiveCanvasId,
                            errorMessage: result.errorMessage,
                        })
                        : result.errorMessage
                )

                if (shouldCommitAsActiveCanvas) {
                    setRequestedCanvasId(previousActiveCanvasId)
                }

                return
            }

            clearPageError()
            setWorkflowWarnings(result.warnings || [])
            resetGraphSideEffectsForCommittedWorkflow(
                result.nodes,
                result.edges,
                result.contextLinks,
                result.sidecar
            )
            hasLoadedInitialWorkflowRef.current = true

            if (shouldCommitAsActiveCanvas) {
                setActiveCanvasId(targetCanvasId)
                setTemporaryCanvasId(null)
                setActiveWorkflowContextId(prev => prev + 1)
            }
        },
        [
            loadCurrentWorkflow,
            setIsSwitchingWorkflow,
            setPageErrorMessage,
            setRequestedCanvasId,
            clearPageError,
            setWorkflowWarnings,
            resetGraphSideEffectsForCommittedWorkflow,
            setActiveCanvasId,
            setTemporaryCanvasId,
            setActiveWorkflowContextId,
        ]
    )

    useEffect(() => {
        const isInitialLoad = !hasLoadedInitialWorkflowRef.current
        const isCanvasSwitch = requestedCanvasId !== activeCanvasId

        if (!isInitialLoad && !isCanvasSwitch) {
            return
        }

        const targetCanvasId = isInitialLoad ? activeCanvasId : requestedCanvasId

        const requestEpoch = workflowLoadEpochRef.current + 1
        workflowLoadEpochRef.current = requestEpoch

        void commitWorkflowLoad({
            targetCanvasId,
            previousActiveCanvasId: activeCanvasId,
            requestEpoch,
            shouldCommitAsActiveCanvas: !isInitialLoad && isCanvasSwitch,
        })
    }, [requestedCanvasId, activeCanvasId, commitWorkflowLoad])

    const requestCanvasChange = useCallback(
        (nextCanvasId: string) => {
            if (!nextCanvasId || nextCanvasId === requestedCanvasId) {
                return
            }

            if (!confirmDiscardTemporaryCanvas(nextCanvasId)) {
                return
            }

            clearPageError()
            setRequestedCanvasId(nextCanvasId)
        },
        [
            requestedCanvasId,
            confirmDiscardTemporaryCanvas,
            clearPageError,
            setRequestedCanvasId,
        ]
    )

    const handleRefreshWorkflowList = useCallback(async () => {
        const result = await refreshWorkflowList()

        if (result.errorMessage) {
            setPageErrorMessage(result.errorMessage)
            return
        }

        clearPageError()
    }, [refreshWorkflowList, setPageErrorMessage, clearPageError])

    const openCreateCanvasDialog = useCallback(() => {
        clearPageError()
        setCreateCanvasErrorMessage('')
        setDraftCanvasId('')
        setIsCreateCanvasDialogOpen(true)
    }, [clearPageError])

    const closeCreateCanvasDialog = useCallback(() => {
        setIsCreateCanvasDialogOpen(false)
        setDraftCanvasId('')
        setCreateCanvasErrorMessage('')
    }, [])

    const handleDraftCanvasIdChange = useCallback((nextValue: string) => {
        setDraftCanvasId(nextValue)
        setCreateCanvasErrorMessage('')
    }, [])

    const confirmCreateCanvas = useCallback(() => {
        const nextCanvasId = normalizeCanvasId(draftCanvasId)
        const validationMessage = validateCanvasId(nextCanvasId)

        if (validationMessage) {
            setCreateCanvasErrorMessage(validationMessage)
            return
        }

        const hasDuplicateInList = canvasList.some(
            item => item.canvas_id === nextCanvasId
        )

        if (
            hasDuplicateInList ||
            nextCanvasId === activeCanvasId ||
            nextCanvasId === requestedCanvasId ||
            nextCanvasId === temporaryCanvasId
        ) {
            setCreateCanvasErrorMessage(`Canvas id already exists: ${nextCanvasId}`)
            return
        }

        if (!confirmDiscardTemporaryCanvas(nextCanvasId)) {
            return
        }

        closeCreateCanvasDialog()
        clearPageError()
        setWorkflowWarnings([])
        resetGraphSideEffectsForCommittedWorkflow([], [], [], { nodes: {} })
        hasLoadedInitialWorkflowRef.current = true
        setTemporaryCanvasId(nextCanvasId)
        setRequestedCanvasId(nextCanvasId)
        setActiveCanvasId(nextCanvasId)
        setActiveWorkflowContextId(prev => prev + 1)
    }, [
        draftCanvasId,
        canvasList,
        activeCanvasId,
        requestedCanvasId,
        temporaryCanvasId,
        confirmDiscardTemporaryCanvas,
        closeCreateCanvasDialog,
        clearPageError,
        setWorkflowWarnings,
        resetGraphSideEffectsForCommittedWorkflow,
        setTemporaryCanvasId,
        setRequestedCanvasId,
        setActiveCanvasId,
        setActiveWorkflowContextId,
    ])

    const buildDeleteConfirmationMessage = useCallback(() => {
        if (isActiveCanvasTemporary) {
            const messageLines = [
                `Discard temporary canvas "${activeCanvasId}"?`,
                'This blank canvas only exists locally and has not been saved yet.',
            ]

            if (isGraphDirty) {
                messageLines.push(
                    'Current unsaved edits on this temporary canvas will be lost.'
                )
            }

            messageLines.push('This action cannot be undone.')
            return messageLines.join('\n')
        }

        const messageLines = [
            `Delete formal canvas "${activeCanvasId}"?`,
            'This will permanently delete the current canvas files.',
        ]

        if (isGraphDirty) {
            messageLines.push(
                'Current unsaved draft changes on this canvas will also be lost.'
            )
        }

        messageLines.push('This action cannot be undone.')
        return messageLines.join('\n')
    }, [isActiveCanvasTemporary, activeCanvasId, isGraphDirty])

    const handleDeleteCurrentCanvas = useCallback(async () => {
        if (!canDeleteCurrentCanvas) {
            setPageErrorMessage('At least one formal saved canvas must remain')
            return
        }

        const nextCanvasId = isActiveCanvasTemporary
            ? formalCanvasIds[0] || ''
            : remainingFormalCanvasIds[0] || ''

        if (!nextCanvasId) {
            setPageErrorMessage('No remaining formal canvas is available')
            return
        }

        const confirmed = window.confirm(buildDeleteConfirmationMessage())
        if (!confirmed) {
            return
        }

        clearPageError()
        setWorkflowWarnings([])

        if (isActiveCanvasTemporary) {
            setRequestedCanvasId(nextCanvasId)
            return
        }

        const result = await handleDeleteCanvas(activeCanvasId)
        if (result.errorMessage) {
            setPageErrorMessage(result.errorMessage)
            return
        }

        const refreshResult = await refreshWorkflowList()
        if (refreshResult.errorMessage) {
            setPageErrorMessage(refreshResult.errorMessage)
        }

        setRequestedCanvasId(nextCanvasId)
    }, [
        canDeleteCurrentCanvas,
        isActiveCanvasTemporary,
        formalCanvasIds,
        remainingFormalCanvasIds,
        buildDeleteConfirmationMessage,
        clearPageError,
        setWorkflowWarnings,
        setRequestedCanvasId,
        handleDeleteCanvas,
        activeCanvasId,
        refreshWorkflowList,
        setPageErrorMessage,
    ])

    const handleSaveWorkflow = useCallback(async () => {
        const result = await handleSave(
            activeCanvasId,
            nodes,
            edges,
            contextLinks,
            workflowSidecar,
            {
                rejectIfExists: isActiveCanvasTemporary,
            }
        )

        if (result.errorMessage) {
            setPageErrorMessage(result.errorMessage)
            return
        }

        setCommittedGraphPersistedVersion(graphPersistedVersion)
        setWorkflowWarnings([])

        if (isActiveCanvasTemporary) {
            const refreshResult = await refreshWorkflowList()
            if (refreshResult.errorMessage) {
                setPageErrorMessage(refreshResult.errorMessage)
            } else {
                clearPageError()
            }

            setTemporaryCanvasId(null)
            return
        }

        clearPageError()
    }, [
        handleSave,
        activeCanvasId,
        nodes,
        edges,
        contextLinks,
        workflowSidecar,
        isActiveCanvasTemporary,
        setPageErrorMessage,
        setCommittedGraphPersistedVersion,
        graphPersistedVersion,
        setWorkflowWarnings,
        refreshWorkflowList,
        clearPageError,
        setTemporaryCanvasId,
    ])

    const handleRevertToSaved = useCallback(async () => {
        if (isActiveCanvasTemporary) {
            return
        }

        const result = await loadCurrentWorkflow(activeCanvasId)

        if (result.errorMessage) {
            setPageErrorMessage(result.errorMessage)
            return
        }

        clearPageError()
        setWorkflowWarnings(result.warnings || [])
        resetGraphSideEffectsForCommittedWorkflow(
            result.nodes,
            result.edges,
            result.contextLinks,
            result.sidecar
        )
    }, [
        isActiveCanvasTemporary,
        loadCurrentWorkflow,
        activeCanvasId,
        setPageErrorMessage,
        clearPageError,
        setWorkflowWarnings,
        resetGraphSideEffectsForCommittedWorkflow,
    ])

    return {
        isCreateCanvasDialogOpen,
        draftCanvasId,
        createCanvasErrorMessage,
        handleDraftCanvasIdChange,
        setCreateCanvasErrorMessage,
        openCreateCanvasDialog,
        closeCreateCanvasDialog,
        confirmCreateCanvas,

        requestCanvasChange,
        handleRefreshWorkflowList,
        handleDeleteCurrentCanvas,
        handleSaveWorkflow,
        handleRevertToSaved,

        isActiveCanvasTemporary,
        canDeleteCurrentCanvas,
        workflowStatusMessage,
        temporaryCanvasStatusMessage,
    }
}