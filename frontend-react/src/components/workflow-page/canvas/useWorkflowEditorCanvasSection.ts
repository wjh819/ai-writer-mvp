import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { useCanvasLifecycle } from './useCanvasLifecycle'
import type { WorkflowRuntimeState } from '../../../workflow-editor/controllers/useWorkflowRuntime'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../../workflow-editor/workflowEditorTypes'
import type {
  WorkflowLoadWarning,
  WorkflowSidecarData,
} from '../../../workflow-editor/workflowEditorUiTypes'

const EMPTY_WORKFLOW_SIDECAR: WorkflowSidecarData = {
  nodes: {},
}

interface CanvasSectionRuntimeBindings {
  bootstrap: Pick<WorkflowRuntimeState['bootstrap'], 'canvasList' | 'refreshWorkflowList'>
  persistence: Pick<
    WorkflowRuntimeState['persistence'],
    'loadCurrentWorkflow' | 'handleDeleteCanvas' | 'handleSave'
  >
  sidecar: Pick<
    WorkflowRuntimeState['sidecar'],
    'workflowSidecar' | 'replaceWorkflowSidecar'
  >
  runInputs: Pick<WorkflowRuntimeState['runInputs'], 'resetRunInputContext'>
}

interface UseWorkflowEditorCanvasSectionOptions {
  requestedCanvasId: string
  setRequestedCanvasId: (value: string) => void
  activeCanvasId: string
  setActiveCanvasId: (value: string) => void
  setActiveWorkflowContextId: Dispatch<SetStateAction<number>>
  temporaryCanvasId: string | null
  setTemporaryCanvasId: (value: string | null) => void
  setWorkflowWarnings: (warnings: WorkflowLoadWarning[]) => void
  setPageErrorMessage: (message: string) => void
  clearPageError: () => void
  setIsSwitchingWorkflow: (value: boolean) => void
  setCommittedGraphPersistedVersion: (value: number) => void
  graphPersistedVersion: number
  isGraphDirty: boolean
  runtime: CanvasSectionRuntimeBindings
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
  replaceGraph: (
    nextNodes: WorkflowEditorNode[],
    nextEdges: WorkflowEditorEdge[],
    nextContextLinks: WorkflowContextLink[]
  ) => void
  resetSubgraphTestSectionForCommittedWorkflow: (
    nextNodes: WorkflowEditorNode[],
    nextEdges: WorkflowEditorEdge[],
    nextContextLinks: WorkflowContextLink[]
  ) => void
  setGraphSemanticVersion: (value: number) => void
  setGraphPersistedVersion: (value: number) => void
  clearLiveRunState: () => void
  clearBatchRunState: () => void
  clearRunState: () => void
  setBatchInputText: (value: string) => void
  setBatchMaxParallel: (value: number) => void
  isGraphEditingLocked: boolean
}

export function useWorkflowEditorCanvasSection({
  requestedCanvasId,
  setRequestedCanvasId,
  activeCanvasId,
  setActiveCanvasId,
  setActiveWorkflowContextId,
  temporaryCanvasId,
  setTemporaryCanvasId,
  setWorkflowWarnings,
  setPageErrorMessage,
  clearPageError,
  setIsSwitchingWorkflow,
  setCommittedGraphPersistedVersion,
  graphPersistedVersion,
  isGraphDirty,
  runtime,
  nodes,
  edges,
  contextLinks,
  replaceGraph,
  resetSubgraphTestSectionForCommittedWorkflow,
  setGraphSemanticVersion,
  setGraphPersistedVersion,
  clearLiveRunState,
  clearBatchRunState,
  clearRunState,
  setBatchInputText,
  setBatchMaxParallel,
  isGraphEditingLocked,
}: UseWorkflowEditorCanvasSectionOptions) {
  const { bootstrap, persistence, sidecar, runInputs } = runtime
  const replaceWorkflowSidecar = sidecar.replaceWorkflowSidecar
  const resetRunInputContext = runInputs.resetRunInputContext

  const resetGraphSideEffectsForCommittedWorkflow = useCallback(
    (
      nextNodes: WorkflowEditorNode[],
      nextEdges: WorkflowEditorEdge[],
      nextContextLinks: WorkflowContextLink[],
      nextSidecar: WorkflowSidecarData = EMPTY_WORKFLOW_SIDECAR
    ) => {
      replaceGraph(nextNodes, nextEdges, nextContextLinks)
      replaceWorkflowSidecar(nextSidecar)
      resetRunInputContext()
      resetSubgraphTestSectionForCommittedWorkflow(
        nextNodes,
        nextEdges,
        nextContextLinks
      )
      setGraphSemanticVersion(0)
      setGraphPersistedVersion(0)
      setCommittedGraphPersistedVersion(0)
      clearLiveRunState()
      clearBatchRunState()
      clearRunState()
      setBatchInputText('')
      setBatchMaxParallel(4)
    },
    [
      replaceGraph,
      replaceWorkflowSidecar,
      resetRunInputContext,
      resetSubgraphTestSectionForCommittedWorkflow,
      setGraphSemanticVersion,
      setGraphPersistedVersion,
      setCommittedGraphPersistedVersion,
      clearLiveRunState,
      clearBatchRunState,
      clearRunState,
      setBatchInputText,
      setBatchMaxParallel,
    ]
  )

  const lifecycle = useCanvasLifecycle({
    requestedCanvasId,
    setRequestedCanvasId,
    activeCanvasId,
    setActiveCanvasId,
    setActiveWorkflowContextId,
    temporaryCanvasId,
    setTemporaryCanvasId,
    canvasList: bootstrap.canvasList,
    nodes,
    edges,
    contextLinks,
    workflowSidecar: sidecar.workflowSidecar,
    graphPersistedVersion,
    isGraphDirty,
    clearPageError,
    setPageErrorMessage,
    setWorkflowWarnings,
    setIsSwitchingWorkflow,
    setCommittedGraphPersistedVersion,
    loadCurrentWorkflow: persistence.loadCurrentWorkflow,
    refreshWorkflowList: bootstrap.refreshWorkflowList,
    handleDeleteCanvas: persistence.handleDeleteCanvas,
    handleSave: persistence.handleSave,
    resetGraphSideEffectsForCommittedWorkflow,
    isGraphEditingLocked,
  })

  return lifecycle
}

