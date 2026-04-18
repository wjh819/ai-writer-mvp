# 项目操作命令清单

## 1. 范围与证据

本清单根据当前仓库配置文件生成：

- 根 Python 配置：`pyproject.toml`、`requirements.txt`、`pytest.ini`、`mypy.ini`、`ruff.toml`、`setup.cfg`
- 后端包配置：`contracts/pyproject.toml`、`backend_workflow_canonical/pyproject.toml`、`backend_workflow_engine/pyproject.toml`
- 前端配置：`frontend-react/package.json`、`frontend-react/vite.config.js`、`frontend-react/packages/run-display/package.json`
- 运行入口：`fastapi_app.py`、`frontend-react/src/api/core.ts`
- CI 参考：`.github/workflows/backend-package-matrix.yml`

以下命令默认仓库根目录：

`D:\files\Project\Python\ai-writer-mvp`

---

## 2. 全新环境初始化（从零开始）

### 2.1 后端（Python）

```powershell
cd D:\files\Project\Python\ai-writer-mvp
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

可选（以 editable 方式安装根包）：

```powershell
python -m pip install -e .
```

### 2.2 前端（npm workspace）

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react install
```

---

## 3. 启动命令

### 3.1 启动后端 API（FastAPI）

`frontend-react/src/api/core.ts` 指向 `http://127.0.0.1:8000/api`，因此后端应运行在 `127.0.0.1:8000`。

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
```

### 3.2 启动前端开发服务器（Vite）

`frontend-react/package.json` 的 `dev` 会先构建 `@aiwriter/run-display`，再启动 Vite。

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run dev
```

### 3.3 前端生产预览

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run build
npm --prefix frontend-react run preview
```

---

## 4. 测试命令

## 4.1 后端测试

运行后端全量测试（`pytest.ini` 中 `testpaths=tests`）：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

运行包边界聚焦测试（与 CI matrix 对齐）：

```powershell
python -m pytest tests/test_run_contract_boundaries.py tests/test_backend_package_metadata.py -q
python -m pytest tests/test_canonical_package_boundaries.py tests/test_workflow_validator.py -q
python -m pytest tests/test_engine_package_boundaries.py tests/test_engine_contract.py -q
```

## 4.2 后端静态检查

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m mypy
python -m ruff check .
```

## 4.3 前端测试

运行前端全量测试：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run test
```

监听模式：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run test:watch
```

运行边界/组件重点测试：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run test -- src/workflow-editor/workflowBoundaryContract.test.ts
npm --prefix frontend-react run test -- src/components/workflow-page/workflowPageBoundaryContract.test.ts
npm --prefix frontend-react run test -- packages/run-display/src/run-display/runBoundaryContract.test.ts
```

## 4.4 前端 lint

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run lint
```

---

## 5. 包构建命令

## 5.1 前端包（`@aiwriter/run-display`）

在仓库根执行：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run build:run-display-package
```

在包目录直接执行：

```powershell
cd D:\files\Project\Python\ai-writer-mvp\frontend-react\packages\run-display
npm run build
```

## 5.2 后端 wheel 包

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m build --wheel contracts
python -m build --wheel backend_workflow_canonical
python -m build --wheel backend_workflow_engine
```

构建根后端包：

```powershell
python -m build --wheel .
```

## 5.3 本地 matrix 风格安装/冒烟（CI 类似）

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install build pytest
python -m build --wheel contracts
python -m pip install --no-deps contracts/dist/*.whl
python -m build --wheel backend_workflow_canonical
python -m pip install --no-deps backend_workflow_canonical/dist/*.whl
python -m build --wheel backend_workflow_engine
python -m pip install --no-deps backend_workflow_engine/dist/*.whl
python -m pip install -r requirements.txt
python -m pip check
```

---

## 6. 一键常用路径

### 6.1 日常开发（双终端）

终端 A：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
```

终端 B：

```powershell
cd D:\files\Project\Python\ai-writer-mvp
npm --prefix frontend-react run dev
```

### 6.2 提交前质量检查

```powershell
cd D:\files\Project\Python\ai-writer-mvp
.\.venv\Scripts\Activate.ps1
python -m mypy
python -m ruff check .
python -m pytest -q
npm --prefix frontend-react run lint
npm --prefix frontend-react run test
```
