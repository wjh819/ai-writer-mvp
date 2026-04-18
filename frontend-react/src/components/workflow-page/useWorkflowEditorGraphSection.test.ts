// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkflowGraphEditor } from '../../workflow-editor/controllers/useWorkflowGraphEditor'
import { useWorkflowEditorGraphSection } from './graph/useWorkflowEditorGraphSection'

vi.mock('../../workflow-editor/controllers/useWorkflowGraphEditor', () => ({
  useWorkflowGraphEditor: vi.fn(),
}))

function createGraphEditorResult() {
  return {
    nodes: [],
    edges: [],
    contextLinks: [],
    selectedNode: null,
    selectedEdgeId: null,
    selectedContextEdge: null,
    inputNodes: [],
    displayNodes: [],
    displayEdges: [],
    pendingBindingRequest: null,
    confirmPendingBinding: vi.fn(),
    cancelPendingBinding: vi.fn(),
    onNodesChange: vi.fn(),
    onConnect: vi.fn(),
    handleEdgesChange: vi.fn(),
    handleEdgeClick: vi.fn(),
    handlePaneClick: vi.fn(),
    handleNodeClick: vi.fn(),
    handleSelectionChange: vi.fn(),
    deleteSelectedEdge: vi.fn(),
    deleteSelectedContextLink: vi.fn(),
    updateSelectedContextLinkMode: vi.fn(),
    addNodeByType: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    selectNodeById: vi.fn(),
    replaceGraph: vi.fn(),
  }
}

describe('useWorkflowEditorGraphSection', () => {
  const mockedUseWorkflowGraphEditor = vi.mocked(useWorkflowGraphEditor)

  beforeEach(() => {
    mockedUseWorkflowGraphEditor.mockReset()
    mockedUseWorkflowGraphEditor.mockReturnValue(createGraphEditorResult() as never)
  })

  it('passes runResult to graph editor when runContext matches active workflow context', () => {
    const runResult = {
      status: 'succeeded',
      run_scope: 'draft',
      input_state: {},
      final_state: {},
      steps: [],
    } as never

    renderHook(() =>
      useWorkflowEditorGraphSection({
        runContext: {
          canvasId: 'article',
          workflowContextId: 5,
          graphSemanticVersion: 1,
          runResult,
        },
        activeWorkflowContextId: 5,
        onGraphSemanticChanged: vi.fn(),
        onGraphPersistedChanged: vi.fn(),
        onGraphError: vi.fn(),
        onGraphClearError: vi.fn(),
        onRequestSubgraphTest: vi.fn(),
        runtime: {
          runningSubgraphTestNodeId: null,
        },
        isGraphEditingLocked: false,
        liveRunSnapshot: null,
      })
    )

    expect(mockedUseWorkflowGraphEditor).toHaveBeenCalledWith(
      expect.objectContaining({ runResult })
    )
  })

  it('passes null runResult when runContext is stale for current workflow context', () => {
    renderHook(() =>
      useWorkflowEditorGraphSection({
        runContext: {
          canvasId: 'article',
          workflowContextId: 9,
          graphSemanticVersion: 1,
          runResult: {
            status: 'failed',
            run_scope: 'draft',
            input_state: {},
            final_state: {},
            steps: [],
          } as never,
        },
        activeWorkflowContextId: 5,
        onGraphSemanticChanged: vi.fn(),
        onGraphPersistedChanged: vi.fn(),
        onGraphError: vi.fn(),
        onGraphClearError: vi.fn(),
        onRequestSubgraphTest: vi.fn(),
        runtime: {
          runningSubgraphTestNodeId: null,
        },
        isGraphEditingLocked: false,
        liveRunSnapshot: null,
      })
    )

    expect(mockedUseWorkflowGraphEditor).toHaveBeenCalledWith(
      expect.objectContaining({ runResult: null })
    )
  })
})
