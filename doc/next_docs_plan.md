# 下一阶段文档计划（基于代码事实）- 已同步

最后同步日期：2026-04-18

## 1. 当前文档基线

当前保留文档：

- `doc/project_operation_commands.md`
- `doc/current_architecture_baseline.md`
- `doc/frontend_workflow_page_responsibility_map.md`
- `doc/package_release_and_ci_matrix.md`
- `doc/boundary_contract_tests_guide.md`

当前状态：保留文档与既定计划批次一致。

---

## 2. 计划批次状态（2.1 - 2.4）

| 项目 | 计划文件 | 状态 | 完成说明 |
| --- | --- | --- | --- |
| 2.1 | `doc/current_architecture_baseline.md` | 已完成 | 已基于当前代码事实完成架构基线快照。 |
| 2.2 | `doc/frontend_workflow_page_responsibility_map.md` | 已完成 | 已完成 `workflow-page` 文件职责地图。 |
| 2.3 | `doc/package_release_and_ci_matrix.md` | 已完成 | 已完成包发布路径与 CI 矩阵语义说明。 |
| 2.4 | `doc/boundary_contract_tests_guide.md` | 已完成 | 已完成前后端边界守卫与测试指南。 |

批次总结：2.1-2.4 无待办项。

---

## 3. 批次后维护同步

## 3.1 维护优先级

1. 架构基线文档需随模块 owner 与边界变化同步。
2. workflow-page 职责地图需随文件级重构同步。
3. 包发布与 CI 矩阵需随版本/流程变化同步。
4. 边界 contract 测试指南需随 lint 与守卫规则同步。

## 3.2 触发路径与文档映射

| 触发的代码/配置变化 | 需要更新的文档 |
| --- | --- |
| `api/routes/*`, `api/workflow_*`, `fastapi_app.py` | `current_architecture_baseline.md` |
| `contracts/*`, `backend_workflow_canonical/*`, `backend_workflow_engine/*` | `current_architecture_baseline.md`, `package_release_and_ci_matrix.md`, `boundary_contract_tests_guide.md` |
| `frontend-react/src/components/workflow-page/*` | `current_architecture_baseline.md`, `frontend_workflow_page_responsibility_map.md`, `boundary_contract_tests_guide.md` |
| `frontend-react/packages/run-display/*` | `current_architecture_baseline.md`, `package_release_and_ci_matrix.md`, `boundary_contract_tests_guide.md` |
| `frontend-react/eslint.config.js` | `boundary_contract_tests_guide.md` |
| `tests/test_*package*boundaries.py` | `boundary_contract_tests_guide.md` |
| `.github/workflows/backend-package-matrix.yml` | `package_release_and_ci_matrix.md`, `boundary_contract_tests_guide.md` |

---

## 4. 同步规则

当 3.2 中任一触发路径发生变更时，需要在同一个变更集内更新对应文档。

本文件只跟踪：

1. 文档计划批次状态
2. 维护映射
3. 完成状态变迁
