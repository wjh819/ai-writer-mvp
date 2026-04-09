import {
    getModelResources,
    listWorkflows,
} from '../../api'
import { getErrorMessage } from '../domain/workflowEditorRequests'
import type {
    FetchModelResourceListResult,
    FetchWorkflowBootstrapResult,
    FetchWorkflowListResult,
} from './operationResultHelpers'

export async function fetchModelResourceListResult(): Promise<FetchModelResourceListResult> {
    try {
        const modelResources = await getModelResources()
        return { modelResources }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Load model resources failed'),
            modelResources: [],
        }
    }
}

export async function fetchWorkflowListResult(): Promise<FetchWorkflowListResult> {
    try {
        const canvasList = await listWorkflows()
        return { canvasList }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Load canvas list failed'),
            canvasList: [],
        }
    }
}

export async function fetchWorkflowBootstrapResult(): Promise<FetchWorkflowBootstrapResult> {
    const [modelResourceResult, workflowListResult] =
        await Promise.all([
            fetchModelResourceListResult(),
            fetchWorkflowListResult(),
        ])

    return {
        modelResources: modelResourceResult.modelResources,
        modelResourceErrorMessage: modelResourceResult.errorMessage ?? '',
        canvasList: workflowListResult.canvasList,
        canvasListErrorMessage: workflowListResult.errorMessage ?? '',
    }
}