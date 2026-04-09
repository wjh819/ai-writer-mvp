import {
    applyUpdatedNodeInGraph,
    deleteNodeInGraph,
} from '../domain/workflowEditorGraph'
import { createNodeByType } from '../domain/workflowEditorNodeFactory'
import { isSameSemanticNodeConfig } from '../domain/workflowEditorSemantic'
import {
    validateContextLinkReferences,
    validateEdgeReferences,
    validateNodeOutputRules,
} from '../domain/workflowEditorValidationRules'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink, WorkflowNodeType } from '../workflowEditorTypes'
import type { GraphActionResult, NodesActionResult } from './actionTypes'

export function buildAddNodeResult(
    nodes: WorkflowEditorNode[],
    type: WorkflowNodeType
): NodesActionResult {
    const newNode = createNodeByType(nodes || [], type)

    return {
        nextNodes: [...(nodes || []), newNode],
        selectedNodeId: newNode.id,
        didChangeSemanticGraph: true,
    }
}

export function buildUpdateNodeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    updatedNode: WorkflowEditorNode
): GraphActionResult | { error: string } {
    const nextNodeId = String(updatedNode?.id || '').trim()
    if (!nextNodeId) {
        return { error: 'Node id is required' }
    }

    const previousNode = (nodes || []).find(node => node.id === nextNodeId)
    if (!previousNode) {
        return {
            error: `Node '${nextNodeId}' not found. Node id is immutable and cannot be changed.`,
        }
    }

    const previousConfig = previousNode.data?.config
    const nextConfig = updatedNode.data.config

    if (previousConfig && previousConfig.type !== nextConfig.type) {
        return {
            error: `Node '${nextNodeId}' type cannot be changed from '${previousConfig.type}' to '${nextConfig.type}'`,
        }
    }

    const nextNode: WorkflowEditorNode = {
        ...updatedNode,
        id: nextNodeId,
        type: 'workflowNode',
    }

    const graphResult = applyUpdatedNodeInGraph(
        nodes || [],
        edges || [],
        contextLinks || [],
        nextNode
    )

    if (graphResult.rejectReason) {
        return { error: graphResult.rejectReason }
    }

    const outputRuleError = validateNodeOutputRules(graphResult.nextNodes)
    if (outputRuleError) {
        return { error: `Node '${updatedNode.id}': ${outputRuleError}` }
    }

    const edgeReferenceError = validateEdgeReferences(
        graphResult.nextNodes,
        graphResult.nextEdges
    )
    if (edgeReferenceError) {
        return { error: `Node '${updatedNode.id}': ${edgeReferenceError}` }
    }

    const contextLinkError = validateContextLinkReferences(
        graphResult.nextNodes,
        graphResult.nextEdges,
        graphResult.nextContextLinks
    )
    if (contextLinkError) {
        return { error: `Node '${updatedNode.id}': ${contextLinkError}` }
    }

    const didChangeSemanticGraph = previousConfig
        ? !isSameSemanticNodeConfig(previousConfig, nextConfig)
        : true

    return {
        nextNodes: graphResult.nextNodes,
        nextEdges: graphResult.nextEdges,
        nextContextLinks: graphResult.nextContextLinks,
        selectedNodeId: nextNode.id,
        didChangeSemanticGraph,
    }
}

export function buildDeleteNodeResult(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    nodeId: string,
    selectedNodeId: string | null
): GraphActionResult {
    const { nextNodes, nextEdges, nextContextLinks } = deleteNodeInGraph(
        nodes || [],
        edges || [],
        contextLinks || [],
        nodeId
    )

    return {
        nextNodes,
        nextEdges,
        nextContextLinks,
        selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
        selectedContextLinkId: null,
        didChangeSemanticGraph: true,
    }
}