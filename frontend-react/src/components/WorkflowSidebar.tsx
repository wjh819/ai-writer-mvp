import type { CanvasSummary } from '../api'
import type { ModelResourceListItem } from '../model-resources/modelResourceTypes'
import type { WorkflowEditorNode } from '../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowNodeType } from '../workflow-editor/workflowEditorTypes'
import type { WorkflowState } from '../shared/workflowSharedTypes'

import CanvasActions from './workflow-sidebar/CanvasActions'
import CanvasSwitcher from './workflow-sidebar/CanvasSwitcher'
import RunInputsSection from './workflow-sidebar/RunInputsSection'
import SidebarRunActions from './workflow-sidebar/SidebarRunActions'

interface WorkflowSidebarProps {
  requestedCanvasId: string
  activeCanvasId: string
  canvasList: CanvasSummary[]
  temporaryCanvasId?: string | null
  modelResources: ModelResourceListItem[]
  isSwitchingWorkflow: boolean
  isGraphEditingLocked: boolean
  isLiveRunActive: boolean
  isBatchRunActive: boolean
  isBatchCancelRequested: boolean

  onRequestCanvasChange: (canvasId: string) => void
  onRefreshWorkflowList: () => void
  onOpenCreateCanvas: () => void
  onDeleteCurrentCanvas: () => void | Promise<void>
  onAddNodeByType: (type: WorkflowNodeType) => void

  inputNodes: WorkflowEditorNode[]
  runInputs: WorkflowState
  onRunInputChange: (key: string, value: string) => void

  batchInputText: string
  onBatchInputTextChange: (value: string) => void
  batchMaxParallel: number
  onBatchMaxParallelChange: (value: number) => void

  onSave: (event?: { preventDefault?: () => void }) => void | Promise<void>
  onRun: () => void | Promise<void>
  onRunBatch: () => void | Promise<void>
  onCancelBatch: () => void | Promise<void>
  onClearRunState: () => void
  onOpenModelResources: () => void

  isSaving: boolean
  isRunning: boolean
  isDeleting: boolean
  hasRunResult: boolean
  hasBatchResult: boolean
  hasAnyNodes: boolean
  canDeleteCurrentCanvas: boolean

  getRunInputKey: (node: WorkflowEditorNode) => string
}

