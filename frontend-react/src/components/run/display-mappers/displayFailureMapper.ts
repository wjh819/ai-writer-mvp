import type { DisplayFailureInfo, DisplayStep } from '../runDisplayModels'
import { mapErrorTypeLabel } from '../runFailure'

function findLastFailedStep(steps: DisplayStep[]) {
    return [...steps].reverse().find(step => step.status === 'failed') || null
}

export function buildDisplayFailureInfo(params: {
    status?: 'success' | 'failed'
    steps: DisplayStep[]
    errorType?: string
    errorMessage?: string
    errorDetail?: string
}): DisplayFailureInfo | null {
    const { status, steps, errorType, errorMessage, errorDetail } = params

    if (status !== 'failed') {
        return null
    }

    const failedStep = findLastFailedStep(steps || [])
    const failedStepDetail =
        failedStep?.errorDetail || failedStep?.errorMessage || ''
    const detail = errorDetail || errorMessage || failedStepDetail

    if (!detail) {
        return {
            typeLabel: mapErrorTypeLabel(errorType),
            summary: 'Run failed before a detailed error was recorded.',
            detail: '',
            failedNode: failedStep?.node || '',
        }
    }

    return {
        typeLabel: mapErrorTypeLabel(errorType),
        summary: errorMessage || detail.split('\n')[0],
        detail,
        failedNode: failedStep?.node || '',
    }
}