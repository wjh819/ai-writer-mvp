import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'

export interface SubgraphTestInputItem {
    targetInput: string
    sourceStateKey?: string
}

export type SubgraphTestInputSource = 'reusable' | 'pinned' | 'missing'

export interface EffectiveSubgraphTestInputItem {
    targetInput: string
    sourceStateKey: string
    hasReusableValue: boolean
    reusableValue?: unknown
    hasPinnedValue: boolean
    pinnedValue?: unknown
    effectiveSource: SubgraphTestInputSource
    effectiveValue?: unknown
}

function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }

    return String(value).trim()
}

function hasOwnUnknownKey(
    value: Record<string, unknown> | null | undefined,
    key: string
): boolean {
    return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)
}

export function buildSubgraphTestInputItems(
    node: WorkflowEditorNode | null,
    allNodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[]
): SubgraphTestInputItem[] {
    if (!node) {
        return []
    }

    const config = node.data?.config
    if (!config) {
        return []
    }

    if (config.type === 'input') {
        const inputKey = trim(config.inputKey)

        return inputKey
            ? [
                {
                    targetInput: inputKey,
                    sourceStateKey: inputKey,
                },
            ]
            : []
    }

    const items: SubgraphTestInputItem[] = []
    const seenTargetInputs = new Set<string>()

    ;(edges || []).forEach(edge => {
        if (trim(edge.target) !== node.id) {
            return
        }

        const targetInput = trim(edge.targetInput)
        if (!targetInput || seenTargetInputs.has(targetInput)) {
            return
        }

        const sourceNode = allNodes.find(candidate => candidate.id === edge.source)
        const sourceOutputs = sourceNode?.data?.config?.outputs || []

        const sourceSpec = sourceOutputs.find(
            output => output.name === edge.sourceOutput
        )
        const sourceStateKey = trim(sourceSpec?.stateKey)

        items.push({
            targetInput,
            sourceStateKey: sourceStateKey || undefined,
        })

        seenTargetInputs.add(targetInput)
    })

    return items
}

export function buildEffectiveSubgraphTestInputItems(params: {
    node: WorkflowEditorNode | null
    allNodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    subgraphTestState: WorkflowState
    pinnedInputs: Record<string, unknown>
}): EffectiveSubgraphTestInputItem[] {
    const { node, allNodes, edges, subgraphTestState, pinnedInputs } = params

    const items = buildSubgraphTestInputItems(node, allNodes, edges)

    return items.map(item => {
        const sourceStateKey = item.sourceStateKey || item.targetInput

        const hasReusableValue = hasOwnUnknownKey(
            subgraphTestState,
            sourceStateKey
        )
        const reusableValue = hasReusableValue
            ? subgraphTestState[sourceStateKey]
            : undefined

        const hasPinnedValue = hasOwnUnknownKey(pinnedInputs, item.targetInput)
        const pinnedValue = hasPinnedValue
            ? pinnedInputs[item.targetInput]
            : undefined

        const effectiveSource: SubgraphTestInputSource = hasReusableValue
            ? 'reusable'
            : hasPinnedValue
                ? 'pinned'
                : 'missing'

        const effectiveValue =
            effectiveSource === 'reusable'
                ? reusableValue
                : effectiveSource === 'pinned'
                    ? pinnedValue
                    : undefined

        return {
            targetInput: item.targetInput,
            sourceStateKey,
            hasReusableValue,
            reusableValue,
            hasPinnedValue,
            pinnedValue,
            effectiveSource,
            effectiveValue,
        }
    })
}

export function buildMergedSubgraphTestState(params: {
    baseState: WorkflowState
    effectiveItems: EffectiveSubgraphTestInputItem[]
}): WorkflowState {
    const { baseState, effectiveItems } = params

    const nextState: WorkflowState = {
            ...(baseState || {}),
        }

    ;(effectiveItems || []).forEach(item => {
        if (item.effectiveSource !== 'pinned') {
            return
        }

        if (Object.prototype.hasOwnProperty.call(nextState, item.sourceStateKey)) {
            return
        }

        nextState[item.sourceStateKey] = item.pinnedValue
    })

    return nextState
}