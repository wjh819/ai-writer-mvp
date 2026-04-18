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
            primaryStateTitle: '当前实时状态',
        }
    }

    if (status === 'success') {
        return {
            primaryState: finalState || {},
            primaryStateTitle: '最终状态',
        }
    }

    return {
        primaryState: partialState || {},
        primaryStateTitle: '失败前的部分状态',
    }
}

