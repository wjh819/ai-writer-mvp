import { useCallback, useState } from 'react'

import type { WorkflowState } from '../../shared/workflowSharedTypes'
import { buildNextRunInputs } from '../state/workflowEditorRunInputs'
import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'

export function useWorkflowRunInputs() {
    const [runInputs, setRunInputs] = useState<WorkflowState>({})
    const [previousInputNodes, setPreviousInputNodes] = useState<
        WorkflowEditorNode[]
    >([])

    const updateRunInput = useCallback((key: string, value: unknown) => {
        setRunInputs(prev => ({
            ...prev,
            [key]: value,
        }))
    }, [])

    const syncRunInputs = useCallback(
        (inputNodes: WorkflowEditorNode[]) => {
            setRunInputs(prev =>
                buildNextRunInputs(inputNodes, prev, previousInputNodes)
            )
            setPreviousInputNodes(inputNodes)
        },
        [previousInputNodes]
    )

    const resetRunInputContext = useCallback(() => {
        setRunInputs({})
        setPreviousInputNodes([])
    }, [])

    return {
        runInputs,
        updateRunInput,
        syncRunInputs,
        resetRunInputContext,
    }
}