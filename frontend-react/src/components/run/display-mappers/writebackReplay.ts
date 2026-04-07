import type { StepProjection } from '../../../run/runTypes'
import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type { DisplayWritebackItem } from '../runDisplayModels'

function hasOwnKey(value: Record<string, unknown>, key: string) {
    return Object.prototype.hasOwnProperty.call(value, key)
}

export function buildDisplayWritebackItems(
    workingState: WorkflowState,
    publishedState: WorkflowState
): DisplayWritebackItem[] {
    return Object.entries(publishedState || {}).map(([key, afterValue]) => ({
        key,
        beforeValue: hasOwnKey(workingState, key) ? workingState[key] : undefined,
        afterValue,
    }))
}

export function applyPublishedState(
    workingState: WorkflowState,
    publishedState: WorkflowState
) {
    Object.entries(publishedState || {}).forEach(([key, value]) => {
        workingState[key] = value
    })
}

export function getPublishedState(step: StepProjection): WorkflowState | null {
    if (!('published_state' in step)) {
        return null
    }

    const value = step.published_state
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
    }

    return value as WorkflowState
}