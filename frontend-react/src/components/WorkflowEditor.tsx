import 'reactflow/dist/style.css'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'

import { useWorkflowGraphEditor } from '../workflow-editor/controllers/useWorkflowGraphEditor'
import { useWorkflowRuntime } from '../workflow-editor/controllers/useWorkflowRuntime'
import type {
  WorkflowEditorEdge,
  WorkflowEditorNode,
} from '../workflow-editor/workflowEditorGraphTypes'
import { getRunInputKey } from '../workflow-editor/state/workflowEditorRunInputs'
import type { WorkflowContextLink } from '../workflow-editor/workflowEditorTypes'
import type { WorkflowSidecarData } from '../workflow-editor/workflowEditorUiTypes'

import NodeConfigPanel from './NodeConfigPanel'
import WorkflowModelResourcePanel from './WorkflowModelResourcePanel'
import WorkflowNode from './WorkflowNode'
import WorkflowSelectionBar from './WorkflowSelectionBar'
import WorkflowSidebar from './WorkflowSidebar'
import RunResultPanel from './run/RunResultPanel'
import { buildDisplayRunFromLiveSnapshot } from './run/runDisplayMappers'
import WorkflowDialogs from './workflow-page/WorkflowDialogs'
import WorkflowPageBanners from './workflow-page/WorkflowPageBanners'
import { useBatchRunContext } from './workflow-page/useBatchRunContext'
import { useCanvasLifecycle } from './workflow-page/useCanvasLifecycle'
import { useLiveRunContext } from './workflow-page/useLiveRunContext'
import { useWorkflowPageContext } from './workflow-page/useWorkflowPageContext'
import { useWorkflowRunContext } from './workflow-page/useWorkflowRunContext'
import { useWorkflowSubgraphTestPanel } from './workflow-page/useWorkflowSubgraphTestPanel'

const DEFAULT_CANVAS_ID = 'article'

const EMPTY_WORKFLOW_SIDECAR: WorkflowSidecarData = {
  nodes: {},
}

const nodeTypes = {
  workflowNode: WorkflowNode,
}

function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }

  return String(value).trim()
}

