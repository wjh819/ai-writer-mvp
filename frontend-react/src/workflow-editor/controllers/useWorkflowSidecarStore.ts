import { useCallback, useState } from 'react'

import type {
    WorkflowSidecarData,
    WorkflowSidecarNodeAssets,
} from '../workflowEditorUiTypes'

function buildEmptyWorkflowSidecarNodeAssets(): WorkflowSidecarNodeAssets {
    return {
        pinnedInputs: {},
        pinnedPromptContext: null,
        metadata: {},
    }
}

function buildEmptyWorkflowSidecar(): WorkflowSidecarData {
    return {
        nodes: {},
    }
}

export function useWorkflowSidecarStore() {
    const [workflowSidecar, setWorkflowSidecar] = useState<WorkflowSidecarData>(
        buildEmptyWorkflowSidecar()
    )

    const replaceWorkflowSidecar = useCallback(
        (nextSidecar: WorkflowSidecarData) => {
            setWorkflowSidecar(nextSidecar)
        },
        []
    )

    const resetWorkflowSidecar = useCallback(() => {
        setWorkflowSidecar(buildEmptyWorkflowSidecar())
    }, [])

    const getWorkflowSidecarNodeAssets = useCallback(
        (nodeId: string): WorkflowSidecarNodeAssets => {
            const normalizedNodeId = nodeId.trim()
            if (!normalizedNodeId) {
                return buildEmptyWorkflowSidecarNodeAssets()
            }

            return (
                workflowSidecar.nodes[normalizedNodeId] ||
                buildEmptyWorkflowSidecarNodeAssets()
            )
        },
        [workflowSidecar]
    )

    const setWorkflowSidecarNodeAssets = useCallback(
        (nodeId: string, nextAssets: WorkflowSidecarNodeAssets | null) => {
            const normalizedNodeId = nodeId.trim()
            if (!normalizedNodeId) {
                return
            }

            setWorkflowSidecar(previous => {
                if (nextAssets === null) {
                    if (!previous.nodes[normalizedNodeId]) {
                        return previous
                    }

                    const nextNodes = { ...previous.nodes }
                    delete nextNodes[normalizedNodeId]
                    return { nodes: nextNodes }
                }

                return {
                    nodes: {
                        ...previous.nodes,
                        [normalizedNodeId]: nextAssets,
                    },
                }
            })
        },
        []
    )

    const updateWorkflowSidecarNodeAssets = useCallback(
        (
            nodeId: string,
            updater: (previous: WorkflowSidecarNodeAssets) => WorkflowSidecarNodeAssets
        ) => {
            const normalizedNodeId = nodeId.trim()
            if (!normalizedNodeId) {
                return
            }

            setWorkflowSidecar(previous => {
                const previousAssets =
                    previous.nodes[normalizedNodeId] ||
                    buildEmptyWorkflowSidecarNodeAssets()
                const nextAssets = updater(previousAssets)

                return {
                    nodes: {
                        ...previous.nodes,
                        [normalizedNodeId]: nextAssets,
                    },
                }
            })
        },
        []
    )

    const pruneWorkflowSidecar = useCallback((validNodeIds: string[]) => {
        const validNodeIdSet = new Set(
            (validNodeIds || []).map(nodeId => nodeId.trim()).filter(Boolean)
        )

        setWorkflowSidecar(previous => {
            let changed = false
            const nextNodes: WorkflowSidecarData['nodes'] = {}

            Object.entries(previous.nodes || {}).forEach(([nodeId, assets]) => {
                if (!validNodeIdSet.has(nodeId)) {
                    changed = true
                    return
                }

                nextNodes[nodeId] = assets
            })

            return changed ? { nodes: nextNodes } : previous
        })
    }, [])

    return {
        workflowSidecar,
        replaceWorkflowSidecar,
        resetWorkflowSidecar,
        getWorkflowSidecarNodeAssets,
        setWorkflowSidecarNodeAssets,
        updateWorkflowSidecarNodeAssets,
        pruneWorkflowSidecar,
    }
}