# 边界 Contract 测试指南

## 1. 目标

本文定义本仓库边界守卫（boundary guardrails）的落地与维护方式，覆盖：

1. 守卫清单（禁止什么）
2. 变更边界规则的安全流程
3. 合并前最小验证矩阵
4. 常见失败与直接修复方式

事实来源仅为当前代码与当前测试。

---

## 2. 守卫清单

## 2.1 前端守卫

### 规则 owner：ESLint 导入限制

- 文件：`frontend-react/eslint.config.js`

当前生效约束：

1. 宿主代码不得导入 legacy run bridge（`components/run`）或 run-display 内部源码。
2. 宿主代码不得深导入 `@aiwriter/run-display/*`。
3. `workflow-editor` 不得导入 `workflow-page` 宿主模块或 run-display 内部。
4. `workflow-page` assembler 只能通过 runtime facade 使用 workflow-editor。
5. run-display 包内部不得导入宿主 `workflow-page`、宿主 shared 模块、宿主 runtime controllers。
6. run-display contract owner（`runDisplayContracts.ts`）不得导入宿主 `shared/workflowSharedTypes`。
7. `workflow-page` 分层约束：
   - `canvas/run/graph/subgraph` 不得回跳 `orchestration`
   - `canvas/run/graph/subgraph` 不得依赖 `shell`
   - `shell` 保持渲染层，不导入 workflow runtime controllers/operations

### 测试 owner：workflow-editor 边界 contract

- 文件：`frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`

验证内容：

1. 不允许 `workflow-editor -> workflow-page` 源码导入。
2. `useWorkflowRuntime.ts` 不导入 `workflow-page` 或 run-display。
3. `useWorkflowEditorPageAssembler.ts` 仅通过 runtime facade 消费 workflow-editor。
4. workflow 边界相关 ESLint 限制 pattern 仍存在。

### 测试 owner：workflow-page 分层边界 contract

- 文件：`frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`

验证内容：

1. `workflow-page` 分层目录存在（`orchestration/canvas/run/graph/subgraph/shell`）。
2. 根目录不保留业务源码桥接文件（仅测试/文档）。
3. `canvas/run/graph/subgraph` 不导入 `orchestration`。
4. `canvas/run/graph/subgraph` 不导入 `shell`。
5. 与分层相关的 ESLint 限制 pattern 仍存在。

### 测试 owner：run-display 包边界 contract

- 文件：`frontend-react/packages/run-display/src/run-display/runBoundaryContract.test.ts`

验证内容：

1. 包公共导出稳定且最小。
2. 旧宿主桥接文件保持移除。
3. 宿主源码不深导入包内部。
4. 包内部不导入宿主 workflow-page/shared/runtime 模块。
5. WorkflowState contract owner 固定在包内 contract 文件。
6. run-display 边界相关 ESLint 限制 pattern 仍存在。
7. 包产物链路（build 脚本、入口、types）保持有效。

## 2.2 后端守卫

后端边界守卫以测试（Python AST 断言）为主，不依赖 ESLint 类规则。

### Run-contract 边界测试

- 文件：`tests/test_run_contract_boundaries.py`

验证内容：

1. `contracts/run_contracts.py` 不导入 `api.*`。
2. 旧桥接 `api/run_http_schemas.py` 保持移除。
3. `api/run_result_mapper.py` 直接导入 `contracts.run_contracts`，不经旧桥接 schema。

### Canonical 包边界测试

- 文件：`tests/test_canonical_package_boundaries.py`

验证内容：

1. canonical 包模块不导入 `api.*`、`fastapi.*`、`storage.*`。
2. 已移除的 API canonical bridge 模块保持不存在。

### Engine 包边界测试

- 文件：`tests/test_engine_package_boundaries.py`

验证内容：

1. engine 包模块不导入 `api.*`、`fastapi.*`、`storage.*`。
2. engine 与 canonical 包互不交叉导入。
3. 已移除的 core engine bridge 模块保持不存在。

---

## 3. 边界规则变更的安全流程

当需要调整边界规则时，按以下顺序执行。

## 3.1 第一步：先明确 owner 与依赖方向

改规则前必须先明确：

1. 哪个模块是 owner。
2. 允许哪些依赖方向。
3. 禁止哪些依赖方向。

如果 owner 不清晰，先回到架构文档对齐再改代码。

## 3.2 第二步：先改生产守卫

前端：

- 在 `frontend-react/eslint.config.js` 更新目标文件的 `no-restricted-imports` pattern。

后端：

- 运行时代码按边界意图收敛；后端边界强制由测试（AST）验证。

## 3.3 第三步：同一变更里更新 contract 测试

