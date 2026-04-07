# 仓库前置审查报告

> 审查日期: 2026-04-07

## 1. 项目入口

### HTTP 入口
- **文件**: `fastapi_app.py`
- **类型**: FastAPI 应用
- **端口**: 默认 8000 (需确认实际运行配置)
- **路由聚合**: `api/workflows.py` 作为 router 聚合入口

### 路由模块
| 路由文件 | 路径前缀 | 职责 |
|---------|---------|------|
| `workflow_routes.py` | `/api/workflows` | workflow CRUD、保存、加载 |
| `run_routes.py` | `/api/workflows/{canvas_id}/run-draft` | 全量执行 |
| `run_routes.py` | `/api/workflows/{canvas_id}/test-subgraph` | 子图测试 |
| `prompt_routes.py` | `/api/prompts` | prompt 模板管理 |
| `model_resource_routes.py` | `/api/model-resources` | 模型资源配置 |

---

## 2. 主链路

### 2.1 Workflow 保存链路

```
前端 editor payload
    ↓
route: save_workflow (POST /api/workflows/{canvas_id})
    ↓
split_save_workflow_payload() → 分离 workflow / sidecar
    ↓
normalize_workflow_editor_data() → shape 收敛
    ↓
validate_workflow_editor_data()
    ├─ validate_workflow_structure() → 结构校验
    └─ validate_workflow_dependencies() → 依赖校验
    ↓
editor_schema_to_yaml() → 转换为 YAML 持久化格式
    ↓
dump_canvas_workflow() → 写入 workflow.yaml
dump_canvas_metadata() → 写入 metadata.yaml (如不存在)
dump_canvas_sidecar() → 写入 sidecar.yaml (如有)
```

### 2.2 Workflow 加载链路

```
route: get_workflow (GET /api/workflows/{canvas_id})
    ↓
load_workflow_for_editor_by_canvas_id()
    ├─ load_canonical_workflow_from_canvas_id()
    │     ├─ load_yaml_workflow() → 读取 workflow.yaml
    │     ├─ yaml_to_editor_schema() → 转换为 canonical raw shape
    │     └─ normalize_workflow_editor_data() → shape 收敛
    │
    └─ load_canvas_sidecar_or_empty() → 读取 sidecar.yaml
    ↓
返回 { workflow, sidecar, warnings }
```

### 2.3 Workflow 执行链路

```
route: run_workflow_draft (POST /api/workflows/{canvas_id}/run-draft)
    ↓
normalize_workflow_editor_data() → shape 收敛
    ↓
validate_workflow_editor_data()
    ↓
execute_draft_workflow()
    ↓
WorkflowEngine(workflow_data, prompt_overrides)
    ├─ 加载 model_resource_registry
    ├─ 构建执行图 (data edges + contextLinks)
    ├─ 拓扑排序
    └─ 按序执行节点:
        ├─ input 节点: 从 input_state 读取值
        ├─ prompt 节点: 渲染模板 → 调用 LLM → 发布输出
        └─ output 节点: 聚合输入 → 发布最终结果
    ↓
WorkflowExecutionResult (success/failed)
    ↓
build_run_outcome_response() → HTTP 响应
```

### 2.4 子图测试链路

```
route: test_workflow_subgraph (POST /api/workflows/{canvas_id}/test-subgraph)
    ↓
validate_partial_execution_workflow()
    ↓
execute_partial_workflow()
    ↓
engine.run_subgraph(start_node_id, end_node_ids, test_state)
```

---

## 3. 关键文件分组与关系

### 3.1 合约层 (`contracts/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `workflow_contracts.py` | WorkflowEditorData、节点类型、边类型定义 | normalize | validator, engine |
| `workflow_sidecar_contracts.py` | WorkflowSidecarData、节点资产定义 | sidecar_io | 前端展示 |
| `model_resource_contracts.py` | ModelResourceRecord、引用扫描结果 | storage | API DTO |
| `step_projections.py` | 执行步骤投影 | engine | run_result_mapper |

### 3.2 核心层 (`core/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `engine.py` | Workflow 执行引擎 | WorkflowEditorData | WorkflowExecutionResult |
| `llm.py` | LLM 客户端创建与调用 | model_resource | engine |
| `model_resource_registry.py` | 运行时 registry 投影 | storage | engine, validator |
| `execution_types.py` | 执行结果内部结构 | engine | workflow_run_service |

### 3.3 API 层 (`api/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `workflow_normalizer.py` | canonical shape 收敛 | converter | validator |
| `workflow_validator.py` | 结构/依赖合法性裁决 | normalize | engine |
| `workflow_converter.py` | YAML ↔ editor schema 转换 | loader/save | normalize |
| `workflow_run_service.py` | 执行服务层 | engine | HTTP response |
| `workflow_loader.py` | 加载链路门面 | routes | 各子模块 |
| `workflow_yaml_io.py` | YAML 文件读写 | loader | filesystem |
| `workflow_sidecar_io.py` | sidecar 文件读写 | loader | filesystem |
| `workflow_metadata_io.py` | metadata 文件读写 | loader | filesystem |
| `workflow_paths.py` | 路径规则常量 | all | filesystem |
| `workflow_canonical_loader.py` | canonical load 入口 | loader | converter |
| `workflow_editor_loader.py` | editor load 入口 | loader | converter |
| `error_translator.py` | AppError → HTTPException | routes | - |
| `run_http_schemas.py` | run 请求/响应 DTO | routes | - |
| `run_outcome.py` | 执行结果响应构建 | run_routes | - |
| `run_result_mapper.py` | 执行步骤投影 | run_outcome | - |
| `model_resource_http_schemas.py` | model resource DTO | routes | - |
| `model_resource_reference_service.py` | 删除保护扫描 | routes | - |

