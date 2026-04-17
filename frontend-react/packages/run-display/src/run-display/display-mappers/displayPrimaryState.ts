import type { WorkflowState } from '../../run/runDisplayInputTypes'

export function buildPrimaryState(params: {
    status: 'running' | 'success' | 'failed'
    currentState: WorkflowState
    finalState: WorkflowState
    partialState: WorkflowState | null | undefined
}) {
    const { status, currentState, finalState, partialState } = params

    if (status === 'running') {
        return {
            primaryState: currentState || {},
            primaryStateTitle: 'Current Live State',
        }
    }

    if (status === 'success') {
        return {
            primaryState: finalState || {},
            primaryStateTitle: 'Final State',
        }
    }

    return {
        primaryState: partialState || {},
        primaryStateTitle: 'Partial State Before Failure',
    }
}

