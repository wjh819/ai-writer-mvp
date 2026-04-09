import type { LiveRunSnapshot, RunResult } from '../../run/runTypes'
import { extractPromptVariableHints } from '../domain/promptVariableHints'
import type {
    ExecutedNodeMap,
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import {
    buildDerivedTargetInputs,
    buildInboundBindings,
    buildNodeTestFields,
    buildPromptGraphWindowFacts,
} from './graphFactDerivers'
import { buildRuntimeFields } from './runtimeFieldDerivers'
import {
    buildLatestStepMap,
    findLastFailedStep,
    getActiveNodeId,
} from './runStepSelectors'

interface BuildDisplayNodesOptions {
    onRequestSubgraphTest?: (nodeId: string) => void
    runningSubgraphTestNodeId?: string | null
    liveRunSnapshot?: LiveRunSnapshot | null
}

/**
 * 从当前图状态与最近一次 full run 结果派生显示节点。
 *
 * 只负责：
 * - isExecuted / stepIndex
 * - runtimeInputs / runtimeOutput / runtimePublishedState
 * - derivedTargetInputs / inboundBindings / promptVariableHints
 * - graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds
 * - 节点本体最小测试入口字段
 *
 * 不负责：
 * - 改写保存态 config
 * - 派生运行时 window instance identity
 * - 持有节点测试结果 owner
 * - 生成节点卡片测试摘要
 */
export function buildDisplayNodes(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    executedNodeMap: ExecutedNodeMap,
    runResult: RunResult | null,
    liveRunSnapshot: LiveRunSnapshot | null,
    options?: BuildDisplayNodesOptions
): WorkflowEditorNode[] {
    const latestStepMap = buildLatestStepMap(liveRunSnapshot || runResult)
    const activeNodeId = getActiveNodeId(liveRunSnapshot)
    const lastFailedStep = findLastFailedStep(liveRunSnapshot || runResult)

    return (nodes || []).map(node => {
        const config = node.data.config
        const latestStep = latestStepMap[node.id]

        const derivedTargetInputs = buildDerivedTargetInputs(node.id, edges)
        const inboundBindings = buildInboundBindings(node.id, edges)
        const promptVariableHints =
            config.type === 'prompt'
                ? extractPromptVariableHints(config.promptText)
                : []

        const runtimeFields = buildRuntimeFields(node, latestStep)
        const nodeTestFields = buildNodeTestFields(node, options)

        const graphWindowFacts =
            config.type === 'prompt'
                ? buildPromptGraphWindowFacts({
                    nodeId: node.id,
                    contextLinks,
                })
                : {
                    graphWindowMode: undefined,
                    graphWindowSourceNodeId: undefined,
                    graphWindowTargetNodeIds: undefined,
                }

        const isNodeExecuted = Object.prototype.hasOwnProperty.call(
            executedNodeMap,
            node.id
        )

        const isRunActive =
            activeNodeId === node.id && liveRunSnapshot?.status === 'running'
        const isRunFailed =
            liveRunSnapshot?.status === 'failed' &&
            lastFailedStep?.node === node.id

        const liveStatus =
            isRunActive
                ? 'running'
                : isRunFailed
                    ? 'failed'
                    : isNodeExecuted
                        ? 'success'
                        : 'idle'

        const isNodeInteractionLocked = liveRunSnapshot?.status === 'running'

        return {
            ...node,
            data: {
                ...node.data,
                isExecuted: isNodeExecuted,
                stepIndex: executedNodeMap[node.id],
                runtimeInputs: runtimeFields.runtimeInputs,
                runtimeOutput: runtimeFields.runtimeOutput,
                runtimePublishedState: runtimeFields.runtimePublishedState,
                derivedTargetInputs,
                inboundBindings,
                promptVariableHints,
                graphWindowMode: graphWindowFacts.graphWindowMode,
                graphWindowSourceNodeId: graphWindowFacts.graphWindowSourceNodeId,
                graphWindowTargetNodeIds: graphWindowFacts.graphWindowTargetNodeIds,
                onRequestSubgraphTest: nodeTestFields.onRequestSubgraphTest,
                isSubgraphTestRunning: nodeTestFields.isSubgraphTestRunning,
                isRunActive,
                isRunRunning: isRunActive,
                isRunFailed,
                liveStatus,
                isNodeInteractionLocked,
                liveErrorMessage:
                    isRunFailed && lastFailedStep && 'error_message' in lastFailedStep
                        ? lastFailedStep.error_message
                        : undefined,
            },
        }
    })
}