import { useEffect } from 'react'

import type { WorkflowEditorNode } from '../../../workflow-editor/workflowEditorGraphTypes'

interface UseSubgraphTestPanelLifecycleOptions {
  nodes: WorkflowEditorNode[]
  selectedNodeId: string | null
  pruneSubgraphTestArtifacts: (validNodeIds: string[]) => void
  pruneWorkflowSidecar: (validNodeIds: string[]) => void
  clearSubgraphTestFeedback: () => void
}

export function useSubgraphTestPanelLifecycle({
  nodes,
  selectedNodeId,
  pruneSubgraphTestArtifacts,
  pruneWorkflowSidecar,
  clearSubgraphTestFeedback,
}: UseSubgraphTestPanelLifecycleOptions) {
  useEffect(() => {
    const validNodeIds = nodes.map(node => node.id)
    pruneSubgraphTestArtifacts(validNodeIds)
    pruneWorkflowSidecar(validNodeIds)
  }, [nodes, pruneSubgraphTestArtifacts, pruneWorkflowSidecar])

  useEffect(() => {
    clearSubgraphTestFeedback()
  }, [selectedNodeId, clearSubgraphTestFeedback])
}