export default function WorkflowSidebar({
  requestedCanvasId,
  activeCanvasId,
  canvasList,
  temporaryCanvasId = null,
  modelResources,
  isSwitchingWorkflow,
  isGraphEditingLocked,
  isLiveRunActive,
  isBatchRunActive,
  isBatchCancelRequested,

  onRequestCanvasChange,
  onRefreshWorkflowList,
  onOpenCreateCanvas,
  onDeleteCurrentCanvas,
  onAddNodeByType,

  inputNodes,
  runInputs,
  onRunInputChange,

  batchInputText,
  onBatchInputTextChange,
  batchMaxParallel,
  onBatchMaxParallelChange,

  onSave,
  onRun,
  onRunBatch,
  onCancelBatch,
  onClearRunState,
  onOpenModelResources,

  isSaving,
  isRunning,
  isDeleting,
  hasRunResult,
  hasBatchResult,
  hasAnyNodes,
  canDeleteCurrentCanvas,
  getRunInputKey,
}: WorkflowSidebarProps) {
  const isShowingCanvasSwitchingState =
    isSwitchingWorkflow && requestedCanvasId !== activeCanvasId

  const isActiveCanvasTemporary = temporaryCanvasId === activeCanvasId

  const effectiveCanvasList = [...canvasList]
  const seenCanvasIds = new Set(effectiveCanvasList.map(item => item.canvas_id))

  const ensureCanvasOption = (
    canvasId: string | null | undefined,
    label: string
  ) => {
    if (!canvasId || seenCanvasIds.has(canvasId)) {
      return
    }

    effectiveCanvasList.unshift({
      canvas_id: canvasId,
      label,
    })
    seenCanvasIds.add(canvasId)
  }

  ensureCanvasOption(
    temporaryCanvasId,
    temporaryCanvasId ? `${temporaryCanvasId} (unsaved)` : ''
  )
  ensureCanvasOption(activeCanvasId, activeCanvasId)
  ensureCanvasOption(requestedCanvasId, requestedCanvasId)

  const disableGraphEditingActions =
    isSwitchingWorkflow || isDeleting || isGraphEditingLocked

  const singleBatchInputKey =
    inputNodes.length === 1 ? getRunInputKey(inputNodes[0]) : ''

  return (
    <div
      style={{
        width: 240,
        borderRight: '1px solid #ddd',
        padding: 12,
        background: '#fff',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Nodes</h3>

      <CanvasSwitcher
        requestedCanvasId={requestedCanvasId}
        activeCanvasId={activeCanvasId}
        effectiveCanvasList={effectiveCanvasList}
        isShowingCanvasSwitchingState={isShowingCanvasSwitchingState}
        isSwitchingWorkflow={isSwitchingWorkflow}
        isGraphEditingLocked={isGraphEditingLocked}
        onRequestCanvasChange={onRequestCanvasChange}
      />

      <div style={{ marginBottom: 16 }}>
        <CanvasActions
          modelResourceCount={modelResources.length}
          isSwitchingWorkflow={isSwitchingWorkflow}
          isDeleting={isDeleting}
          isGraphEditingLocked={isGraphEditingLocked}
          canDeleteCurrentCanvas={canDeleteCurrentCanvas}
          isActiveCanvasTemporary={isActiveCanvasTemporary}
          onOpenCreateCanvas={onOpenCreateCanvas}
          onDeleteCurrentCanvas={onDeleteCurrentCanvas}
          onRefreshWorkflowList={onRefreshWorkflowList}
          onOpenModelResources={onOpenModelResources}
        />
      </div>

      <button
        type='button'
        onClick={() => onAddNodeByType('input')}
        style={{ display: 'block', width: '100%', marginBottom: 8 }}
        disabled={disableGraphEditingActions}
      >
        + Input Node
      </button>

      <button
        type='button'
        onClick={() => onAddNodeByType('prompt')}
        style={{ display: 'block', width: '100%', marginBottom: 8 }}
        disabled={disableGraphEditingActions}
      >
        + Prompt Node
      </button>

      <button
        type='button'
        onClick={() => onAddNodeByType('output')}
        style={{ display: 'block', width: '100%' }}
        disabled={disableGraphEditingActions}
      >
        + Output Node
      </button>

      <hr style={{ margin: '16px 0' }} />

      <RunInputsSection
        inputNodes={inputNodes}
        runInputs={runInputs}
        onRunInputChange={onRunInputChange}
        getRunInputKey={getRunInputKey}
        isGraphEditingLocked={isGraphEditingLocked}
      />

      <hr style={{ margin: '16px 0' }} />

      <div>
        <h4 style={{ marginTop: 0 }}>Batch Inputs</h4>

        {inputNodes.length !== 1 ? (
          <div
            style={{
              marginBottom: 12,
              fontSize: 12,
              color: '#92400e',
              whiteSpace: 'pre-wrap',
            }}
          >
            当前批处理运行要求且仅允许一个输入节点。
          </div>
        ) : (
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: '#666',
              whiteSpace: 'pre-wrap',
            }}
          >
            请按行输入，每行一个值。对应输入键：{singleBatchInputKey}
          </div>
        )}

        {isBatchRunActive && isBatchCancelRequested ? (
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: '#92400e',
              whiteSpace: 'pre-wrap',
            }}
          >
            已请求取消批处理。正在运行的条目会自然完成。
          </div>
        ) : null}

        <textarea
          value={batchInputText}
          onChange={e => onBatchInputTextChange(e.target.value)}
          rows={6}
          style={{ width: '100%', marginBottom: 8, resize: 'vertical' }}
          disabled={isGraphEditingLocked}
          placeholder='每行一个输入值'
        />

        <label style={{ display: 'block', marginBottom: 4 }}>Max Parallel</label>
        <input
          type='number'
          min={1}
          max={4}
          value={batchMaxParallel}
          onChange={e => {
            const nextValue = Number(e.target.value)
            onBatchMaxParallelChange(Number.isFinite(nextValue) ? nextValue : 4)
          }}
          style={{ width: '100%' }}
          disabled={isGraphEditingLocked}
        />
      </div>

      <hr style={{ margin: '16px 0' }} />

      <SidebarRunActions
        isSaving={isSaving}
        isRunning={isRunning}
        isSwitchingWorkflow={isSwitchingWorkflow}
        isDeleting={isDeleting}
        isGraphEditingLocked={isGraphEditingLocked}
        isLiveRunActive={isLiveRunActive}
        isBatchRunActive={isBatchRunActive}
        isBatchCancelRequested={isBatchCancelRequested}
        hasRunResult={hasRunResult}
        hasBatchResult={hasBatchResult}
        hasAnyNodes={hasAnyNodes}
        onSave={onSave}
        onRun={onRun}
        onRunBatch={onRunBatch}
        onCancelBatch={onCancelBatch}
        onClearRunState={onClearRunState}
      />
    </div>
  )
}
