import { useCallback, useEffect } from 'react'

import type { WorkflowState } from '../../../shared/workflowSharedTypes'
import type { WorkflowRuntimeState } from '../../../workflow-editor/controllers/useWorkflowRuntime'
import { getRunInputKey } from '../../../workflow-editor/state/workflowEditorRunInputs'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'

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
      setPageErrorMessage(result.errorMessage || '实时运行启动失败')
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
        '当前批处理运行要求且仅允许一个输入节点。'
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
        '该唯一输入节点必须声明非空的 inputKey。'
      )
      return
    }

    if (!inputValues.length) {
      setPageErrorMessage('批处理输入值不能为空。')
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
      setPageErrorMessage(result?.errorMessage || '批处理运行启动失败')
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