前端：

- 同步更新：
  - `workflowBoundaryContract.test.ts`
  - `workflowPageBoundaryContract.test.ts`
  - `runBoundaryContract.test.ts`

后端：

- 同步更新：
  - `test_run_contract_boundaries.py`
  - `test_canonical_package_boundaries.py`
  - `test_engine_package_boundaries.py`

规则：边界规则改动不得脱离对应守卫测试单独提交。

## 3.4 第四步：合并前跑最小矩阵

优先跑边界矩阵，必要时再扩展全量测试。

---

## 4. 合并前最小验证矩阵

以下命令默认仓库根目录：

`D:\files\Project\Python\ai-writer-mvp`

## 4.1 前端边界矩阵

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run lint
npm --prefix frontend-react run test -- src/workflow-editor/workflowBoundaryContract.test.ts
npm --prefix frontend-react run test -- src/components/workflow-page/workflowPageBoundaryContract.test.ts
npm --prefix frontend-react run test -- packages/run-display/src/run-display/runBoundaryContract.test.ts
```

可选包构建验证：

```powershell
npm --prefix frontend-react run build:run-display-package
```

## 4.2 后端边界矩阵

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m pytest tests/test_run_contract_boundaries.py -q
python -m pytest tests/test_canonical_package_boundaries.py -q
python -m pytest tests/test_engine_package_boundaries.py -q
```

可选 metadata 一致性检查：

```powershell
python -m pytest tests/test_backend_package_metadata.py -q
```

## 4.3 CI 对齐检查

后端矩阵定义在：

- `.github/workflows/backend-package-matrix.yml`

当后端包边界变化时，需确认 matrix 路径与测试映射仍匹配。

---

## 5. 常见失败模式与修复

## 5.1 前端：深导入 run-display 内部

典型失败：

- 出现 `@aiwriter/run-display/...` 或 `packages/run-display/src/...` 导入

修复：

1. 替换为公共入口 `@aiwriter/run-display`。
2. 缺符号时先从 `frontend-react/packages/run-display/src/index.ts` 公开。
3. 重新运行 run-display 边界测试。

## 5.2 前端：workflow-editor 反向导入 workflow-page

典型失败：

- `src/workflow-editor/*` 相对导入到 `src/components/workflow-page/*`

修复：

1. 将共享逻辑放入 workflow-editor owner 模块或 runtime facade。
2. 保持 workflow-page 仅消费，不被反向依赖。
3. 重新运行 `workflowBoundaryContract.test.ts`。

## 5.3 前端：assembler 绕过 runtime facade

典型失败：

- `useWorkflowEditorPageAssembler.ts` 直接导入 workflow-editor 内部（domain/state/actions/operations 或未允许 controller）

修复：

1. 通过 `useWorkflowRuntime` 合同访问能力。
2. 若需新能力，先在 runtime facade 新增，再由 assembler 使用。

## 5.4 前端：workflow-page 低层回跳

典型失败：

- `canvas/run/graph/subgraph` 导入 `orchestration` 或 `shell`

修复：

1. 把编排逻辑上移到 `orchestration`。
2. 把渲染细节留在 `shell`。
3. 低层目录只暴露数据/行为契约，不反向依赖上层。

## 5.5 后端：包导入宿主传输层

典型失败：

- `backend_workflow_canonical/*` 或 `backend_workflow_engine/*` 导入 `api.*`/`fastapi.*`/`storage.*`

修复：

1. 将传输/持久化逻辑放回宿主层（`api`/`core`/`storage`）。
2. 保持包内代码按依赖方向纯化。
3. 重新跑 canonical/engine 边界测试。

## 5.6 后端：误恢复桥接文件

典型失败：

- 恢复了 `api/run_http_schemas.py`、`api/workflow_validator.py`、core engine bridge 等旧文件

修复：

1. 删除桥接文件，直接导入包 owner。
2. 确认“桥接文件应不存在”的测试继续通过。

---

## 6. 边界相关 PR 评审清单

在审批变更前确认：

1. 边界 owner 明确。
2. 生产规则与 guard tests 同步更新。
3. 第 4 节最小矩阵全绿。
4. 无新增深导入或反向依赖。
5. 无已移除桥接文件回流。

---

## 7. 维护规则

以下任一路径变化时更新本文：

- `frontend-react/eslint.config.js`
- `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`
- `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`
- `frontend-react/packages/run-display/src/run-display/runBoundaryContract.test.ts`
- `tests/test_run_contract_boundaries.py`
- `tests/test_canonical_package_boundaries.py`
- `tests/test_engine_package_boundaries.py`
- `.github/workflows/backend-package-matrix.yml`
