# 包发布与 CI 矩阵说明

## 1. 范围与事实来源

本文定义当前仓库中各 package owner 的发布/构建/测试语义。

主要事实来源文件：

- 后端 CI 矩阵：`.github/workflows/backend-package-matrix.yml`
- 后端包配置：
  - `contracts/pyproject.toml`
  - `backend_workflow_canonical/pyproject.toml`
  - `backend_workflow_engine/pyproject.toml`
- 前端包配置：
  - `frontend-react/packages/run-display/package.json`
  - `frontend-react/package.json`

---

## 2. 当前包清单

| 包 owner | 包名 | 版本文件 | 产物类型 | 当前依赖方向 |
| --- | --- | --- | --- | --- |
| Run contracts | `aiwriter-run-contracts` | `contracts/pyproject.toml` | Python wheel（`.whl`） | 基础层；不依赖 canonical/engine |
| Canonical | `aiwriter-workflow-canonical` | `backend_workflow_canonical/pyproject.toml` | Python wheel（`.whl`） | 依赖 `aiwriter-run-contracts>=0.1.0` |
| Engine | `aiwriter-workflow-engine` | `backend_workflow_engine/pyproject.toml` | Python wheel（`.whl`） | 依赖 `aiwriter-run-contracts>=0.1.0` |
| Run display | `@aiwriter/run-display` | `frontend-react/packages/run-display/package.json` | npm 包（`dist/index.js` + `.d.ts`） | 被宿主应用 `frontend-react` 消费 |

补充耦合：

- `frontend-react/package.json` 当前固定 `@aiwriter/run-display` 版本为 `"0.1.0"`。

---

## 3. 版本策略与升级顺序

## 3.1 当前版本策略

采用“按包独立版本”。

- Python 包：各包 `pyproject.toml` 的 `[project].version`
- 前端 run-display：`frontend-react/packages/run-display/package.json` 的 `version`

## 3.2 版本提升触发矩阵

| 变更范围 | 必需 bump |
| --- | --- |
| `contracts/*` 的公开模型或行为变化 | bump `aiwriter-run-contracts` |
| `backend_workflow_canonical/*` 的公开行为/API 变化 | bump `aiwriter-workflow-canonical` |
| `backend_workflow_engine/*` 的公开行为/API 变化 | bump `aiwriter-workflow-engine` |
| `frontend-react/packages/run-display/*` 的公开导出/类型/UI 行为变化 | bump `@aiwriter/run-display` |
| 宿主应用开始消费新 run-display 版本 | 更新 `frontend-react/package.json` 依赖版本 |

## 3.3 推荐发布顺序

后端推荐顺序：

1. `aiwriter-run-contracts`（如有变更）
2. `aiwriter-workflow-canonical`（如有变更）
3. `aiwriter-workflow-engine`（如有变更）

原因：

- canonical 与 engine 都依赖 run-contracts。
- 先发依赖 owner，可避免下游安装版本歧义。

前端 `@aiwriter/run-display` 与后端 wheel 顺序独立，可单独发布。

---

## 4. 本地构建、安装、冒烟命令

默认仓库根目录：

`D:\files\Project\Python\ai-writer-mvp`

## 4.1 后端包（与 CI 对齐）

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install build pytest

# 清理产物
Remove-Item contracts/build, contracts/dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item backend_workflow_canonical/build, backend_workflow_canonical/dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item backend_workflow_engine/build, backend_workflow_engine/dist -Recurse -Force -ErrorAction SilentlyContinue

