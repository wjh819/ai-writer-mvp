import type { Connection } from 'reactflow'
import { addEdge } from 'reactflow'

import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { CREATE_BINDING_HANDLE_ID } from '../workflowEditorGraphTypes'
import { hasExecutionPath } from './workflowEditorExecutionGraph'
import { validateOutputFormat } from './workflowEditorValidationRules'
import {
    buildTempEdgeId,
    findNodeById,
    hasOutputName,
    isInputNode,
    trim,
} from './graphHelpers'

/**
 * 处理前端 data edge 连接请求。
 *
 * 输入：
 * - 当前 nodes / edges / contextLinks
 * - ReactFlow Connection 参数
 *
 * 输出：
 * - nextNodes / nextEdges / nextContextLinks
 * - addedEdge：本次新建的 edge；若被拒绝则为 null
 * - rejectReason：用户可展示的拒绝原因
 *
 * 正式口径：
 * - 这里只做前端即时拒绝与局部 graph 同步
 * - data edge 只表达结构化输入绑定
 * - contextLinks 不参与 targetInput 绑定，但参与执行环预检查
 *
 * 不负责：
 * - 正式保存态合法性裁决
 * - 后端 normalize
 * - 自动修正非法 sourceOutput / targetInput
 *
 * 当前限制：
 * - cycle 只做前端轻量预阻断，最终以后端 validator 为准
 * - 依赖 validateOutputFormat 与当前节点 outputs 现状，不处理更深层 contract 漂移
 */
export function connectEdgeWithNodeSync(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    params: Connection
) {
    const sourceId = trim(params.source)
    const targetId = trim(params.target)
    const sourceOutput = trim(params.sourceHandle)
    const targetInput = trim(params.targetHandle)

    if (!sourceId || !targetId) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: 'Edge source/target cannot be empty',
        }
    }

    if (sourceId === targetId) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: 'Self-loop is not allowed',
        }
    }

    const sourceNode = findNodeById(nodes || [], sourceId)
    if (!sourceNode) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Edge source node not found: ${sourceId}`,
        }
    }

    const targetNode = findNodeById(nodes || [], targetId)
    if (!targetNode) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Edge target node not found: ${targetId}`,
        }
    }

    if (isInputNode(targetNode)) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Input node '${targetId}' cannot accept inbound bindings`,
        }
    }

    if (!sourceOutput || !targetInput) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: 'Edge binding requires both source output and target input',
        }
    }

    if (targetInput === CREATE_BINDING_HANDLE_ID) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason:
                'Create-binding handle cannot be used as a saved target input',
        }
    }

    const sourceOutputError = validateOutputFormat(sourceOutput)
    if (sourceOutputError) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Source output invalid: ${sourceOutputError}`,
        }
    }

    const targetInputError = validateOutputFormat(targetInput)
    if (targetInputError) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Target input invalid: ${targetInputError}`,
        }
    }

    if (!hasOutputName(sourceNode, sourceOutput)) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Edge sourceOutput '${sourceOutput}' not found on node '${sourceId}'`,
        }
    }

    const alreadyExists = (edges || []).some(
        edge =>
            edge.source === sourceId &&
            edge.target === targetId &&
            trim(edge.sourceOutput) === sourceOutput &&
            trim(edge.targetInput) === targetInput
    )

    if (alreadyExists) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: 'This binding edge already exists',
        }
    }

    const targetInputOccupied = (edges || []).some(
        edge => edge.target === targetId && trim(edge.targetInput) === targetInput
    )

    if (targetInputOccupied) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: `Target input '${targetInput}' is already bound on node '${targetId}'`,
        }
    }

    const wouldCreateCycle = hasExecutionPath({
        startNodeId: targetId,
        targetNodeId: sourceId,
        nodes: nodes || [],
        edges: edges || [],
        contextLinks: contextLinks || [],
    })

    if (wouldCreateCycle) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedEdge: null,
            rejectReason: 'This binding edge would create an execution cycle',
        }
    }

    const nextEdge: WorkflowEditorEdge = {
        id: buildTempEdgeId(),
        source: sourceId,
        target: targetId,
        relationType: 'data',
        sourceHandle: sourceOutput,
        targetHandle: targetInput,
        sourceOutput,
        targetInput,
    }

    const nextEdges = addEdge(nextEdge, edges || []) as WorkflowEditorEdge[]

    return {
        nextNodes: nodes || [],
        nextEdges,
        nextContextLinks: contextLinks || [],
        addedEdge: nextEdge,
        rejectReason: undefined,
    }
}