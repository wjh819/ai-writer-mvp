import { loadWorkflow } from '../../api'
import {
    buildReactFlowEdges,
    buildReactFlowNodes,
    buildWorkflowContextLinks,
} from '../domain/workflowEditorMappers'
import { getErrorMessage } from '../domain/workflowEditorRequests'
import {
    EMPTY_WORKFLOW_SIDECAR,
    type FetchWorkflowDetailResult,
} from './operationResultHelpers'

export async function fetchWorkflowDetailResult(
    canvasId: string
): Promise<FetchWorkflowDetailResult> {
    try {
        const response = await loadWorkflow(canvasId)
        const workflow = response.workflow

        return {
            nodes: buildReactFlowNodes(workflow),
            edges: buildReactFlowEdges(workflow),
            contextLinks: buildWorkflowContextLinks(workflow),
            sidecar: response.sidecar,
            warnings: response.warnings,
        }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, `Load workflow failed: ${canvasId}`),
            nodes: [],
            edges: [],
            contextLinks: [],
            sidecar: EMPTY_WORKFLOW_SIDECAR,
            warnings: [],
        }
    }
}