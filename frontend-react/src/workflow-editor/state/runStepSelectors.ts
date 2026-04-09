import type { LiveRunSnapshot, RunResult } from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type { ExecutedNodeMap } from '../workflowEditorGraphTypes'

export type WorkflowStep =
    | RunResult['steps'][number]
    | LiveRunSnapshot['steps'][number]

type StepContainer = {
    steps?: WorkflowStep[]
} | null

export function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }
    return String(value).trim()
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getStepInputs(
    step: WorkflowStep | undefined
): WorkflowState | undefined {
    if (!step || !('inputs' in step)) {
        return undefined
    }

    return isRecord(step.inputs)
        ? (step.inputs as WorkflowState)
        : undefined
}

export function getStepOutput(step: WorkflowStep | undefined): unknown {
    if (!step || !('output' in step)) {
        return undefined
    }
    return step.output
}

export function getPublishedState(
    step: WorkflowStep | undefined
): WorkflowState | undefined {
    if (!step || !('published_state' in step)) {
        return undefined
    }

    return isRecord(step.published_state)
        ? (step.published_state as WorkflowState)
        : undefined
}

export function buildLatestStepMap(
    stepContainer: StepContainer
): Record<string, WorkflowStep | undefined> {
    const result: Record<string, WorkflowStep | undefined> = {}

    ;(stepContainer?.steps || []).forEach(step => {
        const nodeId = trim(step.node)
        if (!nodeId) {
            return
        }
        result[nodeId] = step
    })

    return result
}

export function buildExecutedNodeMap(
    stepContainer: StepContainer
): ExecutedNodeMap {
    const result: ExecutedNodeMap = {}

    ;(stepContainer?.steps || []).forEach((step, index) => {
        const nodeId = trim(step.node)
        if (!nodeId) {
            return
        }
        result[nodeId] = index
    })

    return result
}

export function findLastFailedStep(
    stepContainer: StepContainer
): WorkflowStep | undefined {
    return [...(stepContainer?.steps || [])]
        .reverse()
        .find(step => step.status === 'failed')
}

export function getActiveNodeId(
    liveRunSnapshot: LiveRunSnapshot | null
): string | null {
    const value = trim(liveRunSnapshot?.active_node_id)
    return value || null
}