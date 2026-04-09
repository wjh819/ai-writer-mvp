import { useCallback, useState } from 'react'

import type { SaveWorkflowOptions } from '../../api'
import type {
    LiveRunSnapshot,
    LiveRunStartResponse,
    RunResult,
} from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import {
    deleteWorkflowResult,
    fetchActiveLiveRunResult,
    fetchWorkflowDetailResult,
    runDraftWorkflowResult,
    saveWorkflowResult,
    startLiveRunResult,
} from '../operations/workflowEditorOperations'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    LoadWorkflowActionResult,
    RuntimeActionResult,
    WorkflowSidecarData,
} from '../workflowEditorUiTypes'

export interface StartLiveRunActionResult extends RuntimeActionResult {
    liveRunStart?: LiveRunStartResponse
}

export interface FetchActiveLiveRunActionResult extends RuntimeActionResult {
    liveRunSnapshot?: LiveRunSnapshot
}

export interface RunWorkflowActionResult extends RuntimeActionResult {
    runResult?: RunResult
}

export function useWorkflowPersistence() {
    const [isSaving, setIsSaving] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false)

    const loadCurrentWorkflow = useCallback(
        async (canvasId: string): Promise<LoadWorkflowActionResult> => {
            setIsLoadingWorkflow(true)

            try {
                const result = await fetchWorkflowDetailResult(canvasId)

                return {
                    nodes: result.nodes,
                    edges: result.edges,
                    contextLinks: result.contextLinks,
                    sidecar: result.sidecar,
                    warnings: result.warnings,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setIsLoadingWorkflow(false)
            }
        },
        []
    )

    const handleSave = useCallback(
        async (
            canvasId: string,
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            sidecar: WorkflowSidecarData,
            options: SaveWorkflowOptions = {}
        ): Promise<RuntimeActionResult> => {
            setIsSaving(true)

            try {
                const result = await saveWorkflowResult(
                    nodes,
                    edges,
                    contextLinks,
                    sidecar,
                    canvasId,
                    options
                )

                return {
                    successMessage: result.successMessage,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setIsSaving(false)
            }
        },
        []
    )

    const handleRun = useCallback(
        async (
            canvasId: string,
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            nextRunInputs: WorkflowState
        ): Promise<RunWorkflowActionResult> => {
            setIsRunning(true)

            try {
                const result = await runDraftWorkflowResult(
                    nodes,
                    edges,
                    contextLinks,
                    nextRunInputs,
                    canvasId
                )

                return {
                    runResult: result.runResult,
                    successMessage: result.successMessage,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setIsRunning(false)
            }
        },
        []
    )

    const handleDeleteCanvas = useCallback(
        async (canvasId: string): Promise<RuntimeActionResult> => {
            setIsDeleting(true)

            try {
                const result = await deleteWorkflowResult(canvasId)

                return {
                    successMessage: result.successMessage,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setIsDeleting(false)
            }
        },
        []
    )

    const handleStartLiveRun = useCallback(
        async (
            canvasId: string,
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            nextRunInputs: WorkflowState
        ): Promise<StartLiveRunActionResult> => {
            setIsRunning(true)

            try {
                const result = await startLiveRunResult(
                    nodes,
                    edges,
                    contextLinks,
                    nextRunInputs,
                    canvasId
                )

                return {
                    liveRunStart: result.liveRunStart,
                    successMessage: result.successMessage,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setIsRunning(false)
            }
        },
        []
    )

    const handleFetchActiveLiveRun = useCallback(
        async (): Promise<FetchActiveLiveRunActionResult> => {
            const result = await fetchActiveLiveRunResult()

            return {
                liveRunSnapshot: result.liveRunSnapshot,
                errorMessage: result.errorMessage,
            }
        },
        []
    )
    return {
        isSaving,
        isRunning,
        isDeleting,
        isLoadingWorkflow,
        loadCurrentWorkflow,
        handleSave,
        handleRun,
        handleDeleteCanvas,
        handleStartLiveRun,
        handleFetchActiveLiveRun,
    }
}