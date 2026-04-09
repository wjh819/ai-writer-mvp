import type { CanvasSummary } from '../../api'
import type { ModelResourceListItem } from '../../model-resources/modelResourceTypes'
import type {
    LiveRunSnapshot,
    LiveRunStartResponse,
    RunResult,
} from '../../run/runTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../workflowEditorTypes'
import type {
    WorkflowLoadWarning,
    WorkflowSidecarData,
} from '../workflowEditorUiTypes'

export interface FetchModelResourceListResult {
    modelResources: ModelResourceListItem[]
    errorMessage?: string
}

export interface FetchWorkflowListResult {
    canvasList: CanvasSummary[]
    errorMessage?: string
}

export interface FetchWorkflowBootstrapResult {
    modelResources: ModelResourceListItem[]
    modelResourceErrorMessage: string
    canvasList: CanvasSummary[]
    canvasListErrorMessage: string
}

export interface FetchWorkflowDetailResult {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
    sidecar: WorkflowSidecarData
    warnings: WorkflowLoadWarning[]
    errorMessage?: string
}

export interface SaveWorkflowResult {
    successMessage?: string
    errorMessage?: string
}

export interface DeleteWorkflowResult {
    successMessage?: string
    errorMessage?: string
}

export interface RunWorkflowResult {
    runResult?: RunResult
    successMessage?: string
    errorMessage?: string
}

export interface SubgraphTestWorkflowResult {
    subgraphTestResult?: RunResult
    successMessage?: string
    errorMessage?: string
}

export const EMPTY_WORKFLOW_SIDECAR: WorkflowSidecarData = {
    nodes: {},
}

export interface StartLiveRunResult {
    liveRunStart?: LiveRunStartResponse
    successMessage?: string
    errorMessage?: string
}

export interface FetchActiveLiveRunResult {
    liveRunSnapshot?: LiveRunSnapshot
    errorMessage?: string
}