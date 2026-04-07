import type { WorkflowContextLink } from './workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from './workflowEditorGraphTypes'
import type { WorkflowLoadWarning } from './loadWarnings'
import type { WorkflowSidecarData } from './sidecarTypes'

export interface RuntimeActionResult {
    successMessage?: string
    errorMessage?: string
}

export interface LoadWorkflowActionResult extends RuntimeActionResult {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
    sidecar: WorkflowSidecarData
    warnings: WorkflowLoadWarning[]
}