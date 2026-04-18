# workflow-page Layer Map

## Scope

This file documents current physical layering for:

- `frontend-react/src/components/workflow-page/`

It reflects current local code only.

## Current Entry Chain

1. `frontend-react/src/components/WorkflowEditor.tsx`
2. `workflow-page/orchestration/useWorkflowPageContext.ts`
3. `workflow-page/orchestration/useWorkflowEditorPageAssembler.ts`
4. `workflow-page/shell/WorkflowEditorPageShell.tsx`

## Physical Layers

- `orchestration/`
  - Top-level page composition and contract assembly.
  - Main files: `useWorkflowEditorPageAssembler.ts`, `useWorkflowPanels.ts`, `useWorkflowDialogsState.ts`, `useWorkflowPageContext.ts`.
- `canvas/`
  - Canvas lifecycle and persistence orchestration.
  - Main files: `useWorkflowEditorCanvasSection.ts`, `useCanvasLifecycle.ts`, `useCanvas*.ts`.
- `run/`
  - Direct run/live run/batch run context and display projection.
  - Main files: `useWorkflowEditorDisplayRunSection.ts`, `useWorkflowEditorDisplayState.ts`, `useWorkflowRunContext.ts`, `useLiveRunContext.ts`, `useBatchRunContext.ts`.
- `graph/`
  - Graph section and run action adapters.
  - Main files: `useWorkflowEditorGraphSection.ts`, `useWorkflowEditorRunSection.ts`.
- `subgraph/`
  - Subgraph test panel orchestration, rules, and contracts.
  - Main files: `useWorkflowEditorSubgraphTestSection.ts`, `useWorkflowSubgraphTestPanel.ts`, `useSubgraphTest*.ts`, `subgraphTest*.ts`.
- `shell/`
  - Render-focused page shell and UI sections.
  - Main files: `WorkflowEditorPageShell.tsx`, `WorkflowEditorCanvasPane.tsx`, `WorkflowDialogs.tsx`, `WorkflowEditorSubgraphTestPanelSection.tsx`.

## Root Directory Rule

Top-level `workflow-page/` no longer keeps source bridges.

Rule:

1. All implementation code must live under layer directories.
2. Root stays for docs/tests only (`README.md`, boundary tests).

## Boundary Guards

Layer rules are enforced by:

1. `frontend-react/eslint.config.js`
2. `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`
3. `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`

## Quick Change Guide

1. Page-level assembly changes: edit `orchestration/*`.
2. Canvas lifecycle changes: edit `canvas/*`.
3. Run/live/batch behavior changes: edit `run/*`.
4. Graph action wiring changes: edit `graph/*`.
5. Subgraph test behavior changes: edit `subgraph/*`.
6. Layout/render only changes: edit `shell/*`.
