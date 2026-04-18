# 前端 workflow-page 职责地图

## 1. 范围与证据

本文只基于当前本地代码，描述以下目录的职责边界：

- `frontend-react/src/components/workflow-page/*`

主要证据：

- `frontend-react/src/components/workflow-page/*`
- `frontend-react/src/components/WorkflowEditor.tsx`
- `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`
- `frontend-react/src/components/workflow-page/README.md`
- 边界守卫：
  - `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`
  - `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`
  - `frontend-react/packages/run-display/src/run-display/runBoundaryContract.test.ts`
  - `frontend-react/eslint.config.js`

---

## 2. 入口链路与主链位置

当前入口链路：

1. `frontend-react/src/main.tsx`
2. `frontend-react/src/App.tsx`
3. `frontend-react/src/components/WorkflowEditor.tsx`
4. `frontend-react/src/components/workflow-page/orchestration/useWorkflowPageContext.ts`
5. `frontend-react/src/components/workflow-page/orchestration/useWorkflowEditorPageAssembler.ts`
6. `frontend-react/src/components/workflow-page/shell/WorkflowEditorPageShell.tsx`

架构定位：

- `workflow-page` 是前端宿主页面编排层。
- 负责把 runtime、graph、run/live/batch、subgraph-test、dialogs、shell 渲染组合为页面主链。
- 当前仍是宿主层职责，不是独立包 owner。

---

## 3. 目录分层视图（当前）

`workflow-page` 当前采用 6 层目录：

1. `orchestration/`：顶层编排与页面契约装配
2. `canvas/`：画布生命周期与持久化动作
3. `run/`：direct/live/batch 运行上下文与展示状态
4. `graph/`：图编辑 section 与 run action 适配
5. `subgraph/`：子图测试编排、规则、契约
6. `shell/`：渲染层组件（页面壳、画布面板、对话框等）

根目录规则：

- 根目录不再保留业务源码桥接。
- 根目录仅保留文档与测试文件。

---

## 4. 职责矩阵

### 4.1 orchestration（页面编排）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `orchestration/useWorkflowPageContext.ts` | 页面局部状态 owner（canvas、graph 版本、页面错误/警告状态） | React hooks |
| `orchestration/useWorkflowEditorPageAssembler.ts` | 顶层编排器，组装 runtime 与各 section，并输出 `pageShellProps` | `useWorkflowRuntime`、`useWorkflowEditor*Section`、`useWorkflowPanels`、`useWorkflowDialogsState` |
| `orchestration/useWorkflowPanels.ts` | 将各 section 输出映射为 shell 所需 props | `WorkflowSidebar`、`WorkflowEditorCanvasPane`、`WorkflowEditorSubgraphTestPanelSection` |
| `orchestration/useWorkflowDialogsState.ts` | 汇总 create-canvas 与 graph-binding 对话框契约 | `shell/WorkflowDialogs.tsx` |

### 4.2 canvas（画布生命周期）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `canvas/useWorkflowEditorCanvasSection.ts` | 画布 section 适配，连接 runtime 端口与跨域 reset | `canvas/useCanvasLifecycle.ts` |
| `canvas/useCanvasLifecycle.ts` | switch/create/delete/save/revert 主流程编排 | `useCanvas*` 子 hook |
| `canvas/useCanvasLoadSwitch.ts` | workflow 切换与并发去重控制 | `canvasLifecycleMessages.ts` |
| `canvas/useCanvasCreateDialog.ts` | 新建画布对话框状态/校验/确认逻辑 | `canvasLifecycleMessages.ts` |
| `canvas/useCanvasDeleteAction.ts` | 删除/丢弃画布流程 | `canvasLifecycleMessages.ts` |
| `canvas/useCanvasPersistenceActions.ts` | refresh/save/revert 执行动作 | runtime persistence |
| `canvas/useCanvasLifecycleStatus.ts` | lifecycle 派生状态与提示信息 | `canvasLifecycleMessages.ts` |
| `canvas/canvasLifecycleMessages.ts` | 纯消息与校验 helper | 无 runtime 状态 |

### 4.3 run（运行态）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `run/useWorkflowEditorDisplayRunSection.ts` | run/live/batch 统一门面 | `useWorkflowRunContext`、`useLiveRunContext`、`useBatchRunContext`、`useWorkflowEditorDisplayState` |
| `run/useWorkflowRunContext.ts` | direct run 上下文、结果、stale 判定 | `@aiwriter/run-display` |
| `run/useLiveRunContext.ts` | live run 轮询与锁状态 | runtime live-run handlers |
| `run/useBatchRunContext.ts` | batch 轮询、详情、取消、stale 判定与展示映射 | runtime batch handlers、`@aiwriter/run-display` |
| `run/useWorkflowEditorDisplayState.ts` | 页面展示状态投影与 run artifact 优先级 | `@aiwriter/run-display` |

### 4.4 graph（图编辑）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `graph/useWorkflowEditorGraphSection.ts` | graph-editor 输出到 canvas/sidebar/dialog/subgraph 绑定的适配层 | `useWorkflowGraphEditor` |
| `graph/useWorkflowEditorRunSection.ts` | 从图输入适配出 live/batch 动作触发 | `getRunInputKey`、run actions |

