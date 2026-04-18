import { useCallback, useMemo } from 'react'

import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import {
  buildEffectiveSubgraphTestInputItems,
  type EffectiveSubgraphTestInputItem,
} from '../../../workflow-editor/state/workflowEditorSubgraphTestInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowSidecarNodeAssets } from '../../../workflow-editor/workflowEditorUiTypes'
import type { SubgraphTestPanelFeedbackBinding } from './subgraphTestPanelTypes'

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
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

interface UseSubgraphPinnedInputsOptions {
  selectedNode: WorkflowEditorNode | null
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  subgraphTestState: WorkflowState
  isNodeTestLocked: boolean
  nodeTestLockMessage: string
  getWorkflowSidecarNodeAssets: (nodeId: string) => WorkflowSidecarNodeAssets
  updateWorkflowSidecarNodeAssets: (
    nodeId: string,
    updater: (previous: WorkflowSidecarNodeAssets) => WorkflowSidecarNodeAssets
  ) => void
  onGraphPersistedChanged: () => void
  markSubgraphTestResultStale: (nodeId: string) => void
  feedback: Pick<SubgraphTestPanelFeedbackBinding, 'clear' | 'setErrorMessage'>
}

export function useSubgraphPinnedInputs({
  selectedNode,
  nodes,
  edges,
  subgraphTestState,
  isNodeTestLocked,
  nodeTestLockMessage,
  getWorkflowSidecarNodeAssets,
  updateWorkflowSidecarNodeAssets,
  onGraphPersistedChanged,
  markSubgraphTestResultStale,
  feedback,
}: UseSubgraphPinnedInputsOptions) {
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
  }, [selectedNode, nodes, edges, subgraphTestState, selectedNodeSidecarAssets])

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

  const handlePinnedInputDraftChange = useCallback(
    (nodeId: string, targetInput: string, nextValue: string) => {
      if (isNodeTestLocked) {
        feedback.setErrorMessage(nodeTestLockMessage)
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
      feedback.clear()
    },
    [
      isNodeTestLocked,
      feedback,
      nodeTestLockMessage,
      updateWorkflowSidecarNodeAssets,
      onGraphPersistedChanged,
      markSubgraphTestResultStale,
    ]
  )

  return {
    selectedNodeSidecarAssets,
    effectiveSubgraphTestInputItems,
    currentPinnedInputDraftTexts,
    handlePinnedInputDraftChange,
  }
}

