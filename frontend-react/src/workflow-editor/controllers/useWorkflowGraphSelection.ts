import { useMemo } from 'react'

import type { RunResult } from '../../run/runTypes'
import { buildInputNodes } from '../state/workflowEditorRunInputs'
import { buildSelectedNode } from '../state/workflowEditorSelection'
import {
    buildDisplayEdges,
    buildDisplayNodes,
    buildExecutedNodeMap,
} from '../state/workflowEditorViewState'
import type {
    WorkflowEditorContextEdge,
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'

interface UseWorkflowGraphSelectionOptions {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]

    selectedNodeId: string | null
    selectedEdgeId: string | null
    selectedContextLinkId: string | null

    runResult: RunResult | null
    onRequestSubgraphTest?: (nodeId: string) => void
    runningSubgraphTestNodeId?: string | null
}

export function useWorkflowGraphSelection({
                                              nodes,
                                              edges,
                                              contextLinks,
                                              selectedNodeId,
                                              selectedEdgeId,
                                              selectedContextLinkId,
                                              runResult,
                                              onRequestSubgraphTest,
                                              runningSubgraphTestNodeId,
                                          }: UseWorkflowGraphSelectionOptions) {
    const executedNodeMap = useMemo(
        () => buildExecutedNodeMap(runResult),
        [runResult]
    )

    const displayNodes = useMemo(
        () =>
            buildDisplayNodes(nodes, edges, contextLinks, executedNodeMap, runResult, {
                onRequestSubgraphTest,
                runningSubgraphTestNodeId,
            }),
        [
            nodes,
            edges,
            contextLinks,
            executedNodeMap,
            runResult,
            onRequestSubgraphTest,
            runningSubgraphTestNodeId,
        ]
    )

    const displayEdges = useMemo(
        () =>
            buildDisplayEdges(
                edges,
                contextLinks,
                selectedEdgeId,
                selectedContextLinkId
            ),
        [edges, contextLinks, selectedEdgeId, selectedContextLinkId]
    )

    const selectedNode = useMemo(
        () => buildSelectedNode(nodes, selectedNodeId),
        [nodes, selectedNodeId]
    )

    const inputNodes = useMemo(() => buildInputNodes(nodes), [nodes])

    const selectedContextEdge = useMemo(() => {
        const hit = displayEdges.find(
            edge =>
                edge.relationType === 'context' &&
                edge.contextLinkId === selectedContextLinkId
        )

        return (hit as WorkflowEditorContextEdge | undefined) || null
    }, [displayEdges, selectedContextLinkId])

    return {
        executedNodeMap,
        displayNodes,
        displayEdges,
        selectedNode,
        inputNodes,
        selectedContextEdge,
    }
}