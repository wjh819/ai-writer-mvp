# workflow-page File Responsibility Map

## Scope
This document maps responsibilities for files under:

- `frontend-react/src/components/workflow-page/`

It is based on current local code, not historical assumptions.

## Entry Path
Current page entry chain:

1. `frontend-react/src/components/WorkflowEditor.tsx`
2. `useWorkflowPageContext.ts`
3. `useWorkflowEditorPageAssembler.ts`
4. `WorkflowEditorPageShell.tsx`

## Layered View
Main composition layers in this folder:

1. Page-level composition and contract assembly
2. Canvas lifecycle and persistence actions
3. Run/live/batch execution context and display state
4. Graph section and dialog wiring
5. Subgraph test panel orchestration
6. Presentational components (render-only)
7. Boundary/unit tests for the above adapters

## Fast Reading Order
Recommended reading sequence for onboarding:

1. `useWorkflowEditorPageAssembler.ts` (top orchestrator)
2. `useWorkflowPanels.ts` + `WorkflowEditorPageShell.tsx` (UI contract wiring)
3. `useWorkflowEditorCanvasSection.ts` + `useCanvasLifecycle.ts` (canvas mainline)
4. `useWorkflowEditorDisplayRunSection.ts` (run/live/batch mainline)
5. `useWorkflowEditorSubgraphTestSection.ts` + `useWorkflowSubgraphTestPanel.ts` (subgraph mainline)
6. Utility files (`canvasLifecycleMessages.ts`, `subgraphTest*.ts`) for rules/helpers

## File Map

### 1) Page composition and top-level contracts
| File | Responsibility | Key Dependencies |
| --- | --- | --- |
| `useWorkflowPageContext.ts` | Owns page-local state buckets: canvas, graph versioning, page status/errors. | React state/hooks only |
| `useWorkflowEditorPageAssembler.ts` | Top orchestrator. Composes runtime, all sections, cross-section bridges, and returns page shell props. | `useWorkflowRuntime`, `useWorkflowEditor*Section`, `useWorkflowPanels`, `useWorkflowDialogsState` |
| `useWorkflowPanels.ts` | Converts section outputs into concrete props for sidebar/canvas/subgraph panel/model-resource panel. | `WorkflowSidebar`, `WorkflowEditorCanvasPane`, `WorkflowEditorSubgraphTestPanelSection` |
| `WorkflowEditorPageShell.tsx` | Render shell layout only: sidebar + canvas pane + subgraph panel + dialogs/model-resource panel. | Presentational composition only |

### 2) Canvas lifecycle and persistence
| File | Responsibility | Key Dependencies |
| --- | --- | --- |
| `useWorkflowEditorCanvasSection.ts` | Canvas section adapter; wires runtime ports and reset side effects across graph/run/subgraph domains. | `useCanvasLifecycle` |
| `useCanvasLifecycle.ts` | Canvas lifecycle facade: switch/create/delete/save/revert orchestration and status contracts. | `useCanvasLoadSwitch`, `useCanvasCreateDialog`, `useCanvasDeleteAction`, `useCanvasPersistenceActions`, `useCanvasLifecycleStatus` |
| `useCanvasLoadSwitch.ts` | Controls workflow load switching, in-flight dedupe, commit semantics, and guarded canvas change requests. | `canvasLifecycleMessages.ts` |
| `useCanvasCreateDialog.ts` | Create-blank-canvas dialog state, validation, and create-confirm flow. | `canvasLifecycleMessages.ts` |
| `useCanvasDeleteAction.ts` | Delete/discard current canvas action flow, including formal-vs-temporary branch logic. | `canvasLifecycleMessages.ts` |
| `useCanvasPersistenceActions.ts` | Refresh/save/revert handlers; save/revert guard when graph editing is locked. | runtime persistence bindings |
| `useCanvasLifecycleStatus.ts` | Derives lifecycle booleans/messages (`temporary`, `canDelete`) and discard confirmation helper. | `canvasLifecycleMessages.ts` |
| `canvasLifecycleMessages.ts` | Pure message/validation utility for canvas id rules and user-facing status/confirm strings. | no runtime state |

### 3) Run/live/batch context and display state
| File | Responsibility | Key Dependencies |
| --- | --- | --- |
| `useWorkflowEditorDisplayRunSection.ts` | Run domain facade; composes direct run, live run, batch run context into one section contract. | `useWorkflowRunContext`, `useLiveRunContext`, `useBatchRunContext`, `useWorkflowEditorDisplayState` |
| `useWorkflowRunContext.ts` | Manages direct run context/result, stale detection by graph semantic version, and display-run mapping. | `@aiwriter/run-display` mapper |
| `useLiveRunContext.ts` | Live-run lifecycle with polling, terminal snapshot commit, and graph-lock state derivation. | runtime live-run handlers |
| `useBatchRunContext.ts` | Batch-run lifecycle with polling, selected item detail loading, cancel flow, stale detection, display mapping. | runtime batch handlers, `@aiwriter/run-display` mapper |
| `useWorkflowEditorDisplayState.ts` | Pure display-state projection (messages, selected artifacts, effective display run precedence). | `@aiwriter/run-display` |
| `WorkflowEditorBatchSummarySection.tsx` | Render batch summary list and item selection surface. | batch summary props |
| `WorkflowPageBanners.tsx` | Render top-level banner stack (live status, switch status, warnings/errors, draft status). | display messages props |

