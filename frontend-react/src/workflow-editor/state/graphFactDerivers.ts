import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { trim } from './runStepSelectors'

export function buildUniqueStrings(values: string[]): string[] {
    const result: string[] = []

    values.forEach(value => {
        const nextValue = trim(value)
        if (!nextValue || result.includes(nextValue)) {
            return
        }
        result.push(nextValue)
    })

    return result
}

export function buildDerivedTargetInputs(
    nodeId: string,
    edges: WorkflowEditorEdge[]
): string[] {
    return buildUniqueStrings(
        (edges || [])
            .filter(edge => trim(edge.target) === nodeId)
            .map(edge => trim(edge.targetInput))
    )
}

export function buildInboundBindings(
    nodeId: string,
    edges: WorkflowEditorEdge[]
) {
    return (edges || [])
        .filter(edge => trim(edge.target) === nodeId)
        .map(edge => ({
            sourceNodeId: trim(edge.source),
            sourceOutput: trim(edge.sourceOutput),
            targetInput: trim(edge.targetInput),
        }))
        .filter(
            binding =>
                Boolean(binding.sourceNodeId) &&
                Boolean(binding.sourceOutput) &&
                Boolean(binding.targetInput)
        )
}

export function buildPromptGraphWindowFacts(params: {
    nodeId: string
    contextLinks: WorkflowContextLink[]
}) {
    const inboundLink =
        (params.contextLinks || []).find(link => trim(link.target) === params.nodeId) ??
        null

    const graphWindowTargetNodeIds = buildUniqueStrings(
        (params.contextLinks || [])
            .filter(link => trim(link.source) === params.nodeId)
            .map(link => trim(link.target))
    )

    return {
        graphWindowMode: inboundLink?.mode ?? ('new_window' as const),
        graphWindowSourceNodeId: inboundLink ? trim(inboundLink.source) : null,
        graphWindowTargetNodeIds,
    }
}

export function buildNodeTestFields(
    node: WorkflowEditorNode,
    options?: {
        onRequestSubgraphTest?: (nodeId: string) => void
        runningSubgraphTestNodeId?: string | null
    }
): Pick<
    WorkflowEditorNode['data'],
    'onRequestSubgraphTest' | 'isSubgraphTestRunning'
> {
    const nodeId = trim(node.id)
    const runningNodeId = trim(options?.runningSubgraphTestNodeId)

    return {
        onRequestSubgraphTest: options?.onRequestSubgraphTest,
        isSubgraphTestRunning: Boolean(nodeId && runningNodeId === nodeId),
    }
}