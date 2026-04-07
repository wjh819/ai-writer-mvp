import type { SaveWorkflowOptions } from '../../api'
import { deleteWorkflow, saveWorkflow } from '../../api'
import { buildEditorPayload } from '../domain/workflowEditorMappers'
import { getErrorMessage } from '../domain/workflowEditorRequests'
import { validateWorkflowBeforeSave } from '../domain/workflowEditorValidators'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    DeleteWorkflowResult,
    SaveWorkflowResult,
} from './operationResultHelpers'
import type { WorkflowSidecarData } from '../workflowEditorUiTypes'

export async function saveWorkflowResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    sidecar: WorkflowSidecarData,
    canvasId: string,
    options: SaveWorkflowOptions = {}
): Promise<SaveWorkflowResult> {
    /**
     * 前端保存请求编排入口。
     *
     * 正式口径：
     * - 先做前端轻量预检
     * - 再构建 workflow payload 与 sidecar envelope 并请求后端保存
     *
     * 注意：
     * - validateWorkflowBeforeSave 只是 UX 预检，不替代后端 normalize + validator
     * - sidecar 只承载 node assets，不是第二套 workflow contract
     */
    const validationMessage = validateWorkflowBeforeSave(
        nodes,
        edges,
        contextLinks
    )
    if (validationMessage) {
        return { errorMessage: validationMessage }
    }

    try {
        const workflow = buildEditorPayload(nodes, edges, contextLinks)
        await saveWorkflow(
            {
                workflow,
                sidecar,
            },
            canvasId,
            options
        )

        return {
            successMessage: 'Workflow saved',
        }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Save failed'),
        }
    }
}

export async function deleteWorkflowResult(
    canvasId: string
): Promise<DeleteWorkflowResult> {
    try {
        await deleteWorkflow(canvasId)

        return {
            successMessage: 'Canvas deleted',
        }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Delete canvas failed'),
        }
    }
}