import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type ReactFlowProps,
} from 'reactflow'

import type {
  BatchItemSummary,
  BatchSummaryResponse,
} from '../../../run/runTypes'
import type {
  WorkflowEditorContextEdge,
  WorkflowEditorEdge,
  WorkflowGraphEdge,
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import { RunResultPanel, type DisplayRun } from '@aiwriter/run-display'
import WorkflowSelectionBar from '../../WorkflowSelectionBar'
import WorkflowEditorBatchSummarySection from './WorkflowEditorBatchSummarySection'
import WorkflowPageBanners from './WorkflowPageBanners'

type WorkflowReactFlowProps = ReactFlowProps

interface WorkflowEditorCanvasPaneProps {
  workflowStatusMessage: string
  temporaryCanvasStatusMessage: string
  topLevelErrorMessage: string
  workflowWarningsMessage: string
  draftStatusMessage: string
  activeRunStatusMessage: string
  onRevertToSaved: () => void | Promise<void>
  disableRevertToSaved: boolean
  revertToSavedTitle?: string

  selectedNode: WorkflowEditorNode | null
  selectedEdge: WorkflowEditorEdge | null
  selectedContextEdge: WorkflowEditorContextEdge | null
  isLoadingWorkflow: boolean
  isGraphEditingLocked: boolean
  onDeleteSelectedEdge: () => void
  onDeleteSelectedContextEdge: () => void
  onSetSelectedContextEdgeMode: (mode: 'continue' | 'branch') => void

  displayNodes: WorkflowEditorNode[]
  displayEdges: WorkflowGraphEdge[]
  nodeTypes: NodeTypes
  onNodesChange: WorkflowReactFlowProps['onNodesChange']
  onEdgesChange: WorkflowReactFlowProps['onEdgesChange']
  onConnect: WorkflowReactFlowProps['onConnect']
  onEdgeClick: WorkflowReactFlowProps['onEdgeClick']
  onPaneClick: WorkflowReactFlowProps['onPaneClick']
  onNodeClick: WorkflowReactFlowProps['onNodeClick']
  onSelectionChange: WorkflowReactFlowProps['onSelectionChange']

  batchSummary: BatchSummaryResponse | null
  selectedBatchItemId: string | null
  selectedBatchSummaryItem: BatchItemSummary | null
  isBatchResultStale: boolean
  isBatchCancelRequested: boolean
  onSelectBatchItem: (itemId: string) => void

  hasAnyRunArtifact: boolean
  effectiveDisplayRun: DisplayRun | null
}

export default function WorkflowEditorCanvasPane({
  workflowStatusMessage,
  temporaryCanvasStatusMessage,
  topLevelErrorMessage,
  workflowWarningsMessage,
  draftStatusMessage,
  activeRunStatusMessage,
  onRevertToSaved,
  disableRevertToSaved,
  revertToSavedTitle,
  selectedNode,
  selectedEdge,
  selectedContextEdge,
  isLoadingWorkflow,
  isGraphEditingLocked,
  onDeleteSelectedEdge,
  onDeleteSelectedContextEdge,
  onSetSelectedContextEdgeMode,
  displayNodes,
  displayEdges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeClick,
  onPaneClick,
  onNodeClick,
  onSelectionChange,
  batchSummary,
  selectedBatchItemId,
  selectedBatchSummaryItem,
  isBatchResultStale,
  isBatchCancelRequested,
  onSelectBatchItem,
  hasAnyRunArtifact,
  effectiveDisplayRun,
}: WorkflowEditorCanvasPaneProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <WorkflowPageBanners
        workflowStatusMessage={workflowStatusMessage}
        temporaryCanvasStatusMessage={temporaryCanvasStatusMessage}
        topLevelErrorMessage={topLevelErrorMessage}
        workflowWarningsMessage={workflowWarningsMessage}
        draftStatusMessage={draftStatusMessage}
        onRevertToSaved={onRevertToSaved}
        disableRevertToSaved={disableRevertToSaved}
        revertToSavedTitle={revertToSavedTitle}
        liveRunStatusMessage={activeRunStatusMessage}
      />

      <WorkflowSelectionBar
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        selectedContextEdge={selectedContextEdge}
        isLoadingWorkflow={isLoadingWorkflow}
        isGraphEditingLocked={isGraphEditingLocked}
        onDeleteSelectedEdge={onDeleteSelectedEdge}
        onDeleteSelectedContextEdge={onDeleteSelectedContextEdge}
        onSetSelectedContextEdgeMode={onSetSelectedContextEdgeMode}
      />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onSelectionChange={onSelectionChange}
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
        <WorkflowEditorBatchSummarySection
          batchSummary={batchSummary}
          selectedBatchItemId={selectedBatchItemId}
          selectedBatchSummaryItem={selectedBatchSummaryItem}
          isBatchResultStale={isBatchResultStale}
          isBatchCancelRequested={isBatchCancelRequested}
          onSelectBatchItem={onSelectBatchItem}
        />
      ) : null}

      {hasAnyRunArtifact ? (
        <RunResultPanel displayRun={effectiveDisplayRun} />
      ) : (
        <RunResultPanel displayRun={null} />
      )}
    </div>
  )
}

