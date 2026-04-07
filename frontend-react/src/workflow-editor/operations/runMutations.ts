import { runDraftWorkflow, runSubgraphTestWorkflow } from '../../api'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import { buildEditorPayload } from '../domain/workflowEditorMappers'
import { getErrorMessage } from '../domain/workflowEditorRequests'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    RunWorkflowResult,
    SubgraphTestWorkflowResult,
} from './operationResultHelpers'

export async function runDraftWorkflowResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    runInputs: WorkflowState,
    canvasId: string
): Promise<RunWorkflowResult> {
    /**
     * 前端 direct run 请求编排入口。
     *
     * 正式口径：
     * - 将当前编辑态 nodes / edges / contextLinks 收敛为 workflow payload
     * - 对 runInputs 做快照，避免后续本地编辑污染本次请求
     * - 当前 prompt_overrides 固定为空对象，保留为扩展位
     *
     * 不负责：
     * - display run 映射
     * - persisted run 写入
     */
    const inputStateSnapshot: WorkflowState = { ...(runInputs || {}) }
    const workflow = buildEditorPayload(nodes, edges, contextLinks)

    try {
        const runResult = await runDraftWorkflow(
            {
                workflow,
                input_state: inputStateSnapshot,
                prompt_overrides: {},
            },
            canvasId
        )

        return {
            runResult,
            successMessage:
                runResult.status === 'success'
                    ? 'Workflow executed successfully'
                    : undefined,
        }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Run failed'),
        }
    }
}

export async function runSubgraphTestResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    startNodeId: string,
    subgraphTestState: WorkflowState,
    canvasId: string,
    endNodeIds?: string[]
): Promise<SubgraphTestWorkflowResult> {
    /**
     * 前端 subgraph test 请求编排入口。
     *
     * 正式口径：
     * - 将当前编辑态 nodes / edges / contextLinks 收敛为 workflow payload
     * - 由 startNodeId 指定子图测试起点
     * - endNodeIds 为空时，后端按“到所有可达下游”执行
     * - 对 subgraphTestState / endNodeIds 做快照，避免后续本地编辑污染本次请求
     * - 当前 prompt_overrides 固定为空对象，保留为扩展位
     *
     * 不负责：
     * - 页面级 reusable test state 更新
     * - display run 映射
     * - pinnedPromptContext / cached result 资产语义
     *
     * 注意：
     * - 后端 transport 字段名仍是 test_state，这里只在前端变量命名上收口
     */
    const workflow = buildEditorPayload(nodes, edges, contextLinks)
    const subgraphTestStateSnapshot: WorkflowState = {
        ...(subgraphTestState || {}),
    }
    const endNodeIdsSnapshot = Array.isArray(endNodeIds)
        ? [...endNodeIds]
        : undefined

    try {
        const subgraphTestResult = await runSubgraphTestWorkflow(
            {
                workflow,
                start_node_id: startNodeId,
                end_node_ids: endNodeIdsSnapshot,
                test_state: subgraphTestStateSnapshot,
                prompt_overrides: {},
            },
            canvasId
        )

        return {
            subgraphTestResult,
            successMessage:
                subgraphTestResult.status === 'success'
                    ? `Subgraph test succeeded: ${startNodeId}`
                    : undefined,
        }
    } catch (error) {
        return {
            errorMessage: getErrorMessage(error, 'Subgraph test failed'),
        }
    }
}