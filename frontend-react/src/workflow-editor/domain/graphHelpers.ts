import type { NodeOutputSpec } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'

/**
 * 构建本地 data edge 临时 id。
 *
 * 注意：
 * - 仅服务本地编辑期 identity
 * - save 后不保证保留该值
 * - 不应用作稳定业务 identity
 */
export function buildTempEdgeId(): string {
    return `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 构建本地 context link 临时 id。
 *
 * 注意：
 * - 仅服务本地编辑期 identity
 * - save 后不保证保留该值
 * - 不应用作稳定业务 identity
 */
export function buildTempContextLinkId(): string {
    return `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }
    return String(value).trim()
}

export function getNodeOutputs(
    node: WorkflowEditorNode | undefined
): NodeOutputSpec[] {
    const config = node?.data?.config
    return Array.isArray(config?.outputs) ? config.outputs : []
}

export function findNodeById(
    nodes: WorkflowEditorNode[],
    nodeId: string
): WorkflowEditorNode | undefined {
    return (nodes || []).find(node => node.id === nodeId)
}

export function hasOutputName(
    node: WorkflowEditorNode | undefined,
    outputName: string
): boolean {
    const normalizedOutputName = trim(outputName)
    return getNodeOutputs(node).some(
        output => trim(output.name) === normalizedOutputName
    )
}

export function getNodeType(node: WorkflowEditorNode | undefined): string {
    return trim(node?.data?.config?.type)
}

export function isInputNode(node: WorkflowEditorNode | undefined): boolean {
    return getNodeType(node) === 'input'
}

export function isPromptNode(node: WorkflowEditorNode | undefined): boolean {
    return getNodeType(node) === 'prompt'
}

export function getPromptModelResourceId(
    node: WorkflowEditorNode | undefined
): string {
    const config = node?.data?.config
    if (!config || config.type !== 'prompt') {
        return ''
    }
    return trim(config.modelResourceId)
}

export function isOutputReferenced(
    edges: WorkflowEditorEdge[],
    nodeId: string,
    outputName: string
): boolean {
    const normalizedOutputName = trim(outputName)

    if (!normalizedOutputName) {
        return false
    }

    return (edges || []).some(
        edge =>
            edge.source === nodeId &&
            trim(edge.sourceOutput) === normalizedOutputName
    )
}

export function syncOutboundEdgesForOutputRename(
    edges: WorkflowEditorEdge[],
    nodeId: string,
    renameMap: Record<string, string>
): WorkflowEditorEdge[] {
    return (edges || []).map(edge => {
        if (edge.source !== nodeId) {
            return edge
        }

        const nextSourceOutput = renameMap[trim(edge.sourceOutput)]
        if (!nextSourceOutput || nextSourceOutput === edge.sourceOutput) {
            return edge
        }

        return {
            ...edge,
            sourceOutput: nextSourceOutput,
            sourceHandle: nextSourceOutput,
        }
    })
}

export function buildOutputRenamePlan(
    previousNode: WorkflowEditorNode | undefined,
    nextNode: WorkflowEditorNode
): {
    renameMap: Record<string, string>
    removedReferencedOutputName?: string
} {
    const previousOutputs = getNodeOutputs(previousNode)
    const nextOutputs = getNodeOutputs(nextNode)

    const renameMap: Record<string, string> = {}

    for (let index = 0; index < previousOutputs.length; index += 1) {
        const previousOutputName = trim(previousOutputs[index]?.name)
        const nextOutputName = trim(nextOutputs[index]?.name)

        if (!previousOutputName) {
            continue
        }

        if (!nextOutputName) {
            return {
                renameMap,
                removedReferencedOutputName: previousOutputName,
            }
        }

        if (previousOutputName !== nextOutputName) {
            renameMap[previousOutputName] = nextOutputName
        }
    }

    return { renameMap }
}