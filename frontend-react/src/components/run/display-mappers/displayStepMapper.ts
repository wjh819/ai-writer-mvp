import type { LiveRunSnapshot, RunResult } from '../../../run/runTypes'
import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type { DisplayRun, DisplayStep } from '../runDisplayModels'
import { getErrorText } from '../runFailure'
import {
    applyPublishedState,
    buildDisplayWritebackItems,
    getPublishedState,
} from './writebackReplay'

type RawDisplayStep =
    | RunResult['steps'][number]
    | LiveRunSnapshot['steps'][number]

function buildDisplayStepId(node: string, index: number) {
    return `${node}-${index}`
}

function derivePromptDisplayText(step: RawDisplayStep): string | undefined {
    if (
        'prompt_ref' in step &&
        typeof step.prompt_ref === 'string' &&
        step.prompt_ref.trim()
    ) {
        return step.prompt_ref.trim()
    }

    if ('prompt_mode' in step && step.prompt_mode === 'inline') {
        return '(inline)'
    }

    return undefined
}

export function buildDisplayStepsFromRawSteps(
    inputState: WorkflowState,
    steps: RawDisplayStep[]
): DisplayStep[] {
    const workingState: WorkflowState = { ...(inputState || {}) }

    return (steps || []).map((step, index) => {
        const hasOutput = 'output' in step
        const isSuccess = step.status === 'success'
        const publishedState = getPublishedState(step)

        let writeback: DisplayStep['writeback'] = null

        if (isSuccess && publishedState && Object.keys(publishedState).length > 0) {
            writeback = {
                applied: true,
                items: buildDisplayWritebackItems(workingState, publishedState),
            }
            applyPublishedState(workingState, publishedState)
        }

        return {
            id: buildDisplayStepId(step.node, index),
            index,
            node: step.node,
            type: step.type,
            status: step.status,
            startedAt: step.started_at,
            finishedAt: step.finished_at,
            durationMs: step.duration_ms,
            promptMode: 'prompt_mode' in step ? step.prompt_mode : undefined,
            promptRef: 'prompt_ref' in step ? step.prompt_ref ?? undefined : undefined,
            promptDisplayText: derivePromptDisplayText(step),
            inputs: 'inputs' in step ? step.inputs : undefined,
            renderedPrompt:
                'rendered_prompt' in step ? step.rendered_prompt ?? undefined : undefined,
            output: hasOutput ? step.output : undefined,
            errorMessage:
                'error_message' in step ? getErrorText(step.error_message) : undefined,
            errorDetail:
                'error_detail' in step ? getErrorText(step.error_detail) : undefined,
            windowMode: 'window_mode' in step ? step.window_mode ?? undefined : undefined,
            windowSourceNodeId:
                'window_source_node_id' in step
                    ? step.window_source_node_id ?? undefined
                    : undefined,
            windowId: 'window_id' in step ? step.window_id ?? undefined : undefined,
            windowParentId:
                'window_parent_id' in step ? step.window_parent_id ?? undefined : undefined,
            writeback,
        }
    })
}

export function buildDisplayRunBase(params: {
    runResult: DisplayRun['raw'] & {
        status: DisplayRun['status']
        run_scope: DisplayRun['runScope']
        failure_stage?: DisplayRun['failureStage']
        input_state?: WorkflowState
        current_state?: WorkflowState
        final_state?: WorkflowState
        partial_state?: WorkflowState | null
        steps?: RawDisplayStep[]
    }
}) {
    const { runResult } = params

    const inputState = runResult.input_state || {}
    const currentState = runResult.current_state || {}
    const finalState = runResult.final_state || {}
    const partialState = runResult.partial_state || null
    const steps = buildDisplayStepsFromRawSteps(inputState, runResult.steps || [])

    return {
        inputState,
        currentState,
        finalState,
        partialState,
        steps,
    }
}