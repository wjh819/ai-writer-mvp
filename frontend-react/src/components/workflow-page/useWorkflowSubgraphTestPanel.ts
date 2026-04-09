import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { RunResult } from '../../run/runTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'
import { buildNextPromptOutputSpec } from '../../workflow-editor/domain/workflowEditorHelpers'
import {
    buildEffectiveSubgraphTestInputItems,
    buildMergedSubgraphTestState,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
    EffectiveSubgraphTestInputItem,
    SubgraphTestInputSource,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'
import type { WorkflowSidecarNodeAssets } from '../../workflow-editor/workflowEditorUiTypes'
import { buildDisplayRunFromDirectRun } from '../run/runDisplayMappers'

interface SemanticGraphSnapshot {
    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
}

interface UseWorkflowSubgraphTestPanelOptions {
    activeCanvasId: string
    graphSemanticVersion: number

    nodes: WorkflowEditorNode[]
    edges: WorkflowEditorEdge[]
    contextLinks: WorkflowContextLink[]
    selectedNode: WorkflowEditorNode | null
    selectedDisplayNode: WorkflowEditorNode | null

    requestedSubgraphTestNodeId: string | null
    setRequestedSubgraphTestNodeId: (value: string | null) => void
    isSubgraphTestPanelExpanded: boolean
    setIsSubgraphTestPanelExpanded: (value: boolean) => void

    clearPageError: () => void
    onGraphPersistedChanged: () => void
    selectNodeById: (nodeId: string) => void

    subgraphTestState: WorkflowState
    activeSubgraphTestResult: RunResult | null
    activeSubgraphTestStartNodeId: string | null
    subgraphTestResultsByNodeId: Record<string, RunResult>
    staleSubgraphTestResultIds: Record<string, true>
    runningSubgraphTestNodeId: string | null
    lastSuccessfulSubgraphTestStartNodeId: string | null

    getWorkflowSidecarNodeAssets: (nodeId: string) => WorkflowSidecarNodeAssets
    updateWorkflowSidecarNodeAssets: (
        nodeId: string,
        updater: (previous: WorkflowSidecarNodeAssets) => WorkflowSidecarNodeAssets
    ) => void
    pruneWorkflowSidecar: (validNodeIds: string[]) => void

    markSubgraphTestResultStale: (nodeId: string) => void
    clearSubgraphTestResultStale: (nodeId: string) => void
    handleRunSubgraphTest: (
        canvasId: string,
        nodes: WorkflowEditorNode[],
        edges: WorkflowEditorEdge[],
        contextLinks: WorkflowContextLink[],
        startNodeId: string,
        nextSubgraphTestState: WorkflowState,
        endNodeIds?: string[]
    ) => Promise<{
        subgraphTestResult?: RunResult
        successMessage?: string
        errorMessage?: string
    }>
    clearSubgraphTestResult: (nodeId: string) => void
    pruneSubgraphTestArtifacts: (validNodeIds: string[]) => void
    resetSubgraphTestState: () => void
    resetSubgraphTestContext: () => void
    isLiveRunActive: boolean
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(value, key)
}

function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }

    return String(value).trim()
}

