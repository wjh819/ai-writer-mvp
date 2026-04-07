import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'

function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }
    return String(value).trim()
}

/**
 * 构建联合执行关系图。
 *
 * 正式规则：
 * - data edge：提供 source -> target 执行顺序约束
 * - context link：提供 source -> target 执行顺序约束
 * - 输入绑定解析仍只看 data edges
 * - cycle/path 检查看 data edges ∪ contextLinks
 */
export function buildExecutionAdjacency(params: {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
}): Map<string, string[]> {
    const { nodes, edges, contextLinks } = params
    const adjacency = new Map<string, string[]>()

    for (const node of nodes || []) {
        adjacency.set(node.id, [])
    }

    for (const edge of edges || []) {
        const source = trim(edge.source)
        const target = trim(edge.target)
        if (!source || !target) {
            continue
        }

        adjacency.set(source, [...(adjacency.get(source) || []), target])
    }

    for (const link of contextLinks || []) {
        const source = trim(link.source)
        const target = trim(link.target)
        if (!source || !target) {
            continue
        }

        adjacency.set(source, [...(adjacency.get(source) || []), target])
    }

    return adjacency
}

/**
 * 判断当前联合执行关系图中，是否存在 start -> target 的执行路径。
 */
export function hasExecutionPath(params: {
    startNodeId: string
    targetNodeId: string
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
}): boolean {
    const { startNodeId, targetNodeId, nodes, edges, contextLinks } = params

    const adjacency = buildExecutionAdjacency({
        nodes,
        edges,
        contextLinks,
    })

    const visited = new Set<string>()
    const stack = [startNodeId]

    while (stack.length > 0) {
        const current = stack.pop() as string
        if (current === targetNodeId) {
            return true
        }

        if (visited.has(current)) {
            continue
        }

        visited.add(current)

        for (const nextNodeId of adjacency.get(current) || []) {
            if (!visited.has(nextNodeId)) {
                stack.push(nextNodeId)
            }
        }
    }

    return false
}