export default function WorkflowEditor() {
  const {
    requestedCanvasId,
    setRequestedCanvasId,
    activeCanvasId,
    setActiveCanvasId,
    activeWorkflowContextId,
    setActiveWorkflowContextId,
    temporaryCanvasId,
    setTemporaryCanvasId,

    graphSemanticVersion,
    setGraphSemanticVersion,
    handleGraphSemanticChanged,

    graphPersistedVersion,
    setGraphPersistedVersion,
    handleGraphPersistedChanged,

    setCommittedGraphPersistedVersion,
    isGraphDirty,

    workflowWarnings,
    setWorkflowWarnings,

    isModelResourcePanelOpen,
    setIsModelResourcePanelOpen,

    pageErrorMessage,
    setPageErrorMessage,
    clearPageError,

    isSwitchingWorkflow,
    setIsSwitchingWorkflow,
  } = useWorkflowPageContext(DEFAULT_CANVAS_ID)

  const [isSubgraphTestPanelExpanded, setIsSubgraphTestPanelExpanded] =
    useState(false)
  const [requestedSubgraphTestNodeId, setRequestedSubgraphTestNodeId] =
    useState<string | null>(null)

  const [batchInputText, setBatchInputText] = useState('')
  const [batchMaxParallel, setBatchMaxParallel] = useState(4)

  const {
    canvasList,

    modelResources,
    runInputs,

    workflowSidecar,
    replaceWorkflowSidecar,
    getWorkflowSidecarNodeAssets,
    updateWorkflowSidecarNodeAssets,
    pruneWorkflowSidecar,

    isSaving,
    isRunning,
    isDeleting,
    isLoadingWorkflow,
    bootstrapErrorMessage,

    updateRunInput,
    refreshWorkflowList,
    refreshModelResources,
    loadCurrentWorkflow,
    handleSave,
    handleRun,
    handleDeleteCanvas,
    syncRunInputs,
    resetRunInputContext,

    subgraphTestState,
    activeSubgraphTestResult,
    activeSubgraphTestStartNodeId,
    subgraphTestResultsByNodeId,
    staleSubgraphTestResultIds,
    runningSubgraphTestNodeId,
    lastSuccessfulSubgraphTestStartNodeId,

    markSubgraphTestResultStale,
    clearSubgraphTestResultStale,
    handleRunSubgraphTest,
    clearSubgraphTestResult,
    pruneSubgraphTestArtifacts,
    resetSubgraphTestState,
    resetSubgraphTestContext,

    handleStartLiveRun,
    handleFetchActiveLiveRun,

    handleStartBatchRun,
    handleFetchBatchSummary,
    handleFetchBatchItemDetail,
    handleCancelBatchRun,
  } = useWorkflowRuntime()

  const {
    runContext,
    clearRunState,
    displayRun,
    commitFinalRunResult,
  } = useWorkflowRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleRun,
  })

  const {
    liveRunSnapshot,
    isLiveRunActive,
    isGraphEditingLocked: isLiveRunGraphEditingLocked,
    lastPollErrorMessage,
    clearLiveRunState,
    startLiveRun,
  } = useLiveRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleStartLiveRun,
    handleFetchActiveLiveRun,
    commitFinalRunResult,
  })

  const {
    batchSummary,
    selectedBatchItemId,
    selectedBatchDisplayRun,
    isBatchRunActive,
    isBatchResultStale,
    isBatchCancelRequested,
    lastPollErrorMessage: batchLastPollErrorMessage,
    clearBatchRunState,
    startBatchRun,
    selectBatchItem,
    cancelBatchRun,
  } = useBatchRunContext({
    activeCanvasId,
    activeWorkflowContextId,
    graphSemanticVersion,
    clearPageError,
    handleStartBatchRun,
    handleFetchBatchSummary,
    handleFetchBatchItemDetail,
    handleCancelBatchRun,
  })

  const isGraphEditingLocked =
    isLiveRunGraphEditingLocked || isBatchRunActive

  const activeLiveRunSnapshot = isLiveRunActive ? liveRunSnapshot : null

  const requestSubgraphTestFromCanvas = useCallback(
    (nodeId: string) => {
      if (isLiveRunActive || isBatchRunActive) {
        setPageErrorMessage(
          'Node test is disabled while a full run or batch run is active.'
        )
        return
      }

      setRequestedSubgraphTestNodeId(nodeId)
      setIsSubgraphTestPanelExpanded(true)
      clearPageError()
    },
    [
      isLiveRunActive,
      isBatchRunActive,
      setPageErrorMessage,
      clearPageError,
    ]
  )

  const graph = useWorkflowGraphEditor({
    runResult:
      runContext?.workflowContextId === activeWorkflowContextId
        ? runContext.runResult
        : null,
    onGraphSemanticChanged: handleGraphSemanticChanged,
    onGraphPersistedChanged: handleGraphPersistedChanged,
    onGraphError: setPageErrorMessage,
    onGraphClearError: clearPageError,
    onRequestSubgraphTest: requestSubgraphTestFromCanvas,
    runningSubgraphTestNodeId,
    isGraphEditingLocked,
    liveRunSnapshot: activeLiveRunSnapshot,
  })

  const {
    nodes,
    edges,
    contextLinks,
    selectedNode,
    selectedEdgeId,
    selectedContextEdge,
    inputNodes,
    displayNodes,
    displayEdges,
    pendingBindingRequest,
    confirmPendingBinding,
    cancelPendingBinding,
    onNodesChange,
    onConnect,
    handleEdgesChange,
    addNodeByType,
    updateNode,
    deleteNode,
    deleteSelectedEdge,
    deleteSelectedContextLink,
    updateSelectedContextLinkMode,
    handleEdgeClick,
    handlePaneClick,
    handleNodeClick,
    handleSelectionChange,
    replaceGraph,
    selectNodeById,
  } = graph

  const selectedDisplayNode = useMemo(() => {
    if (!selectedNode) {
      return null
    }

    return displayNodes.find(node => node.id === selectedNode.id) || null
  }, [selectedNode, displayNodes])

  const {
    subgraphTestPanelErrorMessage,
    subgraphTestInfoMessage,
    effectiveSubgraphTestInputItems,
    currentPinnedInputDraftTexts,
    selectedSubgraphTestDisplayRun,
    handlePinnedInputDraftChange,
    handleRunSelectedSubgraphTest,
    handleClearSelectedSubgraphTestResult,
    handleResetSubgraphTestReusableContext,
    resetSubgraphTestPanelView,
    commitSemanticGraphSnapshot,
  } = useWorkflowSubgraphTestPanel({
    activeCanvasId,
    graphSemanticVersion,

    nodes,
    edges,
    contextLinks,
    selectedNode,
    selectedDisplayNode,

    requestedSubgraphTestNodeId,
    setRequestedSubgraphTestNodeId,
    isSubgraphTestPanelExpanded,
    setIsSubgraphTestPanelExpanded,

    clearPageError,
    onGraphPersistedChanged: handleGraphPersistedChanged,
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
    isLiveRunActive: isLiveRunActive || isBatchRunActive,
  })

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
      resetSubgraphTestContext()
      commitSemanticGraphSnapshot(nextNodes, nextEdges, nextContextLinks)
      resetSubgraphTestPanelView()
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
      resetSubgraphTestContext,
      commitSemanticGraphSnapshot,
      resetSubgraphTestPanelView,
      setGraphSemanticVersion,
      setGraphPersistedVersion,
      setCommittedGraphPersistedVersion,
      clearLiveRunState,
      clearBatchRunState,
      clearRunState,
    ]
  )

  const {
    isCreateCanvasDialogOpen,
    draftCanvasId,
    createCanvasErrorMessage,
    handleDraftCanvasIdChange,
    openCreateCanvasDialog,
    closeCreateCanvasDialog,
    confirmCreateCanvas,

    requestCanvasChange,
    handleRefreshWorkflowList,
    handleDeleteCurrentCanvas,
    handleSaveWorkflow,
    handleRevertToSaved,

    isActiveCanvasTemporary,
    canDeleteCurrentCanvas,
    workflowStatusMessage,
    temporaryCanvasStatusMessage,
  } = useCanvasLifecycle({
    requestedCanvasId,
    setRequestedCanvasId,
    activeCanvasId,
    setActiveCanvasId,
    setActiveWorkflowContextId,
    temporaryCanvasId,
    setTemporaryCanvasId,

    canvasList,
    nodes,
    edges,
    contextLinks,
    workflowSidecar,

    graphPersistedVersion,
    isGraphDirty,

    clearPageError,
    setPageErrorMessage,
    setWorkflowWarnings,
    setIsSwitchingWorkflow,
    setCommittedGraphPersistedVersion,

    loadCurrentWorkflow,
    refreshWorkflowList,
    handleDeleteCanvas,
    handleSave,

    resetGraphSideEffectsForCommittedWorkflow,

    isGraphEditingLocked,
  })

  useEffect(() => {
    syncRunInputs(inputNodes)
  }, [inputNodes, syncRunInputs])

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) {
      return null
    }

    return edges.find(edge => edge.id === selectedEdgeId) || null
  }, [edges, selectedEdgeId])

  const liveDisplayRun = useMemo(() => {
    if (!activeLiveRunSnapshot) {
      return null
    }

    return buildDisplayRunFromLiveSnapshot(activeLiveRunSnapshot)
  }, [activeLiveRunSnapshot])

  const effectiveDisplayRun = useMemo(() => {
    if (liveDisplayRun) {
      return liveDisplayRun
    }

    if (selectedBatchDisplayRun) {
      return selectedBatchDisplayRun
    }

    if (batchSummary) {
      return null
    }

    return displayRun
  }, [liveDisplayRun, selectedBatchDisplayRun, batchSummary, displayRun])

  const hasAnyNodes = nodes.length > 0
  const hasBatchResult = Boolean(batchSummary)
  const hasAnyRunArtifact = Boolean(effectiveDisplayRun || batchSummary)

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

  const workflowWarningsMessage = useMemo(() => {
    if (!workflowWarnings.length) {
      return ''
    }

    return workflowWarnings
      .map(warning => {
        const suffix = warning.nodeId ? ` [${warning.nodeId}]` : ''
        return `${warning.code}${suffix}: ${warning.message}`
      })
      .join('\n')
  }, [workflowWarnings])

  const topLevelErrorMessage = [
    bootstrapErrorMessage,
    pageErrorMessage,
    lastPollErrorMessage,
    batchLastPollErrorMessage,
  ]
    .filter(Boolean)
    .join('\n')

  const draftStatusMessage = useMemo(() => {
    if (!isGraphDirty) {
      return ''
    }

    if (pageErrorMessage) {
      return 'Current canvas still contains unsaved draft changes. Save again after fixing errors, or revert to the last saved canvas.'
    }

    return 'Current canvas contains unsaved draft changes.'
  }, [isGraphDirty, pageErrorMessage])

  const activeRunStatusMessage = useMemo(() => {
    if (isLiveRunActive) {
      if (!activeLiveRunSnapshot) {
        return 'Live run is starting...'
      }

      const activeNodeId = trim(activeLiveRunSnapshot.active_node_id)
      return activeNodeId
        ? `Live run is in progress. Active node: ${activeNodeId}`
        : 'Live run is in progress.'
    }

    if (batchSummary) {
      const completedCount =
        batchSummary.succeeded + batchSummary.failed + batchSummary.cancelled

      const staleSuffix = isBatchResultStale ? ' (stale)' : ''

      if (batchSummary.status === 'running' && isBatchCancelRequested) {
        return `Batch cancellation requested. Running items will finish naturally. Completed ${completedCount} / ${batchSummary.total}.${staleSuffix}`
      }

      return `Batch run status: ${batchSummary.status}. Completed ${completedCount} / ${batchSummary.total}.${staleSuffix}`
    }

    return ''
  }, [
    isLiveRunActive,
    activeLiveRunSnapshot,
    batchSummary,
    isBatchResultStale,
    isBatchCancelRequested,
  ])

  const selectedBatchSummaryItem = useMemo(() => {
    if (!batchSummary || !selectedBatchItemId) {
      return null
    }

    return (
      batchSummary.items.find(item => item.item_id === selectedBatchItemId) ||
      null
    )
  }, [batchSummary, selectedBatchItemId])

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <WorkflowSidebar
        requestedCanvasId={requestedCanvasId}
        activeCanvasId={activeCanvasId}
        canvasList={canvasList}
        temporaryCanvasId={temporaryCanvasId}
        modelResources={modelResources}
        isSwitchingWorkflow={isSwitchingWorkflow}
        isGraphEditingLocked={isGraphEditingLocked}
        isLiveRunActive={isLiveRunActive}
        isBatchRunActive={isBatchRunActive}
        isBatchCancelRequested={isBatchCancelRequested}
        onRequestCanvasChange={requestCanvasChange}
        onRefreshWorkflowList={handleRefreshWorkflowList}
        onOpenCreateCanvas={openCreateCanvasDialog}
        onDeleteCurrentCanvas={handleDeleteCurrentCanvas}
        onAddNodeByType={addNodeByType}
        inputNodes={inputNodes}
        runInputs={runInputs}
        onRunInputChange={updateRunInput}
        batchInputText={batchInputText}
        onBatchInputTextChange={setBatchInputText}
        batchMaxParallel={batchMaxParallel}
        onBatchMaxParallelChange={value =>
          setBatchMaxParallel(Math.min(4, Math.max(1, value || 1)))
        }
        onSave={handleSaveWorkflow}
        onRun={handleRunWorkflow}
        onRunBatch={handleRunBatchWorkflow}
        onCancelBatch={handleCancelBatchWorkflow}
        onClearRunState={() => {
          clearLiveRunState()
          clearBatchRunState()
          clearRunState()
        }}
        onOpenModelResources={() => setIsModelResourcePanelOpen(true)}
        isSaving={isSaving}
        isRunning={isRunning || isLiveRunActive || isBatchRunActive}
        isDeleting={isDeleting}
        hasRunResult={Boolean(effectiveDisplayRun)}
        hasBatchResult={hasBatchResult}
        hasAnyNodes={hasAnyNodes}
        canDeleteCurrentCanvas={canDeleteCurrentCanvas}
        getRunInputKey={getRunInputKey}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <WorkflowPageBanners
          workflowStatusMessage={
            isSwitchingWorkflow && requestedCanvasId !== activeCanvasId
              ? workflowStatusMessage
              : ''
          }
          temporaryCanvasStatusMessage={temporaryCanvasStatusMessage}
          topLevelErrorMessage={topLevelErrorMessage}
          workflowWarningsMessage={workflowWarningsMessage}
          draftStatusMessage={draftStatusMessage}
          onRevertToSaved={handleRevertToSaved}
          disableRevertToSaved={
            isSaving ||
            isSwitchingWorkflow ||
            isDeleting ||
            isActiveCanvasTemporary ||
            isLiveRunActive ||
            isBatchRunActive
          }
          revertToSavedTitle={
            isActiveCanvasTemporary
              ? 'Unsaved blank canvases do not have a saved version yet'
              : undefined
          }
          liveRunStatusMessage={activeRunStatusMessage}
        />

        <WorkflowSelectionBar
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          selectedContextEdge={selectedContextEdge}
          isLoadingWorkflow={isSwitchingWorkflow || isLoadingWorkflow}
          isGraphEditingLocked={isGraphEditingLocked}
          onDeleteSelectedEdge={deleteSelectedEdge}
          onDeleteSelectedContextEdge={deleteSelectedContextLink}
          onSetSelectedContextEdgeMode={updateSelectedContextLinkMode}
        />

        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onNodeClick={handleNodeClick}
            onSelectionChange={handleSelectionChange}
            deleteKeyCode={null}
            elementsSelectable
            edgesFocusable
            nodesFocusable
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        {batchSummary ? (
          <div
            style={{
              borderTop: '1px solid #ddd',
              padding: 12,
              maxHeight: 260,
              overflow: 'auto',
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <strong>Batch Summary</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Status: {batchSummary.status}
                  {isBatchResultStale ? ' · stale' : ''}
                </div>
                {batchSummary.status === 'running' && isBatchCancelRequested ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#92400e',
                      marginTop: 6,
                    }}
                  >
                    Cancellation requested. Running items will finish naturally.
                  </div>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
                <div>Total: {batchSummary.total}</div>
                <div>Queued: {batchSummary.queued}</div>
                <div>Running: {batchSummary.running}</div>
                <div>Succeeded: {batchSummary.succeeded}</div>
                <div>Failed: {batchSummary.failed}</div>
                <div>Cancelled: {batchSummary.cancelled}</div>
                <div>
                  Completed:{' '}
                  {batchSummary.succeeded +
                    batchSummary.failed +
                    batchSummary.cancelled}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {batchSummary.items.map(item => {
                const isSelected = item.item_id === selectedBatchItemId
                return (
                  <button
                    key={item.item_id}
                    type='button'
                    onClick={() => {
                      void selectBatchItem(item.item_id)
                    }}
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      border: '1px solid #ddd',
                      background: isSelected ? '#eef6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <strong>#{item.index + 1}</strong> · {item.status}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {item.error_message || item.error_type || 'No error'}
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedBatchSummaryItem ? (
              <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                Selected item: #{selectedBatchSummaryItem.index + 1} ·{' '}
                {selectedBatchSummaryItem.status}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasAnyRunArtifact ? (
          <RunResultPanel displayRun={effectiveDisplayRun} />
        ) : (
          <RunResultPanel displayRun={null} />
        )}
      </div>

      <div
        style={{
          width: 360,
          borderLeft: '1px solid #ddd',
          background: '#fafafa',
          overflow: 'auto',
        }}
      >
        <NodeConfigPanel
          node={selectedNode}
          derivedTargetInputs={
            selectedDisplayNode?.data.derivedTargetInputs ?? []
          }
          inboundBindings={selectedDisplayNode?.data.inboundBindings ?? []}
          promptVariableHints={
            selectedDisplayNode?.data.promptVariableHints ?? []
          }
          graphWindowMode={selectedDisplayNode?.data.graphWindowMode}
          graphWindowSourceNodeId={
            selectedDisplayNode?.data.graphWindowSourceNodeId
          }
          graphWindowTargetNodeIds={
            selectedDisplayNode?.data.graphWindowTargetNodeIds ?? []
          }
          isSubgraphTestRunning={Boolean(
            selectedDisplayNode?.data.isSubgraphTestRunning
          )}
          isGraphEditingLocked={isGraphEditingLocked}
          isNodeTestLocked={isLiveRunActive || isBatchRunActive}
          onChange={updateNode}
          onDelete={deleteNode}
          modelResources={modelResources}
          pinnedInputDraftTexts={currentPinnedInputDraftTexts}
          onPinnedInputDraftChange={handlePinnedInputDraftChange}
          isSubgraphTestExpanded={isSubgraphTestPanelExpanded}
          onSetSubgraphTestExpanded={setIsSubgraphTestPanelExpanded}
          effectiveSubgraphTestInputItems={effectiveSubgraphTestInputItems}
          onRunSubgraphTest={handleRunSelectedSubgraphTest}
          onClearSubgraphTestResult={handleClearSelectedSubgraphTestResult}
          onResetSubgraphTestContext={handleResetSubgraphTestReusableContext}
          selectedSubgraphTestDisplayRun={selectedSubgraphTestDisplayRun}
          subgraphTestErrorMessage={subgraphTestPanelErrorMessage}
          subgraphTestInfoMessage={subgraphTestInfoMessage}
        />
      </div>

      {isModelResourcePanelOpen && (
        <WorkflowModelResourcePanel
          modelResources={modelResources}
          onClose={() => setIsModelResourcePanelOpen(false)}
          onResourcesChanged={async () => {
            const result = await refreshModelResources()
            if (result.errorMessage) {
              setPageErrorMessage(result.errorMessage)
              throw new Error(result.errorMessage)
            }
          }}
        />
      )}

      <WorkflowDialogs
        isCreateCanvasDialogOpen={isCreateCanvasDialogOpen}
        draftCanvasId={draftCanvasId}
        createCanvasErrorMessage={createCanvasErrorMessage}
        onDraftCanvasIdChange={handleDraftCanvasIdChange}
        onCloseCreateCanvasDialog={closeCreateCanvasDialog}
        onConfirmCreateCanvas={confirmCreateCanvas}
        pendingBindingRequest={pendingBindingRequest}
        onCancelPendingBinding={cancelPendingBinding}
        onConfirmPendingBinding={confirmPendingBinding}
        isGraphEditingLocked={isGraphEditingLocked}
      />
    </div>
  )
}