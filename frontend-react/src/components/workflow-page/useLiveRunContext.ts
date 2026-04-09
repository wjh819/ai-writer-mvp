import { useCallback, useEffect, useRef, useState } from 'react'

import type {
    LiveRunSnapshot,
    LiveRunStartResponse,
    RunResult,
} from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'

const LIVE_RUN_POLL_INTERVAL_MS = 1000

interface LiveRunContext {
    canvasId: string
    workflowContextId: number
    graphSemanticVersion: number
    runId: string | null
    snapshot: LiveRunSnapshot | null
    isPolling: boolean
    lastPollErrorMessage?: string
}

export interface StartLiveRunActionResult {
    liveRunStart?: LiveRunStartResponse
    successMessage?: string
    errorMessage?: string
}

export interface FetchActiveLiveRunActionResult {
    liveRunSnapshot?: LiveRunSnapshot
    errorMessage?: string
}

export interface UseLiveRunContextOptions {
    activeCanvasId: string
    activeWorkflowContextId: number
    graphSemanticVersion: number

    clearPageError: () => void

    handleStartLiveRun: (
        canvasId: string,
        nodes: WorkflowEditorNode[],
        edges: WorkflowEditorEdge[],
        contextLinks: WorkflowContextLink[],
        nextRunInputs: WorkflowState
    ) => Promise<StartLiveRunActionResult>

    handleFetchActiveLiveRun: () => Promise<FetchActiveLiveRunActionResult>

    commitFinalRunResult: (runResult: RunResult) => void
}

export interface UseLiveRunContextResult {
    liveRunContext: LiveRunContext | null
    liveRunSnapshot: LiveRunSnapshot | null
    isLiveRunActive: boolean
    isGraphEditingLocked: boolean
    activeNodeId: string | null
    lastPollErrorMessage?: string
    clearLiveRunState: () => void
    startLiveRun: (
        nodes: WorkflowEditorNode[],
        edges: WorkflowEditorEdge[],
        contextLinks: WorkflowContextLink[],
        nextRunInputs: WorkflowState
    ) => Promise<StartLiveRunActionResult>
}

function isTerminalLiveRunStatus(
    status: LiveRunSnapshot['status']
): status is RunResult['status'] {
    return status === 'success' || status === 'failed'
}

function buildTerminalRunResultFromLiveSnapshot(
    snapshot: LiveRunSnapshot
): RunResult | null {
    if (!isTerminalLiveRunStatus(snapshot.status)) {
        return null
    }

    return {
        status: snapshot.status,
        run_scope: snapshot.run_scope,
        input_state: snapshot.input_state,
        final_state: snapshot.final_state,
        partial_state: snapshot.partial_state,
        steps: snapshot.steps,
        error_type: snapshot.error_type,
        error_message: snapshot.error_message,
        error_detail: snapshot.error_detail,
        failure_stage: snapshot.failure_stage,
    }
}