### 4) Graph section and dialogs
| File | Responsibility | Key Dependencies |
| --- | --- | --- |
| `useWorkflowEditorGraphSection.ts` | Graph section adapter; maps `useWorkflowGraphEditor` outputs into sidebar/canvas/dialog/subgraph bindings. | `useWorkflowGraphEditor` |
| `useWorkflowEditorRunSection.ts` | Run action adapter from graph inputs and run form state to live/batch runtime actions. | `getRunInputKey`, run context actions |
| `useWorkflowDialogsState.ts` | Dialog props aggregator; merges canvas-dialog and graph-binding-dialog contracts. | `WorkflowDialogs.tsx` prop shape |
| `WorkflowDialogs.tsx` | Modal render component for create-canvas and edge-binding confirmation. | UI-only with callbacks |
| `WorkflowEditorCanvasPane.tsx` | Main canvas pane renderer (ReactFlow + run panel + batch summary + banners/selection bar). | `reactflow`, `@aiwriter/run-display` |

### 5) Subgraph test panel orchestration
| File | Responsibility | Key Dependencies |
| --- | --- | --- |
| `useWorkflowEditorSubgraphTestSection.ts` | Subgraph section adapter; wires section state + subgraph panel orchestrator + reset hook for committed workflow. | `useSubgraphTestSectionState`, `useWorkflowSubgraphTestPanel` |
| `useSubgraphTestSectionState.ts` | Owns section-local UI state (expanded/requested node) and lock derivation from live/batch run states. | no external runtime |
| `useWorkflowSubgraphTestPanel.ts` | Subgraph test orchestrator; composes panel state, invalidation, pinned inputs, runner, lifecycle pruning. | `useSubgraph*` hooks set |
| `useSubgraphTestPanelState.ts` | Panel-local feedback and request/open/reset behavior. | lock status + selectNode callback |
| `useSubgraphTestRunner.ts` | Composition hook: display-run selection + runner actions. | `useSubgraphTestDisplaySelection`, `useSubgraphTestRunnerActions` |
| `useSubgraphTestRunnerActions.ts` | Run/clear/reset action handlers for selected node subgraph test. | runtime subgraph handlers, merged test-state builder |
| `useSubgraphTestDisplaySelection.ts` | Selects active node's subgraph display run and stale marker logic. | `@aiwriter/run-display` |
| `useSubgraphPinnedInputs.ts` | Computes effective pinned inputs and handles pinned draft updates into sidecar assets. | sidecar node assets APIs |
| `useSubgraphTestInvalidation.ts` | Invalidates stale subgraph cached results/context when graph semantics change. | `subgraphTestInvalidationRules.ts` |
| `useSubgraphTestPanelLifecycle.ts` | Lifecycle cleanup: prune artifacts/sidecar by valid node ids and clear feedback on node switch. | runtime prune actions |
| `subgraphTestPanelTypes.ts` | Shared subgraph panel boundary contracts for graph/callback/runtime/feedback/result types. | type contracts only |
| `subgraphTestInvalidationRules.ts` | Pure semantic graph diff and invalidation rules for nodes/edges/context links and upstream impact. | graph types only |
| `subgraphTestPresentation.ts` | UI label/style helpers for reusable/pinned/missing input sources. | pure helper |
| `subgraphTestOutputSpec.ts` | Output-name/state-key generation helper for node output spec expansion. | workflow helper domain |
| `WorkflowEditorSubgraphTestPanelSection.tsx` | Render bridge from section bindings into `NodeConfigPanel` subgraph-related props. | `NodeConfigPanel` |

### 6) Tests in this folder
| File | Responsibility |
| --- | --- |
| `useCanvasLoadSwitch.test.ts` | Guards load-switch in-flight dedupe, switch-target loading, and retry after failure. |
| `useSubgraphTestSectionState.test.ts` | Verifies lock-state derivation and section-local panel state behavior. |
| `useWorkflowDialogsState.test.ts` | Verifies dialogs contract aggregation and lock forwarding. |
| `useWorkflowEditorGraphSection.test.ts` | Verifies run-context filtering before passing run result into graph editor. |
| `useWorkflowEditorPageAssembler.test.ts` | Verifies assembler bridge wiring and exposed page-shell contract. |
| `useWorkflowEditorRunSection.test.ts` | Verifies run-input sync behavior to runtime inputs. |
| `useWorkflowEditorSubgraphTestSection.test.ts` | Verifies subgraph section adapter contract and reset behavior. |
| `useWorkflowPanels.test.ts` | Verifies panels contract mapping and derived status flags. |
| `useWorkflowSubgraphTestPanel.test.ts` | Verifies composition contract for subgraph panel orchestrator. |

## Ownership Notes
Practical ownership split in this folder:

1. `useWorkflowEditorPageAssembler.ts` is the composition owner.
2. `useWorkflowPanels.ts` and `WorkflowEditorPageShell.tsx` are page-shell contract owners.
3. `useCanvasLifecycle.ts` is canvas lifecycle owner.
4. `useWorkflowEditorDisplayRunSection.ts` is run/live/batch facade owner.
5. `useWorkflowEditorSubgraphTestSection.ts` + `useWorkflowSubgraphTestPanel.ts` are subgraph orchestration owners.

## Change Impact Hints
When editing, use this quick impact map:

1. Need to change layout/render only: touch `WorkflowEditorPageShell.tsx`, `WorkflowEditorCanvasPane.tsx`, `WorkflowPageBanners.tsx`, `WorkflowEditorBatchSummarySection.tsx`.
2. Need to change canvas create/switch/delete/save behavior: touch `useCanvas*` chain.
3. Need to change live/batch polling behavior: touch `useLiveRunContext.ts` / `useBatchRunContext.ts`.
4. Need to change subgraph stale/invalid rules: touch `useSubgraphTestInvalidation.ts` + `subgraphTestInvalidationRules.ts`.
5. Need to change page-level wiring between sections: touch `useWorkflowEditorPageAssembler.ts`.
