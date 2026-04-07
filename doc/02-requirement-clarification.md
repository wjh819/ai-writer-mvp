# 需求澄清文档

> 澄清日期: 2026-04-07

---

## 1. 重构目标

### 首要目标
**清理旧命名/旧字段** - 移除兼容层、统一命名、删除废弃字段

### 非目标
- 不改变代码架构
- 不改变业务逻辑
- 不涉及 Docker 容器化
- 不涉及 PyPI 打包

---

## 2. 打包需求

| 需求项 | 选择 | 说明 |
|-------|------|------|
| 部署目标 | 完整启动脚本 | 包含环境检查、依赖安装、服务启动 |
| 脚本范围 | start.sh / start.bat | 后端服务启动 + 前端启动（可选） |

---

## 3. 旧命名/旧字段处理

### 处理策略
**彻底移除** - 不保留兼容层，直接改名/删除

### 需要处理的项

| 序号 | 类型 | 当前名称 | 目标名称/处理 | 影响文件 |
|-----|-----|---------|--------------|---------|
| 1 | 函数 | `load_model_resource_registry_from_file` | 删除 | `core/model_resource_registry.py` |
| 2 | 属性 | `WorkflowRunError.state` | 删除，只用 `partial_state` | `core/execution_types.py` |
| 3 | 字段 | `ModelResourceReference.workflow_name` | 改为 `canvas_id` | `contracts/model_resource_contracts.py` |
| 4 | 类 | `OutputNodeConfig` | 改为 `AggregateNodeConfig` | `contracts/workflow_contracts.py` |
| 5 | 类 | `OutputSuccessExecutionStep` | 改为 `AggregateSuccessExecutionStep` | `core/execution_types.py` |
| 6 | 类 | `OutputFailedExecutionStep` | 改为 `AggregateFailedExecutionStep` | `core/execution_types.py` |
| 7 | 字面量 | `type: "output"` | 改为 `type: "aggregate"` | YAML/JSON 持久化格式 |

---

## 4. 前端处理

| 需求项 | 选择 |
|-------|------|
| 是否在范围内 | **同步更新** |
| 具体工作 | 后端改名后，同步更新前端类型定义和 API 调用 |

---

## 5. 执行顺序

按依赖关系从底层到顶层：

```
阶段1: 合约层 contracts/
  ├─ workflow_contracts.py (OutputNodeConfig → AggregateNodeConfig)
  ├─ model_resource_contracts.py (workflow_name → canvas_id)
  └─ step_projections.py (如有相关)
    ↓
阶段2: 核心层 core/
  ├─ execution_types.py (Output* → Aggregate*, 移除 .state)
  └─ model_resource_registry.py (删除兼容函数)
    ↓
阶段3: API 层 api/
  ├─ workflow_validator.py (更新类型引用)
  ├─ workflow_normalizer.py (更新类型引用)
  ├─ workflow_converter.py (更新 type 字面量)
  ├─ model_resource_reference_service.py (更新字段引用)
  └─ 其他引用文件
    ↓
阶段4: 存储层 storage/ + shared/
  └─ 无直接影响
    ↓
阶段5: 前端 frontend-react/
  ├─ 类型定义文件 (同步改名)
  └─ API 调用代码 (同步字段名)
```

---

## 6. 约束条件

| 约束 | 选择 | 说明 |
|-----|------|------|
| 提交方式 | **分阶段提交** | 每次只改一个模块，便于回滚 |
| 测试要求 | **必须通过测试** | 每个阶段完成后测试必须通过 |
| 数据兼容 | 不要求 | 彻底移除策略，不保证旧数据兼容 |

---

## 7. 文件处理

| 目录/文件 | 处理方式 |
|----------|---------|
| `workflows/111/` | 保留 |
| `workflows/112/` | 保留 |
| `workflows/article/` | 保留 |

---

## 8. 连锁影响分析

### 8.1 `workflow_name` → `canvas_id`

| 影响范围 | 具体影响 |
|---------|---------|
| API 响应 | `ModelResourceDeleteBlockedDetail.references[].workflow_name` → `canvas_id` |
| API 响应 | `IncompleteWorkflowReferenceScanItem.workflow_name` → `canvas_id` |
| 前端 | 需同步更新对应字段引用 |

### 8.2 `OutputNodeConfig` → `AggregateNodeConfig`

| 影响范围 | 具体影响 |
|---------|---------|
| 类型引用 | `isinstance(config, OutputNodeConfig)` → `AggregateNodeConfig` |
| YAML 格式 | `type: output` → `type: aggregate` |
| 现有文件 | `workflows/**/*.yaml` 中的 `type: output` 需迁移 |
| 前端 | 类型定义同步改名 |

### 8.3 `WorkflowRunError.state` 删除

| 影响范围 | 具体影响 |
|---------|---------|
| 调用方 | `exc.state` → `exc.partial_state` |
| 注释 | 代码注释中提到的兼容说明可移除 |

### 8.4 `load_model_resource_registry_from_file` 删除

| 影响范围 | 具体影响 |
|---------|---------|
| 调用方 | 无外部调用（已是兼容函数） |

---

## 9. 启动脚本需求

### 功能要求
- 环境检查（Python 版本、依赖）
- 依赖安装（pip install）
- 后端服务启动（uvicorn）
- 前端服务启动（npm run dev，可选）

### 脚本文件
- `start.sh` (Linux/macOS)
- `start.bat` (Windows)

---

## 10. 待确认事项

完成本阶段后，进入实施方案设计阶段。以下问题在设计阶段处理：

1. **YAML 迁移策略**: 是否提供迁移脚本自动转换现有 workflow.yaml？
2. **测试用例更新**: 改名后测试用例需要同步更新
3. **前端文件清单**: 需要具体列出哪些前端文件需要修改

---

> 需求澄清完成。等待用户确认后进入实施方案设计阶段。
