import { useCallback, useEffect, useState } from 'react'

import { getModelResources } from '../../api'
import type { ModelResourceListItem } from '../../model-resources/modelResourceTypes'
import {
    fetchWorkflowBootstrapResult,
    fetchWorkflowListResult,
} from '../operations/workflowEditorOperations'
import type { RuntimeActionResult } from '../workflowEditorUiTypes'

export interface CanvasSummary {
    canvas_id: string
    label: string
}

export function useWorkflowBootstrap() {
    const [canvasList, setCanvasList] = useState<CanvasSummary[]>([])
    const [prompts, setPrompts] = useState<string[]>([])
    const [modelResources, setModelResources] = useState<ModelResourceListItem[]>(
        []
    )
    const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState('')

    const refreshWorkflowList = useCallback(
        async (): Promise<RuntimeActionResult> => {
            const result = await fetchWorkflowListResult()
            setCanvasList(result.canvasList ?? [])

            return {
                errorMessage: result.errorMessage,
            }
        },
        []
    )

    const refreshModelResources = useCallback(
        async (): Promise<RuntimeActionResult> => {
            try {
                const nextResources = await getModelResources()
                setModelResources(nextResources)

                return {}
            } catch (error) {
                return {
                    errorMessage:
                        error instanceof Error
                            ? error.message
                            : 'Failed to refresh model resources',
                }
            }
        },
        []
    )

    useEffect(() => {
        let cancelled = false

        async function loadBootstrapData() {
            const result = await fetchWorkflowBootstrapResult()

            if (cancelled) {
                return
            }

            setPrompts(result.prompts)
            setModelResources(result.modelResources)
            setCanvasList(result.canvasList)

            const bootstrapErrors = [
                result.promptErrorMessage,
                result.modelResourceErrorMessage,
                result.canvasListErrorMessage,
            ].filter(Boolean)

            setBootstrapErrorMessage(bootstrapErrors.join('\n'))
        }

        void loadBootstrapData()

        return () => {
            cancelled = true
        }
    }, [])

    return {
        canvasList,
        prompts,
        modelResources,
        bootstrapErrorMessage,
        refreshWorkflowList,
        refreshModelResources,
    }
}