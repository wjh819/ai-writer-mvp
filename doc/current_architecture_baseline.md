# 当前架构基线

## 1. 目的与范围

本文只基于本地当前代码事实定义当前架构基线。
用于后续设计、重构、评审时的统一参考。

- 基线日期：2026-04-18
- 事实来源：当前仓库代码
- 覆盖范围：
  - 前端：`frontend-react/src/*`、`frontend-react/packages/run-display/*`
  - 后端：`fastapi_app.py`、`api/*`、`contracts/*`、`backend_workflow_canonical/*`、`backend_workflow_engine/*`、`core/*`、`storage/*`
- 不包含：
  - 未来架构推演
  - 已删除旧文档中的历史审计结论

---

## 2. 仓库分层地图（当前）

| 分层 | Owner | 主要路径 | 职责 |
| --- | --- | --- | --- |
| 前端宿主应用 | `frontend-react/src` | `components/workflow-page/*`、`workflow-editor/controllers/*`、`api/*` | 页面编排、运行时协调、UI 组合 |
| 前端包 | `@aiwriter/run-display` | `frontend-react/packages/run-display/*` | 运行结果展示模型、mapper、面板 UI、展示契约 |
| 后端传输与编排层 | `api/*` + `fastapi_app.py` | `api/routes/*`、`api/workflow_*`、`api/run_*` | HTTP 传输、路由编排、workflow/run 协调 |
| 后端契约层 | `contracts/*` | `run_contracts.py`、`workflow_contracts.py`、`step_projections.py` | 契约 owner（Pydantic 模型） |
| 后端 canonical 包 | `backend_workflow_canonical/*` | `workflow_validator.py`、`workflow_validation_*.py` | canonical 校验规则与检查 |
| 后端 engine 包 | `backend_workflow_engine/*` | `engine.py`、`engine_*`、`execution_types.py` | 执行内核与执行事实 |
| 后端宿主基础设施 | `core/*`、`storage/*` | `llm.py`、`model_resource_registry.py`、`output_exporter.py`、`model_resource_store.py` | registry 投影、LLM 适配、结果导出、存储 IO |

---

## 3. 前端基线

### 3.1 前端主入口链路

当前入口链路：

1. `frontend-react/src/main.tsx`
2. `frontend-react/src/App.tsx`
3. `frontend-react/src/components/WorkflowEditor.tsx`
4. `frontend-react/src/components/workflow-page/orchestration/useWorkflowPageContext.ts`
5. `frontend-react/src/components/workflow-page/orchestration/useWorkflowEditorPageAssembler.ts`
6. `frontend-react/src/components/workflow-page/shell/WorkflowEditorPageShell.tsx`

说明：

- `WorkflowEditor` 是页面级根入口。
- `workflow-page` 采用分层目录（`orchestration/canvas/run/graph/subgraph/shell`）。
- `workflow-page` 根目录不再保留业务源码桥接，只保留文档与测试。

### 3.2 前端包 owner：`@aiwriter/run-display`

当前包 owner 形态：

- 公共入口：`frontend-react/packages/run-display/src/index.ts`
- 包元数据：`frontend-react/packages/run-display/package.json`
- 导出产物：`dist/index.js` + 类型声明

当前公开能力面：

- `RunResultPanel`
- `buildDisplayRunFromDirectRun`
- `buildDisplayRunFromLiveSnapshot`
- 展示侧契约类型（通过包入口导出）

当前宿主消费方式：

- `frontend-react/src` 内通过 `@aiwriter/run-display` 消费。
- `frontend-react/package.json` 当前依赖：`"@aiwriter/run-display": "0.1.0"`。

### 3.3 前端边界约束（当前）

当前守卫：

- `frontend-react/eslint.config.js`
- `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`
- `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`
- `frontend-react/packages/run-display/src/run-display/runBoundaryContract.test.ts`

当前约束要点：

1. 宿主代码不得深导入 `@aiwriter/run-display/*` 或包内部源码路径。
2. `workflow-editor` 不得导入 `workflow-page` 宿主模块或 run-display 内部实现。
3. `workflow-page` assembler 仅允许通过 runtime facade 使用 workflow-editor。
4. `workflow-page` 低层目录（`canvas/run/graph/subgraph`）不得回跳 `orchestration`，且领域层不得依赖 `shell`。
5. run-display 包内部不得导入宿主 `workflow-page`、宿主 runtime controller、宿主 shared workflow type owner。
6. run-display 契约 owner（`runDisplayContracts.ts`）不得导入宿主 `shared/workflowSharedTypes`。

### 3.4 前端宿主专属职责（非包 owner）

以下职责当前仍属于宿主：

1. 跨分区页面编排与回调桥接：
   - `frontend-react/src/components/workflow-page/orchestration/useWorkflowEditorPageAssembler.ts`
2. runtime facade 聚合与兼容别名：
   - `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`
3. 页面生命周期与交互编排：
   - `frontend-react/src/components/workflow-page/canvas/useCanvasLifecycle.ts`
   - `frontend-react/src/components/workflow-page/subgraph/useWorkflowSubgraphTestPanel.ts`

---

## 4. 后端基线

### 4.1 后端主入口链路

当前入口链路：

