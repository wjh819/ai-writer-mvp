import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { hasExecutionPath } from './workflowEditorExecutionGraph'
import { validateContextSourceOutboundRules } from './workflowEditorValidationRules'
import {
    buildTempContextLinkId,
    findNodeById,
    getPromptModelResourceId,
    isPromptNode,
    trim,
} from './graphHelpers'

/**
 * 处理前端 context link 连接请求。
 *
 * 正式规则：
 * - context link 只允许 prompt -> prompt
 * - target 只允许一个 inbound context link
 * - source / target 若都已选择 modelResourceId，则要求一致
 * - contextLinks 参与执行环预检查
 *
 * 不负责：
 * - new_window 推导（这是运行时/展示语义）
 * - 持久化 id 生成规范
 * - 更深层 dependency 检查
 *
 * 当前限制：
 * - outbound source 规则当前只校验 continue 数量，不表达更完整的 topology 目标
 */
export function connectContextLinkWithGraphSync(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    params: {
        source: string
        target: string
        mode: 'continue' | 'branch'
        id?: string
    }
) {
    const sourceId = trim(params.source)
    const targetId = trim(params.target)
    const mode = params.mode
    const contextLinkId = trim(params.id) || buildTempContextLinkId()

    if (!sourceId || !targetId) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: 'Context link source/target cannot be empty',
        }
    }

    if (sourceId === targetId) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: 'Context link self-loop is not allowed',
        }
    }

    const sourceNode = findNodeById(nodes || [], sourceId)
    const targetNode = findNodeById(nodes || [], targetId)

    if (!sourceNode) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Context link source node not found: ${sourceId}`,
        }
    }

    if (!targetNode) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Context link target node not found: ${targetId}`,
        }
    }

    if (!isPromptNode(sourceNode)) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Context link source '${sourceId}' must be a prompt node`,
        }
    }

    if (!isPromptNode(targetNode)) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Context link target '${targetId}' must be a prompt node`,
        }
    }

    if (mode !== 'continue' && mode !== 'branch') {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Invalid context link mode: ${String(mode)}`,
        }
    }

    const duplicateId = (contextLinks || []).some(
        link => trim(link.id) === contextLinkId
    )
    if (duplicateId) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Duplicate context link id: ${contextLinkId}`,
        }
    }

    const duplicatePair = (contextLinks || []).some(
        link => trim(link.source) === sourceId && trim(link.target) === targetId
    )
    if (duplicatePair) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: 'This context link already exists',
        }
    }

    const targetAlreadyHasInbound = (contextLinks || []).some(
        link => trim(link.target) === targetId
    )
    if (targetAlreadyHasInbound) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: `Prompt node '${targetId}' already has an inbound context link`,
        }
    }

    const sourceModelResourceId = getPromptModelResourceId(sourceNode)
    const targetModelResourceId = getPromptModelResourceId(targetNode)
    if (
        sourceModelResourceId &&
        targetModelResourceId &&
        sourceModelResourceId !== targetModelResourceId
    ) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason:
                'Context-linked prompt nodes must use the same model resource',
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
            addedContextLink: null,
            rejectReason: 'This context link would create an execution cycle',
        }
    }

    const nextContextLink: WorkflowContextLink = {
        id: contextLinkId,
        source: sourceId,
        target: targetId,
        mode,
    }

    const nextContextLinks = [...(contextLinks || []), nextContextLink]

    const sourceOutboundRuleError =
        validateContextSourceOutboundRules(nextContextLinks)
    if (sourceOutboundRuleError) {
        return {
            nextNodes: nodes || [],
            nextEdges: edges || [],
            nextContextLinks: contextLinks || [],
            addedContextLink: null,
            rejectReason: sourceOutboundRuleError,
        }
    }

    return {
        nextNodes: nodes || [],
        nextEdges: edges || [],
        nextContextLinks,
        addedContextLink: nextContextLink,
        rejectReason: undefined,
    }
}

/**
 * 校验 context-linked prompt 节点的局部 modelResourceId 一致性。
 *
 * 注意：
 * - 这里只检查 context-linked prompt 的局部 modelResourceId 一致性
 * - 不替代全图 context 合法性裁决
 */
export function validatePromptContextModelConsistency(
    nodes: WorkflowEditorNode[],
    contextLinks: WorkflowContextLink[],
    updatedNode: WorkflowEditorNode
): string | undefined {
    if (!isPromptNode(updatedNode)) {
        return undefined
    }

    const nextNodeMap = new Map<string, WorkflowEditorNode>(
        (nodes || []).map(node => [node.id, node])
    )

    const updatedNodeId = trim(updatedNode.id)

    for (const link of contextLinks || []) {
        const sourceId = trim(link.source)
        const targetId = trim(link.target)

        if (sourceId !== updatedNodeId && targetId !== updatedNodeId) {
            continue
        }

        const sourceNode =
            sourceId === updatedNodeId ? updatedNode : nextNodeMap.get(sourceId)
        const targetNode =
            targetId === updatedNodeId ? updatedNode : nextNodeMap.get(targetId)

        if (!isPromptNode(sourceNode) || !isPromptNode(targetNode)) {
            return 'Context-linked node must remain prompt type'
        }

        const sourceModel = getPromptModelResourceId(sourceNode)
        const targetModel = getPromptModelResourceId(targetNode)

        if (sourceModel && targetModel && sourceModel !== targetModel) {
            return 'Context-linked prompt nodes must use the same model resource'
        }
    }

    return undefined
}