# 构建并安装 run-contracts
python -m build --wheel contracts
python -m pip install --no-deps contracts/dist/*.whl

# 构建并安装 canonical
python -m build --wheel backend_workflow_canonical
python -m pip install --no-deps backend_workflow_canonical/dist/*.whl

# 构建并安装 engine
python -m build --wheel backend_workflow_engine
python -m pip install --no-deps backend_workflow_engine/dist/*.whl

# 安装运行依赖并检查依赖图
python -m pip install -r requirements.txt
python -m pip check
```

后端冒烟/测试：

```powershell
python -m pytest tests/test_run_contract_boundaries.py tests/test_backend_package_metadata.py -q
python -m pytest tests/test_canonical_package_boundaries.py tests/test_workflow_validator.py -q
python -m pytest tests/test_engine_package_boundaries.py tests/test_engine_contract.py -q
```

## 4.2 前端 `@aiwriter/run-display` 包

在仓库根构建：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run build:run-display-package
```

在包目录直接构建：

```powershell
cd D:\files\Project\Python\ai-writer-mvp\frontend-react\packages\run-display
npm run build
```

前端边界验证：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run test -- packages/run-display/src/run-display/runBoundaryContract.test.ts
npm --prefix frontend-react run test -- src/workflow-editor/workflowBoundaryContract.test.ts
npm --prefix frontend-react run test -- src/components/workflow-page/workflowPageBoundaryContract.test.ts
```

---

## 5. CI 矩阵解读（后端）

当前矩阵文件：

- `.github/workflows/backend-package-matrix.yml`

## 5.1 矩阵行定义

| 行名 | 包路径 | 边界测试 | 冒烟导入目标 |
| --- | --- | --- | --- |
| `run-contracts` | `contracts` | `tests/test_run_contract_boundaries.py tests/test_backend_package_metadata.py` | 模块 `contracts.run_contracts`，符号 `RunResult` |
| `canonical` | `backend_workflow_canonical` | `tests/test_canonical_package_boundaries.py tests/test_workflow_validator.py` | 模块 `backend_workflow_canonical`，符号 `validate_workflow_editor_data` |
| `engine` | `backend_workflow_engine` | `tests/test_engine_package_boundaries.py tests/test_engine_contract.py` | 模块 `backend_workflow_engine`，符号 `WorkflowEngine` |

## 5.2 工作流验证内容

1. 每个目标包可构建 wheel。
2. wheel 可从 `site-packages` 被安装并导入（非本地源码路径）。
3. 包对应测试通过。
4. 安装后的依赖图合法（`pip check`）。

## 5.3 依赖引导策略

- 对 `canonical` 与 `engine`，CI 会先构建/安装 run-contracts wheel（`bootstrap_contracts: true`）。
- 对 `run-contracts`，不执行该引导（`bootstrap_contracts: false`）。

---

## 6. 发布检查清单

## 6.1 后端包发布清单

每个后端包发布前：

1. 更新目标 `pyproject.toml` 中 `[project].version`。
2. 若 run-contracts 变更：
   - 先 bump run-contracts
   - 评估 canonical/engine 的依赖下限是否需同步提升
3. 本地构建 wheel。
4. 在干净虚拟环境（或 CI 等价环境）安装 wheel。
5. 运行变更包对应的边界测试。
6. 执行 `python -m pip check`。
7. 确认公共冒烟符号仍可导入。
8. 发布/上传产物。

## 6.2 前端 run-display 发布清单

1. 更新 `frontend-react/packages/run-display/package.json` 版本。
2. 若宿主需消费新版本，同步更新 `frontend-react/package.json` 依赖版本。
3. 构建包：`npm --prefix frontend-react run build:run-display-package`。
4. 运行边界测试：
   - `runBoundaryContract.test.ts`
   - `workflowBoundaryContract.test.ts`
   - `workflowPageBoundaryContract.test.ts`
5. 运行宿主构建：`npm --prefix frontend-react run build`。
6. 如需外部发布，再执行 npm registry 发布。

---

## 7. 现有缺口与后续 CI 扩展

当前 CI matrix 只覆盖后端包。

建议下一步：

1. 增加前端 `@aiwriter/run-display` CI 作业：
   - 构建 run-display 包
   - 运行 `runBoundaryContract.test.ts`
   - 运行宿主边界测试 `workflowBoundaryContract.test.ts` 与 `workflowPageBoundaryContract.test.ts`
2. 增加前端包化触发路径：
   - `frontend-react/packages/run-display/**`
   - `frontend-react/eslint.config.js`
   - `frontend-react/src/workflow-editor/workflowBoundaryContract.test.ts`
   - `frontend-react/src/components/workflow-page/workflowPageBoundaryContract.test.ts`

这样可让前端包发布质量与后端 package matrix 的标准保持一致。