function formatPinnedInputDraft(value: unknown): string {
    if (typeof value === 'undefined') {
        return ''
    }

    if (typeof value === 'string') {
        return value
    }

    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

function parsePinnedInputDraft(text: string): unknown | undefined {
    const trimmed = text.trim()

    if (!trimmed) {
        return undefined
    }

    try {
        return JSON.parse(trimmed)
    } catch {
        return text
    }
}

function buildNodeMap(
    nodes: WorkflowEditorNode[]
): Map<string, WorkflowEditorNode> {
    return new Map((nodes || []).map(node => [node.id, node]))
}

function isSameSemanticNodeConfig(
    previousNode: WorkflowEditorNode,
    nextNode: WorkflowEditorNode
): boolean {
    const previousConfig = previousNode.data.config
    const nextConfig = nextNode.data.config

    if (previousConfig.type !== nextConfig.type) {
        return false
    }

    if (
        JSON.stringify(previousConfig.outputs || []) !==
        JSON.stringify(nextConfig.outputs || [])
    ) {
        return false
    }

    if (previousConfig.type === 'input' && nextConfig.type === 'input') {
        return (
            previousConfig.inputKey === nextConfig.inputKey &&
            previousConfig.defaultValue === nextConfig.defaultValue
        )
    }

    if (previousConfig.type === 'prompt' && nextConfig.type === 'prompt') {
        return (
            previousConfig.promptText === nextConfig.promptText &&
            previousConfig.modelResourceId === nextConfig.modelResourceId &&
            JSON.stringify(previousConfig.llm) === JSON.stringify(nextConfig.llm)
        )
    }

    return true
}

function collectSemanticChangedNodeIds(
    previousNodes: WorkflowEditorNode[],
    nextNodes: WorkflowEditorNode[]
): Set<string> {
    const changedNodeIds = new Set<string>()
    const previousNodeMap = buildNodeMap(previousNodes)
    const nextNodeMap = buildNodeMap(nextNodes)

    const allNodeIds = new Set<string>([
        ...Array.from(previousNodeMap.keys()),
        ...Array.from(nextNodeMap.keys()),
    ])

    allNodeIds.forEach(nodeId => {
        const previousNode = previousNodeMap.get(nodeId)
        const nextNode = nextNodeMap.get(nodeId)

        if (!previousNode || !nextNode) {
            changedNodeIds.add(nodeId)
            return
        }

        if (!isSameSemanticNodeConfig(previousNode, nextNode)) {
            changedNodeIds.add(nodeId)
        }
    })

    return changedNodeIds
}

function buildDataEdgeSemanticKey(edge: WorkflowEditorEdge): string {
    return [
        trim(edge.source),
        trim(edge.sourceOutput),
        trim(edge.target),
        trim(edge.targetInput),
    ].join('::')
}

function collectChangedDataEdgeTargets(
    previousEdges: WorkflowEditorEdge[],
    nextEdges: WorkflowEditorEdge[]
): Set<string> {
    const changedTargets = new Set<string>()

    const previousMap = new Map(
        (previousEdges || []).map(edge => [buildDataEdgeSemanticKey(edge), edge])
    )
    const nextMap = new Map(
        (nextEdges || []).map(edge => [buildDataEdgeSemanticKey(edge), edge])
    )

    const allKeys = new Set<string>([
        ...Array.from(previousMap.keys()),
        ...Array.from(nextMap.keys()),
    ])

    allKeys.forEach(key => {
        const previousEdge = previousMap.get(key)
        const nextEdge = nextMap.get(key)

        if (previousEdge && !nextEdge) {
            const target = trim(previousEdge.target)
            if (target) {
                changedTargets.add(target)
            }
            return
        }

        if (!previousEdge && nextEdge) {
            const target = trim(nextEdge.target)
            if (target) {
                changedTargets.add(target)
            }
        }
    })

    return changedTargets
}

function buildContextLinkSemanticKey(link: WorkflowContextLink): string {
    return [trim(link.source), trim(link.target), trim(link.mode)].join('::')
}

function collectChangedContextTargets(
    previousContextLinks: WorkflowContextLink[],
    nextContextLinks: WorkflowContextLink[]
): Set<string> {
    const changedTargets = new Set<string>()

    const previousMap = new Map(
        (previousContextLinks || []).map(link => [
            buildContextLinkSemanticKey(link),
            link,
        ])
    )
    const nextMap = new Map(
        (nextContextLinks || []).map(link => [
            buildContextLinkSemanticKey(link),
            link,
        ])
    )

    const allKeys = new Set<string>([
        ...Array.from(previousMap.keys()),
        ...Array.from(nextMap.keys()),
    ])

    allKeys.forEach(key => {
        const previousLink = previousMap.get(key)
        const nextLink = nextMap.get(key)

        if (previousLink && !nextLink) {
            const target = trim(previousLink.target)
            if (target) {
                changedTargets.add(target)
            }
            return
        }

        if (!previousLink && nextLink) {
            const target = trim(nextLink.target)
            if (target) {
                changedTargets.add(target)
            }
        }
    })

    return changedTargets
}

function collectUpstreamNodeIds(
    anchorNodeId: string,
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[]
): Set<string> {
    const normalizedAnchorNodeId = trim(anchorNodeId)
    const upstreamNodeIds = new Set<string>()

    if (!normalizedAnchorNodeId) {
        return upstreamNodeIds
    }

    const reverseAdjacency = new Map<string, string[]>()

    ;(nodes || []).forEach(node => {
        reverseAdjacency.set(node.id, reverseAdjacency.get(node.id) || [])
    })

    ;(edges || []).forEach(edge => {
        const source = trim(edge.source)
        const target = trim(edge.target)

        if (!source || !target) {
            return
        }

        reverseAdjacency.set(target, [
            ...(reverseAdjacency.get(target) || []),
            source,
        ])
    })

    ;(contextLinks || []).forEach(link => {
        const source = trim(link.source)
        const target = trim(link.target)

        if (!source || !target) {
            return
        }

        reverseAdjacency.set(target, [
            ...(reverseAdjacency.get(target) || []),
            source,
        ])
    })

    const stack = [normalizedAnchorNodeId]

    while (stack.length > 0) {
        const currentNodeId = trim(stack.pop())
        if (!currentNodeId || upstreamNodeIds.has(currentNodeId)) {
            continue
        }

        upstreamNodeIds.add(currentNodeId)

        ;(reverseAdjacency.get(currentNodeId) || []).forEach(previousNodeId => {
            if (!upstreamNodeIds.has(previousNodeId)) {
                stack.push(previousNodeId)
            }
        })
    }

    return upstreamNodeIds
}

function shouldInvalidateSubgraphTestContextForSemanticChange(params: {
    previousSnapshot: SemanticGraphSnapshot
    nextSnapshot: SemanticGraphSnapshot
    anchorNodeId: string
}): boolean {
    const { previousSnapshot, nextSnapshot, anchorNodeId } = params

    const changedNodeIds = collectSemanticChangedNodeIds(
        previousSnapshot.nodes,
        nextSnapshot.nodes
    )
    const changedDataEdgeTargets = collectChangedDataEdgeTargets(
        previousSnapshot.edges,
        nextSnapshot.edges
    )
    const changedContextTargets = collectChangedContextTargets(
        previousSnapshot.contextLinks,
        nextSnapshot.contextLinks
    )

    if (
        changedNodeIds.size === 0 &&
        changedDataEdgeTargets.size === 0 &&
        changedContextTargets.size === 0
    ) {
        return false
    }

    const relatedNodeIds = new Set<string>([
        ...Array.from(
            collectUpstreamNodeIds(
                anchorNodeId,
                previousSnapshot.nodes,
                previousSnapshot.edges,
                previousSnapshot.contextLinks
            )
        ),
        ...Array.from(
            collectUpstreamNodeIds(
                anchorNodeId,
                nextSnapshot.nodes,
                nextSnapshot.edges,
                nextSnapshot.contextLinks
            )
        ),
    ])

    if (relatedNodeIds.size === 0) {
        relatedNodeIds.add(anchorNodeId)
    }

    for (const nodeId of changedNodeIds) {
        if (relatedNodeIds.has(nodeId)) {
            return true
        }
    }

    for (const targetNodeId of changedDataEdgeTargets) {
        if (relatedNodeIds.has(targetNodeId)) {
            return true
        }
    }

    for (const targetNodeId of changedContextTargets) {
        if (relatedNodeIds.has(targetNodeId)) {
            return true
        }
    }

    return false
}

export function getEffectiveSourceLabel(
    source: SubgraphTestInputSource
): string {
    switch (source) {
        case 'reusable':
            return 'Reusable'
        case 'pinned':
            return 'Pinned'
        default:
            return 'Missing'
    }
}

export function getEffectiveSourceStyles(source: SubgraphTestInputSource) {
    switch (source) {
        case 'reusable':
            return {
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
            }
        case 'pinned':
            return {
                border: '1px solid #c7d2fe',
                background: '#eef2ff',
                color: '#4338ca',
            }
        default:
            return {
                border: '1px solid #e5e7eb',
                background: '#f8fafc',
                color: '#64748b',
            }
    }
}

export function buildNextOutputSpec(
    nodeId: string,
    config: WorkflowEditorNode['data']['config']
) {
    if (config.type === 'prompt') {
        return buildNextPromptOutputSpec(nodeId, config.outputs)
    }

    const nextIndex = (config.outputs || []).length + 1
    return {
        name: nextIndex === 1 ? 'result' : `result_${nextIndex}`,
        stateKey: `out_${nodeId}_${nextIndex}`,
    }
}

const LIVE_RUN_LOCK_MESSAGE =
    'Node test is disabled while a full live run is active.'

export function useWorkflowSubgraphTestPanel({
                                                 activeCanvasId,
                                                 graphSemanticVersion,

                                                 nodes,
                                                 edges,
                                                 contextLinks,
                                                 selectedNode,

                                                 requestedSubgraphTestNodeId,
                                                 setRequestedSubgraphTestNodeId,
                                                 isSubgraphTestPanelExpanded,
                                                 setIsSubgraphTestPanelExpanded,

                                                 clearPageError,
                                                 onGraphPersistedChanged,
                                                 selectNodeById,

                                                 subgraphTestState,
                                                 activeSubgraphTestResult,
                                                 activeSubgraphTestStartNodeId,
                                                 subgraphTestResultsByNodeId,
                                                 staleSubgraphTestResultIds,
                                                 runningSubgraphTestNodeId,
                                                 lastSuccessfulSubgraphTestStartNodeId,

                                                 getWorkflowSidecarNodeAssets,
                                                 updateWorkflowSidecarNodeAssets,
                                                 pruneWorkflowSidecar,

                                                 markSubgraphTestResultStale,
                                                 clearSubgraphTestResultStale,
                                                 handleRunSubgraphTest,
                                                 clearSubgraphTestResult,
                                                 pruneSubgraphTestArtifacts,
                                                 resetSubgraphTestState,
                                                 resetSubgraphTestContext,
                                                 isLiveRunActive,
                                             }: UseWorkflowSubgraphTestPanelOptions) {
    const [subgraphTestPanelErrorMessage, setSubgraphTestPanelErrorMessage] =
        useState('')
    const [subgraphTestInfoMessage, setSubgraphTestInfoMessage] = useState('')

    const semanticGraphSnapshotRef = useRef<SemanticGraphSnapshot | null>(null)

    const clearSubgraphTestFeedback = useCallback(() => {
        setSubgraphTestPanelErrorMessage('')
        setSubgraphTestInfoMessage('')
    }, [])

    const requestSubgraphTestFromCanvas = useCallback(
        (nodeId: string) => {
            if (isLiveRunActive) {
                setSubgraphTestPanelErrorMessage(LIVE_RUN_LOCK_MESSAGE)
                return
            }

            setRequestedSubgraphTestNodeId(nodeId)
            setIsSubgraphTestPanelExpanded(true)
            clearSubgraphTestFeedback()
            clearPageError()
        },
        [
            isLiveRunActive,
            setRequestedSubgraphTestNodeId,
            setIsSubgraphTestPanelExpanded,
            clearSubgraphTestFeedback,
            clearPageError,
        ]
    )

    const resetSubgraphTestPanelView = useCallback(() => {
        setIsSubgraphTestPanelExpanded(false)
        setRequestedSubgraphTestNodeId(null)
        clearSubgraphTestFeedback()
    }, [
        setIsSubgraphTestPanelExpanded,
        setRequestedSubgraphTestNodeId,
        clearSubgraphTestFeedback,
    ])

    const commitSemanticGraphSnapshot = useCallback(
        (
            nextNodes: WorkflowEditorNode[],
            nextEdges: WorkflowEditorEdge[],
            nextContextLinks: WorkflowContextLink[]
        ) => {
            semanticGraphSnapshotRef.current = {
                nodes: nextNodes,
                edges: nextEdges,
                contextLinks: nextContextLinks,
            }
        },
        []
    )

    const selectedNodeSidecarAssets = useMemo(() => {
        if (!selectedNode) {
            return null
        }

        return getWorkflowSidecarNodeAssets(selectedNode.id)
    }, [selectedNode, getWorkflowSidecarNodeAssets])

    const effectiveSubgraphTestInputItems = useMemo<
        EffectiveSubgraphTestInputItem[]
    >(() => {
        const pinnedInputs = selectedNodeSidecarAssets?.pinnedInputs || {}

        return buildEffectiveSubgraphTestInputItems({
            node: selectedNode,
            allNodes: nodes,
            edges,
            subgraphTestState,
            pinnedInputs,
        })
    }, [
        selectedNode,
        nodes,
        edges,
        subgraphTestState,
        selectedNodeSidecarAssets,
    ])

    const currentPinnedInputDraftTexts = useMemo(() => {
        if (!selectedNode || !selectedNodeSidecarAssets) {
            return {}
        }

        const nextDrafts: Record<string, string> = {}
        const pinnedInputs = selectedNodeSidecarAssets.pinnedInputs || {}

        effectiveSubgraphTestInputItems.forEach(item => {
            if (!hasOwn(pinnedInputs, item.targetInput)) {
                return
            }

            nextDrafts[item.targetInput] = formatPinnedInputDraft(
                pinnedInputs[item.targetInput]
            )
        })

        return nextDrafts
    }, [
        selectedNode,
        selectedNodeSidecarAssets,
        effectiveSubgraphTestInputItems,
    ])

    const selectedNodeSubgraphTestResult = useMemo(() => {
        if (!selectedNode) {
            return null
        }

        if (subgraphTestResultsByNodeId[selectedNode.id]) {
            return subgraphTestResultsByNodeId[selectedNode.id]
        }

        if (activeSubgraphTestStartNodeId === selectedNode.id) {
            return activeSubgraphTestResult
        }

        return null
    }, [
        selectedNode,
        subgraphTestResultsByNodeId,
        activeSubgraphTestStartNodeId,
        activeSubgraphTestResult,
    ])

    const selectedNodeSubgraphTestResultIsStale = useMemo(() => {
        if (!selectedNode) {
            return false
        }

        return Boolean(staleSubgraphTestResultIds[selectedNode.id])
    }, [selectedNode, staleSubgraphTestResultIds])

    const selectedSubgraphTestDisplayRun = useMemo(() => {
        if (!selectedNodeSubgraphTestResult) {
            return null
        }

        return buildDisplayRunFromDirectRun(selectedNodeSubgraphTestResult, {
            isStale: selectedNodeSubgraphTestResultIsStale,
        })
    }, [
        selectedNodeSubgraphTestResult,
        selectedNodeSubgraphTestResultIsStale,
    ])

    const handlePinnedInputDraftChange = useCallback(
        (nodeId: string, targetInput: string, nextValue: string) => {
            if (isLiveRunActive) {
                setSubgraphTestPanelErrorMessage(LIVE_RUN_LOCK_MESSAGE)
                return
            }

            updateWorkflowSidecarNodeAssets(nodeId, previous => {
                const nextPinnedInputs = { ...(previous.pinnedInputs || {}) }
                const parsedValue = parsePinnedInputDraft(nextValue)

                if (typeof parsedValue === 'undefined') {
                    delete nextPinnedInputs[targetInput]
                } else {
                    nextPinnedInputs[targetInput] = parsedValue
                }

                return {
                    ...previous,
                    pinnedInputs: nextPinnedInputs,
                }
            })

            onGraphPersistedChanged()
            markSubgraphTestResultStale(nodeId)
            clearSubgraphTestFeedback()
        },
        [
            isLiveRunActive,
            updateWorkflowSidecarNodeAssets,
            onGraphPersistedChanged,
            markSubgraphTestResultStale,
            clearSubgraphTestFeedback,
        ]
    )

    const handleRunSelectedSubgraphTest = useCallback(async () => {
        if (isLiveRunActive) {
            setSubgraphTestPanelErrorMessage(LIVE_RUN_LOCK_MESSAGE)
            return
        }

        if (!selectedNode) {
            return
        }

        const mergedSubgraphTestState = buildMergedSubgraphTestState({
            baseState: subgraphTestState || {},
            effectiveItems: effectiveSubgraphTestInputItems,
        })

        clearSubgraphTestFeedback()

        const result = await handleRunSubgraphTest(
            activeCanvasId,
            nodes,
            edges,
            contextLinks,
            selectedNode.id,
            mergedSubgraphTestState
        )

        if (result.errorMessage) {
            setSubgraphTestPanelErrorMessage(result.errorMessage)
            return
        }

        if (!result.subgraphTestResult) {
            setSubgraphTestPanelErrorMessage('Subgraph test failed')
            return
        }

        clearPageError()
        clearSubgraphTestResultStale(selectedNode.id)

        if (result.subgraphTestResult.status === 'failed') {
            setSubgraphTestInfoMessage('Subgraph test finished with failure state.')
            setSubgraphTestPanelErrorMessage(
                result.subgraphTestResult.error_message || 'Subgraph test failed'
            )
            return
        }

        setSubgraphTestInfoMessage('Subgraph test completed.')
    }, [
        isLiveRunActive,
        selectedNode,
        subgraphTestState,
        effectiveSubgraphTestInputItems,
        handleRunSubgraphTest,
        activeCanvasId,
        nodes,
        edges,
        contextLinks,
        clearSubgraphTestFeedback,
        clearPageError,
        clearSubgraphTestResultStale,
    ])

    const handleClearSelectedSubgraphTestResult = useCallback(() => {
        if (isLiveRunActive) {
            setSubgraphTestPanelErrorMessage(LIVE_RUN_LOCK_MESSAGE)
            return
        }

        if (!selectedNode) {
            return
        }

        clearSubgraphTestResult(selectedNode.id)
        clearSubgraphTestResultStale(selectedNode.id)
        clearSubgraphTestFeedback()
        clearPageError()
        setSubgraphTestInfoMessage('Current cached subgraph test result was cleared.')
    }, [
        isLiveRunActive,
        selectedNode,
        clearSubgraphTestResult,
        clearSubgraphTestResultStale,
        clearSubgraphTestFeedback,
        clearPageError,
    ])

    const handleResetSubgraphTestReusableContext = useCallback(() => {
        if (isLiveRunActive) {
            setSubgraphTestPanelErrorMessage(LIVE_RUN_LOCK_MESSAGE)
            return
        }

        resetSubgraphTestState()
        clearSubgraphTestFeedback()
        clearPageError()
        setSubgraphTestInfoMessage(
            'Reusable subgraph test state was cleared. Cached subgraph test results were kept.'
        )
    }, [
        isLiveRunActive,
        resetSubgraphTestState,
        clearSubgraphTestFeedback,
        clearPageError,
    ])

    useEffect(() => {
        if (!requestedSubgraphTestNodeId) {
            return
        }

        selectNodeById(requestedSubgraphTestNodeId)
        setRequestedSubgraphTestNodeId(null)
    }, [
        requestedSubgraphTestNodeId,
        selectNodeById,
        setRequestedSubgraphTestNodeId,
    ])

    useEffect(() => {
        const validNodeIds = nodes.map(node => node.id)
        pruneSubgraphTestArtifacts(validNodeIds)
        pruneWorkflowSidecar(validNodeIds)
    }, [nodes, pruneSubgraphTestArtifacts, pruneWorkflowSidecar])

    useEffect(() => {
        clearSubgraphTestFeedback()
    }, [selectedNode?.id, clearSubgraphTestFeedback])

    useEffect(() => {
        const currentSnapshot: SemanticGraphSnapshot = {
            nodes,
            edges,
            contextLinks,
        }

        if (graphSemanticVersion === 0) {
            semanticGraphSnapshotRef.current = currentSnapshot
            return
        }

        const previousSnapshot = semanticGraphSnapshotRef.current
        semanticGraphSnapshotRef.current = currentSnapshot

        if (!previousSnapshot) {
            return
        }

        const storedSubgraphTestStartNodeIds = Object.keys(
            subgraphTestResultsByNodeId || {}
        )
        const hasReusableSubgraphTestState =
            Object.keys(subgraphTestState || {}).length > 0 ||
            Boolean(lastSuccessfulSubgraphTestStartNodeId) ||
            Boolean(activeSubgraphTestResult)

        if (
            storedSubgraphTestStartNodeIds.length === 0 &&
            !hasReusableSubgraphTestState
        ) {
            return
        }

        const staleNodeIds = storedSubgraphTestStartNodeIds.filter(nodeId =>
            shouldInvalidateSubgraphTestContextForSemanticChange({
                previousSnapshot,
                nextSnapshot: currentSnapshot,
                anchorNodeId: nodeId,
            })
        )

        if (staleNodeIds.length === 0) {
            return
        }

        staleNodeIds.forEach(nodeId => {
            markSubgraphTestResultStale(nodeId)
        })

        const reusableContextAnchorNodeId =
            lastSuccessfulSubgraphTestStartNodeId ||
            activeSubgraphTestStartNodeId ||
            null

        const shouldResetReusableContext =
            hasReusableSubgraphTestState &&
            reusableContextAnchorNodeId !== null &&
            staleNodeIds.includes(reusableContextAnchorNodeId)

        if (!shouldResetReusableContext) {
            return
        }

        resetSubgraphTestState()
        setSubgraphTestPanelErrorMessage('')
        setSubgraphTestInfoMessage(
            'Reusable subgraph test state was cleared because upstream graph semantics changed. Existing cached test results were kept and marked as stale where affected.'
        )
    }, [
        graphSemanticVersion,
        nodes,
        edges,
        contextLinks,
        subgraphTestResultsByNodeId,
        subgraphTestState,
        activeSubgraphTestResult,
        activeSubgraphTestStartNodeId,
        lastSuccessfulSubgraphTestStartNodeId,
        markSubgraphTestResultStale,
        resetSubgraphTestState,
    ])

    return {
        isSubgraphTestPanelExpanded,
        setIsSubgraphTestPanelExpanded,
        requestSubgraphTestFromCanvas,
        resetSubgraphTestPanelView,
        commitSemanticGraphSnapshot,

        subgraphTestPanelErrorMessage,
        subgraphTestInfoMessage,
        clearSubgraphTestFeedback,

        effectiveSubgraphTestInputItems,
        currentPinnedInputDraftTexts,
        selectedSubgraphTestDisplayRun,

        handlePinnedInputDraftChange,
        handleRunSelectedSubgraphTest,
        handleClearSelectedSubgraphTestResult,
        handleResetSubgraphTestReusableContext,

        isSubgraphTestLocked: isLiveRunActive,
    }
}