### 3.4 存储层 (`storage/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `model_resource_store.py` | model resource 文件 IO | core registry | config/model_resources.json |

### 3.5 共享层 (`shared/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `model_resource_config_shared.py` | 路径常量、provider 支持、归一化规则 | storage | - |

### 3.6 工具层 (`utils/`)

| 文件 | 职责 | 上游 | 下游 |
|-----|------|-----|------|
| `prompt_loader.py` | prompt 模板文件加载 | validator, engine | prompt/*.txt |

### 3.7 错误层 (`app_errors.py`)

| 异常类型 | 语义 | 触发场景 |
|---------|------|---------|
| `AppError` | 应用内部异常基类 | - |
| `NotFoundError` | 资源不存在 | workflow/model resource 未找到 |
| `InvalidInputError` | 调用参数非法 | validator 失败 |
| `InvalidStoredDataError` | 持久化数据损坏 | 存储层读取失败 |
| `WorkflowLoadError` | workflow 文件无法解析 | loader 失败 |
| `WorkflowSidecarLoadError` | sidecar 文件非法 | sidecar_io 失败 |
| `ModelResourceConfigError` | model resource 配置非法 | storage 失败 |
| `ModelResourceDeleteBlockedError` | 删除被阻止 | 引用扫描发现依赖 |

---

## 4. 兼容层/旧字段/包装层

### 4.1 已废弃字段（根据代码注释推断）

| 位置 | 旧字段 | 当前状态 | 说明 |
|-----|-------|---------|------|
| `PromptNodeConfig` | `context` | 已移除 | 窗口关系已迁移到顶层 `contextLinks` |
| `PromptNodeConfig` | `sourcePromptNodeId` | 已移除 | 同上 |
| `PromptNodeConfig` | `forkMode` | 已移除 | 同上 |
| `WorkflowRunError` | `state` | 兼容保留 | 现在应使用 `partial_state` |

### 4.2 命名兼容

| 位置 | 兼容名称 | 真实语义 | 说明 |
|-----|---------|---------|------|
| `ModelResourceReference` | `workflow_name` | 实为 `canvas_id` | 字段名保留旧命名 |
| `model_resource_registry.py` | `load_model_resource_registry_from_file` | 兼容函数 | 新调用应使用 `load_model_resource_registry()` |

### 4.3 包装层/门面

| 文件 | 角色 | 说明 |
|-----|------|------|
| `api/workflows.py` | router 聚合入口 | 向 fastapi_app 暴露单一 workflow_router |
| `api/workflow_loader.py` | 加载链路门面 | 统一导出所有加载相关函数 |

---

## 5. 不确定点清单

### 5.1 架构相关

1. **前端架构未知**: 未审查 `frontend-react/` 目录，不了解前端与后端的契约边界
2. **部署配置未知**: 未找到 Dockerfile、docker-compose.yaml 或其他部署配置
3. **测试覆盖未知**: 只看到 `.pytest_cache`，未审查测试文件结构与覆盖率

### 5.2 数据流相关

4. **持久化 run 记录**: 当前执行结果仅在内存中，未发现持久化 run 记录的实现
5. **session 管理**: 未发现 session 概念，`canvas_id` 是否等同于 session 存疑
6. **window_id 持久化**: 代码注释明确说明 window_id 是 run-local synthetic identifier，无 durable identity

### 5.3 业务规则相关

7. **contextLinks outbound 规则**: 代码注释提到当前实现重点是"最多一个 continue"，可能弱于完整业务目标
8. **validator 与 engine 重复**: 代码注释明确提到存在"防御性规则重复"
9. **OutputNodeConfig 命名**: 代码注释提到当前仍使用 "output" 命名，后续可能迁到 aggregate 语义

### 5.4 配置相关

10. **model_resources.json 结构**: 未审查实际配置文件内容
11. **API key 安全**: 配置文件中明文存储 api_key，未发现密钥管理机制

### 5.5 文件相关

12. **workflow 目录结构**: 存在 `workflows/111/`、`workflows/112/` 等目录，命名规则不明确
13. **prompt 模板来源**: 存在 `prompt/draft.txt`、`prompt/outline.txt` 等，但未明确它们是否被 workflow 引用

---

## 6. 下一轮需要确认的问题

### 6.1 项目定位

1. 这个项目的目标是什么？是内部工具、演示项目、还是计划对外发布的产品？
2. 当前的使用状态是什么？是开发中、已上线、还是需要重构？

### 6.2 前端边界

3. 前端 `frontend-react/` 使用了什么技术栈？
4. 前端与后端的 API 契约是如何管理的？是否有共享类型定义？

### 6.3 数据持久化

5. 是否需要持久化执行历史（run history）？
6. 是否需要 session 管理功能？
7. window 概念是否需要跨 run 持久化？

### 6.4 安全与配置

8. API key 管理是否有计划迁移到环境变量或密钥管理服务？
9. 是否需要支持多个模型 provider（当前只支持 openai_compatible）？

### 6.5 测试与质量

10. 当前测试覆盖率如何？是否有集成测试？
11. 是否有 CI/CD 配置？

### 6.6 待处理的技术债

12. 代码中多处注释提到"待收口点"，这些是否在本次修改范围内？
13. `OutputNodeConfig` 是否需要重命名为 `AggregateNodeConfig`？

### 6.7 功能边界

14. 是否需要支持更多节点类型（当前只有 input/prompt/output）？
15. 子图测试的完整业务语义是什么？是开发调试用还是面向用户功能？

---

> 审查完成，等待下一轮确认后进入需求澄清阶段。
