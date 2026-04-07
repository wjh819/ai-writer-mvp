import {
    getModelResources,
    getPrompts,
    listWorkflows,
} from '../../api'
import { getErrorMessage } from '../domain/workflowEditorRequests'
import type {
    FetchModelResourceListResult,
    FetchPromptListResult,
    FetchWorkflowBootstrapResult,
    FetchWorkflowListResult,
} from './operationResultHelpers'

export async function fetchPromptListResult(): Promise<FetchPromptListResult> {
    try {
        const prompts = await getPrompts()
        return { prompts }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Load prompts failed'),
            prompts: [],
        }
    }
}

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
    const [promptResult, modelResourceResult, workflowListResult] =
        await Promise.all([
            fetchPromptListResult(),
            fetchModelResourceListResult(),
            fetchWorkflowListResult(),
        ])

    return {
        prompts: promptResult.prompts,
        promptErrorMessage: promptResult.errorMessage ?? '',
        modelResources: modelResourceResult.modelResources,
        modelResourceErrorMessage: modelResourceResult.errorMessage ?? '',
        canvasList: workflowListResult.canvasList,
        canvasListErrorMessage: workflowListResult.errorMessage ?? '',
    }
}