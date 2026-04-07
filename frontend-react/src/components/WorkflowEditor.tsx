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
import WorkflowDialogs from './workflow-page/WorkflowDialogs'
import WorkflowPageBanners from './workflow-page/WorkflowPageBanners'
import { useCanvasLifecycle } from './workflow-page/useCanvasLifecycle'
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

        committedGraphPersistedVersion,
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

    const {
        canvasList,
        prompts,
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
    } = useWorkflowRuntime()

    const {
        runContext,
        clearRunState,
        runResult,
        displayRun,
        hasVisibleRunResult,
        runWorkflow,
    } = useWorkflowRunContext({
        activeCanvasId,
        activeWorkflowContextId,
        graphSemanticVersion,
        clearPageError,
        handleRun,
    })

    const requestSubgraphTestFromCanvas = useCallback(
        (nodeId: string) => {
            setRequestedSubgraphTestNodeId(nodeId)
            setIsSubgraphTestPanelExpanded(true)
            clearPageError()
        },
        [clearPageError]
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
        clearSubgraphTestFeedback,
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
            clearRunState()
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

    const handleRunWorkflow = useCallback(async () => {
        const result = await runWorkflow(nodes, edges, contextLinks, runInputs)

        if (!result.runResult) {
            setPageErrorMessage(result.errorMessage || 'Run failed')
        }
    }, [
        runWorkflow,
        nodes,
        edges,
        contextLinks,
        runInputs,
        setPageErrorMessage,
    ])

    const hasAnyNodes = nodes.length > 0

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

    const topLevelErrorMessage = [bootstrapErrorMessage, pageErrorMessage]
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

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <WorkflowSidebar
                requestedCanvasId={requestedCanvasId}
                activeCanvasId={activeCanvasId}
                canvasList={canvasList}
                temporaryCanvasId={temporaryCanvasId}
                modelResources={modelResources}
                isSwitchingWorkflow={isSwitchingWorkflow}
                onRequestCanvasChange={requestCanvasChange}
                onRefreshWorkflowList={handleRefreshWorkflowList}
                onOpenCreateCanvas={openCreateCanvasDialog}
                onDeleteCurrentCanvas={handleDeleteCurrentCanvas}
                onAddNodeByType={addNodeByType}
                inputNodes={inputNodes}
                runInputs={runInputs}
                onRunInputChange={updateRunInput}
                onSave={handleSaveWorkflow}
                onRun={handleRunWorkflow}
                onClearRunState={clearRunState}
                onOpenModelResources={() => setIsModelResourcePanelOpen(true)}
                isSaving={isSaving}
                isRunning={isRunning}
                isDeleting={isDeleting}
                hasRunResult={hasVisibleRunResult}
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
                        isActiveCanvasTemporary
                    }
                    revertToSavedTitle={
                        isActiveCanvasTemporary
                            ? 'Unsaved blank canvases do not have a saved version yet'
                            : undefined
                    }
                />

                <WorkflowSelectionBar
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    selectedContextEdge={selectedContextEdge}
                    isLoadingWorkflow={isSwitchingWorkflow || isLoadingWorkflow}
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

                <RunResultPanel displayRun={displayRun} />
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
                    derivedTargetInputs={selectedDisplayNode?.data.derivedTargetInputs ?? []}
                    inboundBindings={selectedDisplayNode?.data.inboundBindings ?? []}
                    promptVariableHints={selectedDisplayNode?.data.promptVariableHints ?? []}
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
                    onChange={updateNode}
                    onDelete={deleteNode}
                    prompts={prompts}
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
            />
        </div>
    )
}