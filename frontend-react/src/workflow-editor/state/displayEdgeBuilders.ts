import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowEditorContextEdge,
    WorkflowEditorEdge,
    WorkflowGraphEdge,
} from '../workflowEditorGraphTypes'
import {
    CONTEXT_SOURCE_HANDLE_ID,
    CONTEXT_TARGET_HANDLE_ID,
} from '../workflowEditorGraphTypes'
import { trim } from './runStepSelectors'

function buildContextDisplayEdges(
    contextLinks: WorkflowContextLink[],
    selectedContextLinkId: string | null
): WorkflowEditorContextEdge[] {
    return (contextLinks || [])
        .map(contextLink => {
            const source = trim(contextLink.source)
            const target = trim(contextLink.target)
            const contextLinkId = trim(contextLink.id)

            if (!source || !target || !contextLinkId) {
                return null
            }

            return {
                id: `context::${contextLinkId}`,
                source,
                target,
                sourceHandle: CONTEXT_SOURCE_HANDLE_ID,
                targetHandle: CONTEXT_TARGET_HANDLE_ID,
                relationType: 'context',
                contextLinkId,
                mode: contextLink.mode,
                label: contextLink.mode,
                animated: contextLink.mode === 'continue',
                selected: selectedContextLinkId === contextLinkId,
                style: {
                    stroke: contextLink.mode === 'continue' ? '#2563eb' : '#7c3aed',
                    strokeDasharray: '6 4',
                    strokeWidth: 2,
                },
                labelStyle: {
                    fill: '#374151',
                    fontSize: 12,
                    fontWeight: 600,
                },
            } as WorkflowEditorContextEdge
        })
        .filter((edge): edge is WorkflowEditorContextEdge => Boolean(edge))
}

/**
 * 把 data edges 与 contextLinks 统一投影为前端 display edges。
 *
 * 注意：
 * - data edge 仍是保存态边的前端壳
 * - context edge 只是显示壳，不进入保存态
 */
export function buildDisplayEdges(
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    selectedEdgeId: string | null,
    selectedContextLinkId: string | null
): WorkflowGraphEdge[] {
    const dataEdges: WorkflowGraphEdge[] = (edges || []).map(edge => ({
        ...edge,
        relationType: 'data',
        selected: edge.id === selectedEdgeId,
    }))

    const contextEdges = buildContextDisplayEdges(
        contextLinks,
        selectedContextLinkId
    )

    return [...dataEdges, ...contextEdges]
}