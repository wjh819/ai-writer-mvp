import type { WorkflowEditorEdge, WorkflowEditorNode } from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'

export interface BaseActionResult {
    didChangeSemanticGraph: boolean
    error?: string
}

export interface NodesActionResult extends BaseActionResult {
    nextNodes: WorkflowEditorNode[]
    selectedNodeId?: string | null
}

export interface GraphActionResult extends BaseActionResult {
    nextNodes: WorkflowEditorNode[]
    nextEdges: WorkflowEditorEdge[]
    nextContextLinks: WorkflowContextLink[]
    selectedNodeId?: string | null
    selectedEdgeId?: string | null
    selectedContextLinkId?: string | null
}