1. `fastapi_app.py` 创建 `FastAPI` 并挂载 `api.workflows.router` 到 `/api`。
2. `api/workflows.py` 聚合：
   - `api/routes/workflow_routes.py`
   - `api/routes/run_routes.py`
   - `api/routes/model_resource_routes.py`

### 4.2 后端包 owner

#### A. Contracts owner

- 路径：`contracts/*`
- 主 owner 文件：`contracts/run_contracts.py`
- 职责：run/workflow 契约 owner

#### B. Canonical owner

- 路径：`backend_workflow_canonical/*`
- 主文件：`workflow_validator.py`、`workflow_validation_*.py`
- `backend_workflow_canonical/__init__.py` 暴露能力包括：
  - `set_model_resource_registry_provider`
  - `validate_workflow_editor_data`
  - `validate_partial_execution_workflow`
  - 其他校验 helper

#### C. Engine owner

- 路径：`backend_workflow_engine/*`
- 主文件：`engine.py`、`engine_*`、`execution_types.py`
- `backend_workflow_engine/__init__.py` 暴露能力包括：
  - `WorkflowEngine`
  - `WorkflowDefinitionError`

### 4.3 后端宿主应用职责

当前宿主编排仍在 `api/*`：

- 路由传输层：
  - `api/routes/run_routes.py`
  - `api/routes/workflow_routes.py`
  - `api/routes/model_resource_routes.py`
- run/workflow 编排：
  - `api/workflow_direct_run_service.py`
  - `api/workflow_live_run_service.py`
  - `api/workflow_batch_run_service.py`
  - `api/workflow_canonical_loader.py`
- 进程内运行时状态存储：
  - `api/run_live_store.py`（`_RUN_LIVE_STORE`）
  - `api/run_batch_store.py`（`_BATCH_RUN_STORE`）

当前宿主基础设施：

- `core/model_resource_registry.py`
- `core/llm.py`
- `core/output_exporter.py`
- `storage/model_resource_store.py`

### 4.4 后端边界约束（当前）

当前边界测试：

- `tests/test_run_contract_boundaries.py`
- `tests/test_canonical_package_boundaries.py`
- `tests/test_engine_package_boundaries.py`
- `tests/test_backend_package_metadata.py`

当前约束要点：

1. `contracts.run_contracts` 不得依赖 `api.*`。
2. canonical 包不得依赖 `api.*`、`fastapi.*`、`storage.*`。
3. engine 包不得依赖 `api.*`、`fastapi.*`、`storage.*`。
4. canonical 与 engine 包不得互相交叉导入。
5. 旧桥接模块保持移除状态，包括：
   - `api/run_http_schemas.py`
   - `api/workflow_validator.py`
   - `api/workflow_validation_dependency.py`
   - `api/workflow_validation_subgraph.py`
   - `core/engine.py` 及其他 core engine bridge 文件

### 4.5 Canonical Provider 注入形态

`api/routes/run_routes.py` 与 `api/routes/workflow_routes.py` 通过以下入口注入 model resource 可用性：

- `set_model_resource_registry_provider(load_model_resource_registry)`

这样可保持 canonical 规则归 canonical 包 owner，同时由宿主层完成 provider 装配。

---

## 5. 前后端契约对齐基线

### 5.1 后端契约 owner

- run contract owner 为 `contracts/run_contracts.py`。
- routes 直接消费 contracts，不再经过 `api.run_http_schemas` 旧桥接。

### 5.2 前端契约消费形态

- 展示契约与 mapper owner 为 `@aiwriter/run-display`。
- `frontend-react/src/run/runTypes.ts` 仍保留依赖 workflow-editor owner 类型的请求侧 payload 类型。
- 展示侧 run DTO 类型从 `@aiwriter/run-display` 导入。

### 5.3 运行时对齐

- 前端 API 基址：`frontend-react/src/api/core.ts` = `http://127.0.0.1:8000/api`
- 与后端本地启动端口 `8000` 对齐。

---

## 6. 当前必须保留在宿主层的职责

以下职责当前应保持宿主作用域，不作为独立包 owner：

1. `workflow-page` 顶层编排（跨 section + UI 组合）
2. `workflow-editor/controllers` 中的 `useWorkflowRuntime` 兼容 facade
3. `api/run_live_store.py` 与 `api/run_batch_store.py` 进程内状态存储
4. `api/workflow_loader.py`、`api/workflow_prompt_io.py`、`api/workflow_sidecar_io.py` 及相关 workflow 文件持久化链路
5. `core/model_resource_registry.py` 与 `storage/model_resource_store.py` 的 registry 与存储耦合链路

---

## 7. 基线维护规则

当以下结构发生变化时，同步更新本文：

- 前端：
  - `frontend-react/src/components/workflow-page/*`
  - `frontend-react/src/workflow-editor/controllers/*`
  - `frontend-react/packages/run-display/*`
  - `frontend-react/eslint.config.js`
- 后端：
  - `api/routes/*`
  - `api/workflow_*`、`api/run_*`
  - `contracts/*`
  - `backend_workflow_canonical/*`
  - `backend_workflow_engine/*`
  - `core/*`、`storage/*`
- 守卫与发布链路：
  - `tests/test_*package*boundaries.py`
  - `.github/workflows/backend-package-matrix.yml`