export function useLiveRunContext(
    options: UseLiveRunContextOptions
): UseLiveRunContextResult {
    const {
        activeCanvasId,
        activeWorkflowContextId,
        graphSemanticVersion,
        clearPageError,
        handleStartLiveRun,
        handleFetchActiveLiveRun,
        commitFinalRunResult,
    } = options

    const [liveRunContext, setLiveRunContext] = useState<LiveRunContext | null>(
        null
    )

    const pollTimerRef = useRef<number | null>(null)

    const stopPolling = useCallback(() => {
        if (pollTimerRef.current !== null) {
            window.clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
        }

        setLiveRunContext((prev) => {
            if (!prev) {
                return prev
            }
            return {
                ...prev,
                isPolling: false,
            }
        })
    }, [])

    const clearLiveRunState = useCallback(() => {
        stopPolling()
        setLiveRunContext(null)
    }, [stopPolling])

    const commitLiveSnapshot = useCallback(
        (snapshot: LiveRunSnapshot) => {
            setLiveRunContext((prev) => {
                const base: LiveRunContext =
                    prev ?? {
                        canvasId: activeCanvasId,
                        workflowContextId: activeWorkflowContextId,
                        graphSemanticVersion,
                        runId: snapshot.run_id,
                        snapshot: null,
                        isPolling: snapshot.status === 'running',
                    }

                return {
                    ...base,
                    runId: snapshot.run_id ?? base.runId,
                    snapshot,
                    isPolling: snapshot.status === 'running',
                    lastPollErrorMessage: undefined,
                }
            })
        },
        [activeCanvasId, activeWorkflowContextId, graphSemanticVersion]
    )

    const finalizeLiveRun = useCallback(
        (snapshot: LiveRunSnapshot) => {
            stopPolling()
            commitLiveSnapshot(snapshot)

            const terminalRunResult =
                buildTerminalRunResultFromLiveSnapshot(snapshot)

            if (terminalRunResult) {
                commitFinalRunResult(terminalRunResult)
            }
        },
        [stopPolling, commitLiveSnapshot, commitFinalRunResult]
    )

    const pollActiveLiveRun =
        useCallback(async (): Promise<FetchActiveLiveRunActionResult> => {
            const result = await handleFetchActiveLiveRun()

            if (result.errorMessage) {
                setLiveRunContext((prev) => {
                    if (!prev) {
                        return prev
                    }
                    return {
                        ...prev,
                        lastPollErrorMessage: result.errorMessage,
                    }
                })
                return result
            }

            const snapshot = result.liveRunSnapshot
            if (!snapshot) {
                return result
            }

            if (snapshot.canvas_id && snapshot.canvas_id !== activeCanvasId) {
                clearLiveRunState()
                return result
            }

            if (snapshot.status === 'idle') {
                clearLiveRunState()
                return result
            }

            if (isTerminalLiveRunStatus(snapshot.status)) {
                finalizeLiveRun(snapshot)
                return result
            }

            commitLiveSnapshot(snapshot)
            return result
        }, [
            handleFetchActiveLiveRun,
            activeCanvasId,
            clearLiveRunState,
            finalizeLiveRun,
            commitLiveSnapshot,
        ])

    const startPolling = useCallback(() => {
        stopPolling()

        pollTimerRef.current = window.setInterval(() => {
            void pollActiveLiveRun()
        }, LIVE_RUN_POLL_INTERVAL_MS)

        setLiveRunContext((prev) => {
            if (!prev) {
                return prev
            }
            return {
                ...prev,
                isPolling: true,
            }
        })
    }, [stopPolling, pollActiveLiveRun])

    const startLiveRun = useCallback(
        async (
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            nextRunInputs: WorkflowState
        ): Promise<StartLiveRunActionResult> => {
            clearPageError()
            stopPolling()

            const result = await handleStartLiveRun(
                activeCanvasId,
                nodes,
                edges,
                contextLinks,
                nextRunInputs
            )

            if (!result.liveRunStart || result.errorMessage) {
                return result
            }

            setLiveRunContext({
                canvasId: activeCanvasId,
                workflowContextId: activeWorkflowContextId,
                graphSemanticVersion,
                runId: result.liveRunStart.run_id,
                snapshot: null,
                isPolling: true,
            })

            const firstPollResult = await pollActiveLiveRun()
            const firstSnapshot = firstPollResult.liveRunSnapshot

            if (!firstSnapshot || firstSnapshot.status === 'running') {
                startPolling()
            }

            return result
        },
        [
            clearPageError,
            stopPolling,
            handleStartLiveRun,
            activeCanvasId,
            activeWorkflowContextId,
            graphSemanticVersion,
            pollActiveLiveRun,
            startPolling,
        ]
    )

    useEffect(() => {
        return () => {
            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        setLiveRunContext((prev) => {
            if (!prev) {
                return prev
            }

            const contextChanged =
                prev.canvasId !== activeCanvasId ||
                prev.workflowContextId !== activeWorkflowContextId

            if (!contextChanged) {
                return prev
            }

            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }

            return null
        })
    }, [activeCanvasId, activeWorkflowContextId])

    const liveRunSnapshot = liveRunContext?.snapshot ?? null
    const isLiveRunActive = Boolean(
        liveRunContext &&
        (!liveRunSnapshot || liveRunSnapshot.status === 'running')
    )

    return {
        liveRunContext,
        liveRunSnapshot,
        isLiveRunActive,
        isGraphEditingLocked: isLiveRunActive,
        activeNodeId: liveRunSnapshot?.active_node_id ?? null,
        lastPollErrorMessage: liveRunContext?.lastPollErrorMessage,
        clearLiveRunState,
        startLiveRun,
    }
}