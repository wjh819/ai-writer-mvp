import type { Dispatch, SetStateAction } from 'react'
import { useCanvasCreateDialog } from './useCanvasCreateDialog'
import { useCanvasDeleteAction } from './useCanvasDeleteAction'
import { useCanvasLoadSwitch } from './useCanvasLoadSwitch'
import { useCanvasLifecycleStatus } from './useCanvasLifecycleStatus'
import { useCanvasPersistenceActions } from './useCanvasPersistenceActions'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import type {
    LoadWorkflowActionResult,
    RuntimeActionResult,
    WorkflowLoadWarning,
    WorkflowSidecarData,
} from '../../../workflow-editor/workflowEditorUiTypes'

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

    isGraphEditingLocked: boolean
}

export interface CanvasLifecycleResult {
    dialogs: {
        isCreateCanvasDialogOpen: boolean
        draftCanvasId: string
        createCanvasErrorMessage: string
        handleDraftCanvasIdChange: (nextValue: string) => void
        setCreateCanvasErrorMessage: (value: string) => void
        openCreateCanvasDialog: () => void
        closeCreateCanvasDialog: () => void
        confirmCreateCanvas: () => void
    }
    actions: {
        requestCanvasChange: (nextCanvasId: string) => void
        handleRefreshWorkflowList: () => Promise<void>
        handleDeleteCurrentCanvas: () => Promise<void>
        handleSaveWorkflow: () => Promise<void>
        handleRevertToSaved: () => Promise<void>
    }
    status: {
        isActiveCanvasTemporary: boolean
        canDeleteCurrentCanvas: boolean
        workflowStatusMessage: string
        temporaryCanvasStatusMessage: string
    }
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

    isGraphEditingLocked,
}: UseCanvasLifecycleOptions): CanvasLifecycleResult {
    const lifecycleStatus = useCanvasLifecycleStatus({
        canvasList,
        activeCanvasId,
        temporaryCanvasId,
    })

    const { workflowStatusMessage, requestCanvasChange, markWorkflowAsLoaded } =
        useCanvasLoadSwitch({
            requestedCanvasId,
            setRequestedCanvasId,
            activeCanvasId,
            setActiveCanvasId,
            setActiveWorkflowContextId,
            setTemporaryCanvasId,
            clearPageError,
            setPageErrorMessage,
            setWorkflowWarnings,
            setIsSwitchingWorkflow,
            loadCurrentWorkflow,
            resetGraphSideEffectsForCommittedWorkflow,
            isGraphEditingLocked,
            confirmDiscardTemporaryCanvas:
                lifecycleStatus.confirmDiscardTemporaryCanvas,
        })

    const {
        isCreateCanvasDialogOpen,
        draftCanvasId,
        createCanvasErrorMessage,
        setCreateCanvasErrorMessage,
        openCreateCanvasDialog,
        closeCreateCanvasDialog,
        handleDraftCanvasIdChange,
        confirmCreateCanvas,
    } = useCanvasCreateDialog({
        isGraphEditingLocked,
        setPageErrorMessage,
        clearPageError,
        canvasList,
        activeCanvasId,
        requestedCanvasId,
        temporaryCanvasId,
        confirmDiscardTemporaryCanvas:
            lifecycleStatus.confirmDiscardTemporaryCanvas,
        setWorkflowWarnings,
        resetGraphSideEffectsForCommittedWorkflow,
        setTemporaryCanvasId,
        setRequestedCanvasId,
        setActiveCanvasId,
        setActiveWorkflowContextId,
        markWorkflowAsLoaded,
    })

    const { handleDeleteCurrentCanvas } = useCanvasDeleteAction({
        isGraphEditingLocked,
        setPageErrorMessage,
        canDeleteCurrentCanvas: lifecycleStatus.canDeleteCurrentCanvas,
        isActiveCanvasTemporary: lifecycleStatus.isActiveCanvasTemporary,
        activeCanvasId,
        isGraphDirty,
        formalCanvasIds: lifecycleStatus.formalCanvasIds,
        remainingFormalCanvasIds: lifecycleStatus.remainingFormalCanvasIds,
        clearPageError,
        setWorkflowWarnings,
        setRequestedCanvasId,
        handleDeleteCanvas,
        refreshWorkflowList,
    })

    const {
        handleRefreshWorkflowList,
        handleSaveWorkflow,
        handleRevertToSaved,
    } = useCanvasPersistenceActions({
        isGraphEditingLocked,
        setPageErrorMessage,
        clearPageError,
        setWorkflowWarnings,
        refreshWorkflowList,
        handleSave,
        activeCanvasId,
        nodes,
        edges,
        contextLinks,
        workflowSidecar,
        isActiveCanvasTemporary: lifecycleStatus.isActiveCanvasTemporary,
        setCommittedGraphPersistedVersion,
        graphPersistedVersion,
        setTemporaryCanvasId,
        loadCurrentWorkflow,
        resetGraphSideEffectsForCommittedWorkflow,
    })

    return {
        dialogs: {
            isCreateCanvasDialogOpen,
            draftCanvasId,
            createCanvasErrorMessage,
            handleDraftCanvasIdChange,
            setCreateCanvasErrorMessage,
            openCreateCanvasDialog,
            closeCreateCanvasDialog,
            confirmCreateCanvas,
        },
        actions: {
            requestCanvasChange,
            handleRefreshWorkflowList,
            handleDeleteCurrentCanvas,
            handleSaveWorkflow,
            handleRevertToSaved,
        },
        status: {
            isActiveCanvasTemporary: lifecycleStatus.isActiveCanvasTemporary,
            canDeleteCurrentCanvas: lifecycleStatus.canDeleteCurrentCanvas,
            workflowStatusMessage,
            temporaryCanvasStatusMessage:
                lifecycleStatus.temporaryCanvasStatusMessage,
        },
    }
}

