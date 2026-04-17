import { useCallback, useEffect } from 'react'

import type { WorkflowState } from '../../shared/workflowSharedTypes'
import type { WorkflowRuntimeState } from '../../workflow-editor/controllers/useWorkflowRuntime'
import { getRunInputKey } from '../../workflow-editor/state/workflowEditorRunInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'

type RunSectionRuntimeBindings = Pick<
  WorkflowRuntimeState['runInputs'],
  'runInputs' | 'syncRunInputs'
>

interface UseWorkflowEditorRunSectionOptions {
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  inputNodes: WorkflowEditorNode[]
  runtime: RunSectionRuntimeBindings
  batchInputText: string
  batchMaxParallel: number
  setPageErrorMessage: (message: string) => void
  startLiveRun: (
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    runInputs: WorkflowState
  ) => Promise<{ liveRunStart?: unknown; errorMessage?: string }>
  startBatchRun: (
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[],
    inputValues: string[],
    inputKey: string,
    maxParallel: number
  ) => Promise<{ batchSummary?: unknown; errorMessage?: string } | null>
  cancelBatchRun: () => Promise<{ errorMessage?: string } | null | undefined>
}

export function useWorkflowEditorRunSection({
  nodes,
  edges,
  contextLinks,
  inputNodes,
  runtime,
  batchInputText,
  batchMaxParallel,
  setPageErrorMessage,
  startLiveRun,
  startBatchRun,
  cancelBatchRun,
}: UseWorkflowEditorRunSectionOptions) {
  const { runInputs, syncRunInputs } = runtime

  useEffect(() => {
    syncRunInputs(inputNodes)
  }, [inputNodes, syncRunInputs])

  const handleRunWorkflow = useCallback(async () => {
    const result = await startLiveRun(nodes, edges, contextLinks, runInputs)

    if (!result.liveRunStart) {
      setPageErrorMessage(result.errorMessage || 'Live run failed to start')
    }
  }, [
    startLiveRun,
    nodes,
    edges,
    contextLinks,
    runInputs,
    setPageErrorMessage,
  ])

  const handleRunBatchWorkflow = useCallback(async () => {
    if (inputNodes.length !== 1) {
      setPageErrorMessage(
        'Batch run currently requires exactly one input node.'
      )
      return
    }

    const inputKey = getRunInputKey(inputNodes[0])
    const inputValues = batchInputText
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean)

    if (!inputKey) {
      setPageErrorMessage(
        'The single input node must declare a non-empty inputKey.'
      )
      return
    }

    if (!inputValues.length) {
      setPageErrorMessage('Batch input values must not be empty.')
      return
    }

    const result = await startBatchRun(
      nodes,
      edges,
      contextLinks,
      inputValues,
      inputKey,
      batchMaxParallel
    )

    if (!result?.batchSummary) {
      setPageErrorMessage(result?.errorMessage || 'Batch run failed to start')
    }
  }, [
    inputNodes,
    batchInputText,
    batchMaxParallel,
    setPageErrorMessage,
    startBatchRun,
    nodes,
    edges,
    contextLinks,
  ])

  const handleCancelBatchWorkflow = useCallback(async () => {
    const result = await cancelBatchRun()
    if (result && result.errorMessage) {
      setPageErrorMessage(result.errorMessage)
    }
  }, [cancelBatchRun, setPageErrorMessage])

  return {
    actions: {
      handleRunWorkflow,
      handleRunBatchWorkflow,
      handleCancelBatchWorkflow,
    },
  }
}