### 4.5 subgraph（子图测试）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `subgraph/useWorkflowEditorSubgraphTestSection.ts` | 子图测试 section 适配与 committed reset hook | `useSubgraphTestSectionState`、`useWorkflowSubgraphTestPanel` |
| `subgraph/useSubgraphTestSectionState.ts` | section 内局部状态（expanded/requested）与锁判定 | run 状态 |
| `subgraph/useWorkflowSubgraphTestPanel.ts` | 子图测试总编排（panel state/invalidation/pinned inputs/runner/lifecycle） | `useSubgraph*` 系列 |
| `subgraph/useSubgraphTestRunner*.ts` | 子图测试执行与展示选择逻辑 | runtime subgraph handlers、`@aiwriter/run-display` |
| `subgraph/useSubgraphPinnedInputs.ts` | pinned inputs 计算与 sidecar 更新 | sidecar API |
| `subgraph/useSubgraphTestInvalidation*.ts` | stale 失效规则与触发 | graph types |
| `subgraph/subgraphTestPanelTypes.ts` | 子图测试边界契约类型 | type-only |
| `subgraph/subgraphTestPresentation.ts` | 展示 helper | pure helper |
| `subgraph/subgraphTestOutputSpec.ts` | 输出 spec helper | workflow helper |

### 4.6 shell（渲染层）

| 文件 | 职责 | 关键依赖 |
| --- | --- | --- |
| `shell/WorkflowEditorPageShell.tsx` | 页面总布局渲染（sidebar + canvas + subgraph + dialogs + model resource panel） | render-only composition |
| `shell/WorkflowEditorCanvasPane.tsx` | 画布区渲染（ReactFlow + run panel + batch summary + banners） | `reactflow`、`@aiwriter/run-display` |
| `shell/WorkflowDialogs.tsx` | 对话框渲染（create-canvas、binding 等） | UI callbacks |
| `shell/WorkflowEditorSubgraphTestPanelSection.tsx` | 子图测试面板渲染桥接到 `NodeConfigPanel` | `NodeConfigPanel` |
| `shell/WorkflowEditorBatchSummarySection.tsx` | batch summary 渲染 | batch props |
| `shell/WorkflowPageBanners.tsx` | 顶部提示横幅渲染 | display message props |

### 4.7 根目录测试文件（当前）

| 文件 | 职责 |
| --- | --- |
| `workflowPageBoundaryContract.test.ts` | workflow-page 分层边界契约（目录分层存在性、禁止回跳、ESLint 规则存在性） |
| `useWorkflowEditorPageAssembler.test.ts` | 顶层 assembler 契约与桥接行为验证 |
| `useWorkflowPanels.test.ts` | panels 映射契约验证 |
| `useWorkflowEditorGraphSection.test.ts` | graph section 过滤/映射行为验证 |
| `useWorkflowEditorRunSection.test.ts` | run section 输入同步验证 |
| `useWorkflowEditorSubgraphTestSection.test.ts` | subgraph section 适配与 reset 验证 |
| `useWorkflowSubgraphTestPanel.test.ts` | subgraph panel 组合契约验证 |
| `useCanvasLoadSwitch.test.ts` | load-switch 去重/重试行为验证 |
| `useSubgraphTestSectionState.test.ts` | section state 与 lock 行为验证 |
| `useWorkflowDialogsState.test.ts` | dialogs 契约聚合验证 |

---

## 5. owner 说明（当前）

`workflow-page` 的实用 owner 划分：

1. 页面编排 owner：`orchestration/useWorkflowEditorPageAssembler.ts`
2. 页面壳契约 owner：`orchestration/useWorkflowPanels.ts` + `shell/WorkflowEditorPageShell.tsx`
3. 画布生命周期 owner：`canvas/useCanvasLifecycle.ts`
4. run/live/batch 门面 owner：`run/useWorkflowEditorDisplayRunSection.ts`
5. 子图测试编排 owner：`subgraph/useWorkflowEditorSubgraphTestSection.ts` + `subgraph/useWorkflowSubgraphTestPanel.ts`

---

## 6. 当前边界规则

直接作用于该目录的规则：

1. `workflow-page` 只能通过 runtime facade 消费 workflow-editor，不允许跨层深导入 workflow-editor 内部 domain/state/actions/operations。
2. `workflow-editor` 不能反向导入 `workflow-page`。
3. `workflow-page` 只能通过 `@aiwriter/run-display` 公共入口消费 run-display，不允许深层导入包内部。
4. `workflow-page` 低层目录（`canvas/run/graph/subgraph`）禁止回跳 `orchestration`。
5. 领域层（`canvas/run/graph/subgraph`）禁止依赖 `shell`。

规则 owner：

- `frontend-react/eslint.config.js`
- `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`
- `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`
- `frontend-react/packages/run-display/src/run-display/runBoundaryContract.test.ts`

---

## 7. 变更影响速查

当你要改行为时，优先从以下入口定位：

1. 仅布局/渲染：`shell/*`
2. 画布切换/新建/删除/保存：`canvas/useCanvasLifecycle.ts` 与 `canvas/useCanvas*.ts`
3. live/batch 轮询或运行状态：`run/useLiveRunContext.ts`、`run/useBatchRunContext.ts`
4. 子图 stale 判定：`subgraph/useSubgraphTestInvalidation.ts`、`subgraph/subgraphTestInvalidationRules.ts`
5. 跨 section 组装：`orchestration/useWorkflowEditorPageAssembler.ts`

---

## 8. 维护规则

当以下路径发生职责变化时，需同步更新本文：

- `frontend-react/src/components/workflow-page/*`
- `frontend-react/src/components/WorkflowEditor.tsx`
- `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`
- `frontend-react/eslint.config.js`
- `workflowPageBoundaryContract.test.ts`、`workflowBoundaryContract.test.ts`、`runBoundaryContract.test.ts`
