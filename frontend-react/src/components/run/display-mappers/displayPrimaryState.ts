import type { WorkflowState } from '../../../shared/workflowSharedTypes'

export function buildPrimaryState(params: {
    status: 'success' | 'failed'
    finalState: WorkflowState
    partialState: WorkflowState | null | undefined
}) {
    const { status, finalState, partialState } = params

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