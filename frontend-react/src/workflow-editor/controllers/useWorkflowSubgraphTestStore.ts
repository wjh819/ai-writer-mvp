import { useCallback, useState } from 'react'

import type { RunResult } from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import { runSubgraphTestResult } from '../operations/workflowEditorOperations'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type { RuntimeActionResult } from '../workflowEditorUiTypes'

interface SubgraphTestActionResult extends RuntimeActionResult {
    subgraphTestResult?: RunResult
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneWorkflowState(value: unknown): WorkflowState {
    return isPlainObject(value) ? { ...value } : {}
}

export function useWorkflowSubgraphTestStore() {
    const [subgraphTestState, setSubgraphTestState] = useState<WorkflowState>({})
    const [activeSubgraphTestResult, setActiveSubgraphTestResult] =
        useState<RunResult | null>(null)
    const [activeSubgraphTestStartNodeId, setActiveSubgraphTestStartNodeId] =
        useState<string | null>(null)
    const [subgraphTestResultsByNodeId, setSubgraphTestResultsByNodeId] =
        useState<Record<string, RunResult>>({})
    const [staleSubgraphTestResultIds, setStaleSubgraphTestResultIds] =
        useState<Record<string, true>>({})
    const [runningSubgraphTestNodeId, setRunningSubgraphTestNodeId] = useState<
        string | null
    >(null)
    const [
        lastSuccessfulSubgraphTestStartNodeId,
        setLastSuccessfulSubgraphTestStartNodeId,
    ] = useState<string | null>(null)

    const replaceActiveSubgraphTest = useCallback(
        (startNodeId: string | null, runResult: RunResult | null) => {
            setActiveSubgraphTestStartNodeId(startNodeId)
            setActiveSubgraphTestResult(runResult)
        },
        []
    )

    const markSubgraphTestResultStale = useCallback((nodeId: string) => {
        const normalizedNodeId = nodeId.trim()
        if (!normalizedNodeId) {
            return
        }

        setStaleSubgraphTestResultIds(previous => ({
            ...previous,
            [normalizedNodeId]: true,
        }))
    }, [])

    const clearSubgraphTestResultStale = useCallback((nodeId: string) => {
        const normalizedNodeId = nodeId.trim()
        if (!normalizedNodeId) {
            return
        }

        setStaleSubgraphTestResultIds(previous => {
            if (!previous[normalizedNodeId]) {
                return previous
            }

            const next = { ...previous }
            delete next[normalizedNodeId]
            return next
        })
    }, [])

    const handleRunSubgraphTest = useCallback(
        async (
            canvasId: string,
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            startNodeId: string,
            nextSubgraphTestState: WorkflowState,
            endNodeIds?: string[]
        ): Promise<SubgraphTestActionResult> => {
            const normalizedStartNodeId = startNodeId.trim()
            setRunningSubgraphTestNodeId(normalizedStartNodeId || null)

            try {
                const result = await runSubgraphTestResult(
                    nodes,
                    edges,
                    contextLinks,
                    normalizedStartNodeId,
                    nextSubgraphTestState,
                    canvasId,
                    endNodeIds
                )

                if (result.subgraphTestResult) {
                    const nextSubgraphTestResult = result.subgraphTestResult

                    replaceActiveSubgraphTest(
                        normalizedStartNodeId,
                        nextSubgraphTestResult
                    )

                    setSubgraphTestResultsByNodeId(previous => ({
                        ...previous,
                        [normalizedStartNodeId]: nextSubgraphTestResult,
                    }))
                    clearSubgraphTestResultStale(normalizedStartNodeId)

                    if (nextSubgraphTestResult.status === 'success') {
                        setSubgraphTestState(
                            cloneWorkflowState(nextSubgraphTestResult.final_state)
                        )
                        setLastSuccessfulSubgraphTestStartNodeId(normalizedStartNodeId)
                    } else if (nextSubgraphTestResult.partial_state) {
                        setSubgraphTestState(
                            cloneWorkflowState(nextSubgraphTestResult.partial_state)
                        )
                    }
                }

                return {
                    subgraphTestResult: result.subgraphTestResult,
                    successMessage: result.successMessage,
                    errorMessage: result.errorMessage,
                }
            } finally {
                setRunningSubgraphTestNodeId(null)
            }
        },
        [clearSubgraphTestResultStale, replaceActiveSubgraphTest]
    )

    const clearSubgraphTestResult = useCallback(
        (nodeId: string) => {
            const normalizedNodeId = nodeId.trim()
            if (!normalizedNodeId) {
                return
            }

            setSubgraphTestResultsByNodeId(previous => {
                if (!previous[normalizedNodeId]) {
                    return previous
                }

                const next = { ...previous }
                delete next[normalizedNodeId]
                return next
            })

            setStaleSubgraphTestResultIds(previous => {
                if (!previous[normalizedNodeId]) {
                    return previous
                }

                const next = { ...previous }
                delete next[normalizedNodeId]
                return next
            })

            if (activeSubgraphTestStartNodeId === normalizedNodeId) {
                replaceActiveSubgraphTest(null, null)
            }

            setLastSuccessfulSubgraphTestStartNodeId(previous =>
                previous === normalizedNodeId ? null : previous
            )
        },
        [activeSubgraphTestStartNodeId, replaceActiveSubgraphTest]
    )

    const pruneSubgraphTestArtifacts = useCallback(
        (validNodeIds: string[]) => {
            const validNodeIdSet = new Set(
                (validNodeIds || []).map(nodeId => nodeId.trim()).filter(Boolean)
            )

            setSubgraphTestResultsByNodeId(previous => {
                let changed = false
                const nextResults: Record<string, RunResult> = {}

                Object.entries(previous).forEach(([nodeId, result]) => {
                    if (!validNodeIdSet.has(nodeId)) {
                        changed = true
                        return
                    }

                    nextResults[nodeId] = result
                })

                return changed ? nextResults : previous
            })

            setStaleSubgraphTestResultIds(previous => {
                let changed = false
                const nextStaleIds: Record<string, true> = {}

                Object.keys(previous).forEach(nodeId => {
                    if (!validNodeIdSet.has(nodeId)) {
                        changed = true
                        return
                    }

                    nextStaleIds[nodeId] = true
                })

                return changed ? nextStaleIds : previous
            })

            if (
                activeSubgraphTestStartNodeId &&
                !validNodeIdSet.has(activeSubgraphTestStartNodeId)
            ) {
                replaceActiveSubgraphTest(null, null)
            }

            setLastSuccessfulSubgraphTestStartNodeId(previous =>
                previous && !validNodeIdSet.has(previous) ? null : previous
            )
            setRunningSubgraphTestNodeId(previous =>
                previous && !validNodeIdSet.has(previous) ? null : previous
            )
        },
        [activeSubgraphTestStartNodeId, replaceActiveSubgraphTest]
    )

    const resetSubgraphTestState = useCallback(() => {
        setSubgraphTestState({})
        setRunningSubgraphTestNodeId(null)
        setLastSuccessfulSubgraphTestStartNodeId(null)
    }, [])

    const resetSubgraphTestContext = useCallback(() => {
        setSubgraphTestState({})
        replaceActiveSubgraphTest(null, null)
        setSubgraphTestResultsByNodeId({})
        setStaleSubgraphTestResultIds({})
        setRunningSubgraphTestNodeId(null)
        setLastSuccessfulSubgraphTestStartNodeId(null)
    }, [replaceActiveSubgraphTest])

    return {
        subgraphTestState,
        activeSubgraphTestResult,
        activeSubgraphTestStartNodeId,
        subgraphTestResultsByNodeId,
        staleSubgraphTestResultIds,
        runningSubgraphTestNodeId,
        lastSuccessfulSubgraphTestStartNodeId,

        markSubgraphTestResultStale,
        clearSubgraphTestResultStale,
        handleRunSubgraphTest,
        clearSubgraphTestResult,
        pruneSubgraphTestArtifacts,
        resetSubgraphTestState,
        resetSubgraphTestContext,
    }
}