import { useCallback, useMemo, useState } from 'react'

import type { RunResult } from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type { WorkflowRunContext } from '../../workflow-editor/workflowEditorUiTypes'
import { buildDisplayRunFromDirectRun } from '../run/runDisplayMappers'

interface RunWorkflowActionResult {
    runResult?: RunResult
    successMessage?: string
    errorMessage?: string
}

interface UseWorkflowRunContextOptions {
    activeCanvasId: string
    activeWorkflowContextId: number
    graphSemanticVersion: number
    clearPageError: () => void
    handleRun: (
        canvasId: string,
        nodes: WorkflowEditorNode[],
        edges: WorkflowEditorEdge[],
        contextLinks: WorkflowContextLink[],
        nextRunInputs: WorkflowState
    ) => Promise<RunWorkflowActionResult>
}

export function useWorkflowRunContext({
                                          activeCanvasId,
                                          activeWorkflowContextId,
                                          graphSemanticVersion,
                                          clearPageError,
                                          handleRun,
                                      }: UseWorkflowRunContextOptions) {
    const [runContext, setRunContext] = useState<WorkflowRunContext | null>(null)

    const clearRunState = useCallback(() => {
        setRunContext(null)
    }, [])

    const activeRunContext = useMemo(() => {
        if (!runContext) {
            return null
        }

        if (runContext.workflowContextId !== activeWorkflowContextId) {
            return null
        }

        return runContext
    }, [runContext, activeWorkflowContextId])

    const runResult = activeRunContext?.runResult || null

    const isRunResultStale = useMemo(() => {
        if (!activeRunContext) {
            return false
        }

        return activeRunContext.graphSemanticVersion !== graphSemanticVersion
    }, [activeRunContext, graphSemanticVersion])

    const displayRun = useMemo(() => {
        if (!runResult) {
            return null
        }

        return buildDisplayRunFromDirectRun(runResult, {
            isStale: isRunResultStale,
        })
    }, [runResult, isRunResultStale])

    const hasVisibleRunResult = Boolean(activeRunContext?.runResult)

    const runWorkflow = useCallback(
        async (
            nodes: WorkflowEditorNode[],
            edges: WorkflowEditorEdge[],
            contextLinks: WorkflowContextLink[],
            runInputs: WorkflowState
        ) => {
            const result = await handleRun(
                activeCanvasId,
                nodes,
                edges,
                contextLinks,
                runInputs
            )

            if (result.runResult) {
                clearPageError()
                setRunContext({
                    canvasId: activeCanvasId,
                    workflowContextId: activeWorkflowContextId,
                    graphSemanticVersion,
                    runResult: result.runResult,
                })
                return result
            }

            setRunContext(null)
            return result
        },
        [
            handleRun,
            activeCanvasId,
            activeWorkflowContextId,
            graphSemanticVersion,
            clearPageError,
        ]
    )

    return {
        runContext,
        clearRunState,
        activeRunContext,
        runResult,
        isRunResultStale,
        displayRun,
        hasVisibleRunResult,
        runWorkflow,
    }
}