import type { WorkflowEditorNode } from '../workflowEditorGraphTypes'
import type { WorkflowStep } from './runStepSelectors'
import {
    getPublishedState,
    getStepInputs,
    getStepOutput,
} from './runStepSelectors'

export function buildRuntimeFields(
    node: WorkflowEditorNode,
    latestStep: WorkflowStep | undefined
): Pick<
    WorkflowEditorNode['data'],
    'runtimeInputs' | 'runtimeOutput' | 'runtimePublishedState'
> {
    const nodeType = node.data.config.type
    const runtimeInputs = getStepInputs(latestStep)
    const runtimeOutput = getStepOutput(latestStep)

    if (latestStep?.status === 'success') {
        return {
            runtimeInputs: nodeType === 'input' ? undefined : runtimeInputs,
            runtimeOutput,
            runtimePublishedState: getPublishedState(latestStep),
        }
    }

    return {
        runtimeInputs: nodeType === 'input' ? undefined : runtimeInputs,
        runtimeOutput: undefined,
        runtimePublishedState: undefined,
    }
}