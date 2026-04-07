# AI 可读版项目入口文档
## 0. 本套背景材料的使用优先级

本项目的背景材料按以下优先级使用：

1. 《AI 项目工作指令》
   负责：约束 AI 的工作纪律、判断边界、输出顺序。
   不负责：提供项目文件地图、主链地图、专题索引。

2. 《AI 可读版项目入口文档》
   负责：建立系统地图、文件地图、主链地图，并把问题分流到对应专题文档。
   不负责：替代专题文档回答字段级、规则级、运行时级细节。

3. 专题背景文档（00–09）
   负责：提供链路级背景说明、owner 边界、限制与样例说明。
   不负责：在未核对真实代码前替代代码事实。

补充规则：
- 08-persistent-shape-examples.md 只负责样例与误解澄清，不裁决 save/load owner。
- 09-known-limits-and-technical-debt.md 只负责限制与债务说明，不裁决正式 contract owner。
## 1. 本文档的用途

这份文档只给 AI 使用，不服务于人类读图或目录浏览。

本文档的目标只有四个：

1. 快速建立当前项目的正式主链认知。
2. 知道仓库里哪些目录和文件重要，哪些只是辅助、旁路或遗留。
3. 知道每一条正式链路由哪些文件组成，谁是 owner，谁不是 owner。
4. 在需要更深入的信息时，能够跳转到文末的 10 篇专题文档，而不是在仓库里盲目扩散。

本文档不是详细设计文档，不展开具体实现细节。它只负责建立系统地图、文件地图、主链地图和索引规则。

---

## 2. 本套背景材料的使用顺序

2.1 先读《AI 项目工作指令》
先确认工作纪律、判断分级、代码核对触发条件与输出顺序。

2.2 再读本入口文档
先建立当前系统正式主链、事实源、owner 与专题索引的全局地图。

2.3 再按当前问题跳转专题文档
字段级、规则级、链路级问题，必须跳到对应专题文档，不继续停留在入口文档。

2.4 文档背景不替代代码事实
本套背景材料只用于结构理解、主链判断、owner 初判、风险挂牌与待核对点整理。
一旦进入实现判断、兼容判断、代码行为核对或文件级修改建议，仍应按《AI 项目工作指令》转向真实代码。
---

## 3. 项目当前范围

### 3.1 当前正式入口

当前项目的正式入口是：

* 后端：`fastapi_app.py`
* 前端：`frontend-react/src/main.tsx` -> `App.tsx` -> `WorkflowEditor.tsx`

### 3.2 当前正式能力

当前正式能力包括：

* workflow 列表、加载、保存
* workflow direct run（`run-draft`）
* prompt 模板列表与读取
* model resource 管理
* 前端 workflow 编辑
* 前端 run result 展示

### 3.3 当前不纳入正式主链的内容

以下内容不应被默认视为当前正式主链：

* `sessions/`：会话 / 历史相关目录，不属于当前 direct run 主链
* `app.py`：Streamlit 直跑入口，更接近早期演示或辅助脚本
* `visualize.py`：Graphviz 可视化辅助脚本
* `workflow`：Graphviz dot 文本产物 / 中间文件
* `workflows/` 下旧单文件 YAML：历史遗留布局，不是当前正式 save/load 布局

---

## 4. 先记住的正式事实源

AI 在理解这个项目时，必须先记住下面四类事实源：

### 4.1 workflow 保存态事实源

正式 workflow 保存态事实源是：

* `workflows/<canvas_id>/workflow.yaml`

这是 workflow contract 本体。

### 4.2 canvas 展示壳 / 元数据事实源

* `workflows/<canvas_id>/metadata.yaml`

它是展示壳和元数据，不是 workflow contract 本体。

### 4.3 model resource 配置事实源

* `config/model_resources.json`

这是 model resource 文件配置事实源。

### 4.4 prompt 模板事实源

* `prompt/*.txt`

template 模式下的 prompt 模板正文来自这里。

---

## 5. 正式主链总览

当前系统可先按四条正式主链理解：
1. 后端 workflow canonical / save-load 链
2. 后端 direct run / execution 链
3. 后端 model resource 管理链
4. 前端 editor / graph / run display 链

其中，前端 run display 是前端主链中的后置消费段，不单独拥有后端 transport 或 execution owner 身份。

可以把当前系统理解为：

前端编辑器负责编辑当前画布、发起保存和运行；后端负责 canonical 化、校验、执行与 transport 输出；前端再把 `RunResult` 消费成 `DisplayRun` 并展示。

---

## 6. 分层规则：先看层，再看文件

本项目可以按下面的层次理解。

### 6.1 L0：事实源 / 持久化文件层

这一层不是逻辑实现层，而是事实源：

* `workflows/<canvas_id>/workflow.yaml`
* `workflows/<canvas_id>/metadata.yaml`
* `config/model_resources.json`
* `prompt/*.txt`

### 6.2 L1：持久化与共享规则层

这一层负责文件级共享规则或 IO：

* `shared/model_resource_config_shared.py`
* `storage/model_resource_store.py`
* `utils/prompt_loader.py`

### 6.3 L2：共享 contract / 错误语言层

这一层定义跨层共享的正式结构：

* `contracts/workflow_contracts.py`
* `contracts/step_projections.py`
* `contracts/model_resource_contracts.py`
* `app_errors.py`

### 6.4 L3：后端核心运行层

这一层承载真正核心运行逻辑：

* `core/model_resource_registry.py`
* `core/llm.py`
* `core/execution_types.py`
* `core/engine.py`

### 6.5 L4：后端 workflow / run / model-resource 编排层

这一层负责把事实源、contract、核心逻辑和 HTTP 路由串起来：

* `api/workflow_converter.py`
* `api/workflow_normalizer.py`
* `api/workflow_validator.py`
* `api/workflow_loader.py`
* `api/workflow_run_service.py`
* `api/run_result_mapper.py`
* `api/run_http_schemas.py`
* `api/run_outcome.py`
* `api/model_resource_reference_service.py`
* `api/model_resource_http_schemas.py`
* `api/error_translator.py`
* `api/workflows.py`

### 6.6 L5：后端入口层

* `fastapi_app.py`

### 6.7 F0：前端共享 / mirror type 层

* `frontend-react/src/shared/workflowSharedTypes.ts`
* `frontend-react/src/workflow-editor/workflowEditorTypes.ts`
* `frontend-react/src/workflow-editor/workflowEditorGraphTypes.ts`
* `frontend-react/src/workflow-editor/workflowEditorUiTypes.ts`
* `frontend-react/src/run/runTypes.ts`
* `frontend-react/src/model-resources/modelResourceTypes.ts`

### 6.8 F1：前端 request / transport / operations 层

* `frontend-react/src/api.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorRequests.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorMappers.ts`
* `frontend-react/src/workflow-editor/operations/workflowEditorOperations.ts`

### 6.9 F2：前端 domain rule 层

* `frontend-react/src/workflow-editor/domain/promptVariableHints.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorConfig.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorGraph.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorHelpers.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorNodeFactory.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorSemantic.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorValidationRules.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorValidators.ts`

### 6.10 F3：前端 state / view derivation 层

* `frontend-react/src/workflow-editor/state/workflowEditorRunInputs.ts`
* `frontend-react/src/workflow-editor/state/workflowEditorSelection.ts`
* `frontend-react/src/workflow-editor/state/workflowEditorViewState.ts`

### 6.11 F4：前端 actions / controllers 层

* `frontend-react/src/workflow-editor/actions/workflowEditorActions.ts`
* `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`
* `frontend-react/src/workflow-editor/controllers/useWorkflowGraphEditor.ts`

### 6.12 F5：前端组件 / 展示层

* `frontend-react/src/components/WorkflowEditor.tsx`
* `frontend-react/src/components/WorkflowSidebar.tsx`
* `frontend-react/src/components/NodeConfigPanel.tsx`
* `frontend-react/src/components/WorkflowModelResourcePanel.tsx`
* `frontend-react/src/components/WorkflowNode.tsx`
* `frontend-react/src/components/WorkflowSelectionBar.tsx`
* `frontend-react/src/components/node-config/*`
* `frontend-react/src/components/run/*`

### 6.13 F6：前端入口层

* `frontend-react/src/App.tsx`
* `frontend-react/src/main.tsx`

---

## 7. 关键 owner 规则

AI 在读文件时，优先按 owner 规则理解，不要混淆。

### 7.1 workflow canonical contract owner

* `contracts/workflow_contracts.py`

这里定义 workflow shared canonical contract。
前端编辑态、后端 save/load 链和 engine 执行都围绕它建立。

### 7.2 direct run HTTP transport contract owner

* `api/run_http_schemas.py`

这里拥有 direct run API transport DTO。
它不是 engine execution facts owner。

### 7.3 execution facts owner

* `core/execution_types.py`

这里定义 engine 与 run service 之间的内部 execution facts contract。

### 7.4 model resource 文件 IO owner

* `storage/model_resource_store.py`

`config/model_resources.json` 的唯一文件 IO owner 是这里。

### 7.5 model resource runtime resolve owner

* `core/model_resource_registry.py`

这里拥有运行时 registry 投影和 resolve 入口，不负责文件 IO。

### 7.6 workflow 文件系统入口与路径规则 owner

* `api/workflow_loader.py`

这里负责 workflow 文件路径规则、读取写回与 load 壳层分流。

### 7.7 前端 workflow canonical mirror type 锚点

* `frontend-react/src/workflow-editor/workflowEditorTypes.ts`

它是后端 canonical contract 的前端 mirror type，不是后端 contract owner。

### 7.8 前端 direct run transport mirror type 锚点

* `frontend-react/src/run/runTypes.ts`

它是后端 `RunResult / StepProjection` 的前端 mirror，不是后端 transport owner。

### 7.9 前端 run display model owner

* `frontend-react/src/components/run/runDisplayModels.ts`

这里拥有前端展示层消费的 display model，不是 transport owner。

### 7.10 route 层不是 contract owner

* `api/workflows.py`

它是主路由和编排入口，不拥有 workflow contract、engine 语义或文件 IO 规则。

---

## 8. 后端正式链路

### 8.1 workflow canonical / save-load 链

这条链回答的是：

* workflow 的正式 shape 是什么
* YAML 如何映射到 canonical 结构
* normalize 和 validator 的边界是什么
* editor load 和 canonical load 有什么区别
* save 正式顺序是什么

这条链的核心文件是：

* `contracts/workflow_contracts.py`
* `api/workflow_converter.py`
* `api/workflow_normalizer.py`
* `api/workflow_validator.py`
* `api/workflow_loader.py`
* `api/workflows.py`

正式 load 链可以线性理解为：

`GET /workflows/{canvas_id}`
-> `api/workflows.py`
-> `api/workflow_loader.py`
-> `api/workflow_converter.py`
-> `api/workflow_normalizer.py`
-> `api/workflow_validator.py`
-> 返回 workflow 与 warnings

正式 save 链可以线性理解为：

前端当前画布 transport shape
-> `api/workflows.py`
-> `api/workflow_normalizer.py`
-> `api/workflow_validator.py`
-> `api/workflow_converter.py`
-> `api/workflow_loader.py`
-> 写回 `workflow.yaml` 与 `metadata.yaml`

阅读这条链时要记住：

* converter 负责 shape mapping，不负责默认值和合法性裁决
* normalizer 负责最小 shape 收敛，不负责业务默认值裁决
* validator 才是正式合法性裁决者
* loader 负责文件系统路径、读写与 editor/canonical load 分流

### 8.2 direct run / execution 链

这条链回答的是：

* `run-draft` 经过哪些层
* engine 的内部产物是什么
* `RunResult` 从哪里投影出来
* success / failed 语义如何分层
* prompt window 运行时状态在哪里维护

这条链的核心文件是：

* `api/run_http_schemas.py`
* `api/workflow_run_service.py`
* `core/engine.py`
* `core/execution_types.py`
* `api/run_result_mapper.py`
* `api/run_outcome.py`
* `api/workflows.py`

正式 run-draft 链可以线性理解为：

前端当前画布 transport shape
-> `api/workflows.py`
-> `api/workflow_normalizer.py`
-> `api/workflow_validator.py`
-> `api/workflow_run_service.py`
-> `core/engine.py`
-> `core/execution_types.py`
-> `api/run_result_mapper.py`
-> `api/run_outcome.py`
-> 返回 `RunResult`

阅读这条链时要记住：

* `core/execution_types.py` 拥有内部 execution facts
* `api/run_http_schemas.py` 拥有 HTTP DTO
* `api/run_result_mapper.py` 只做 execution -> transport projection
* `api/run_outcome.py` 只做 response 收口
* engine 维护 run 内 prompt window 运行时状态

### 8.3 model resource 管理链

这条链回答的是：

* `config/model_resources.json` 如何被读取和写回
* 运行时 resolve 从哪里做
* 删除 model resource 时为什么会被阻止
* 删除扫描看什么

这条链的核心文件是：

* `config/model_resources.json`
* `shared/model_resource_config_shared.py`
* `storage/model_resource_store.py`
* `contracts/model_resource_contracts.py`
* `core/model_resource_registry.py`
* `api/model_resource_reference_service.py`
* `api/model_resource_http_schemas.py`
* `api/workflows.py`

阅读这条链时要记住：

* shared 层定义配置共享规则
* storage 层是文件 IO owner
* registry 层是 runtime resolve owner
* reference service 负责删除保护扫描
* route 层只是把管理链暴露为 HTTP 接口

---

## 9. 前端正式链路

### 9.1 前端 editor / page / controller 链

这条链回答的是：

* 页面怎么装配 workflow editor
* controller、operations、actions、domain、state 各自负责什么
* 当前画布状态、运行状态和页面展示状态如何分层

关键文件：

* `frontend-react/src/components/WorkflowEditor.tsx`
* `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`
* `frontend-react/src/workflow-editor/controllers/useWorkflowGraphEditor.ts`
* `frontend-react/src/workflow-editor/actions/workflowEditorActions.ts`
* `frontend-react/src/workflow-editor/operations/workflowEditorOperations.ts`
* `frontend-react/src/api.ts`

阅读这条链时要记住：

* 页面级装配在 `WorkflowEditor.tsx`
* 远端交互流程编排在 `workflowEditorOperations.ts`
* React 状态与副作用控制在 controllers
* 动作协调在 actions
* transport 请求封装在 `api.ts`

### 9.2 前端 graph rule / validation / view derivation 链

这条链回答的是：

* graph 规则 owner 在哪里
* 前端预检与后端 validator 的边界是什么
* graph truth 如何派生为视图状态
* inbound bindings、derivedTargetInputs、promptVariableHints 等只读派生信息在哪里生成

关键文件：

* `frontend-react/src/workflow-editor/domain/workflowEditorGraph.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorValidationRules.ts`
* `frontend-react/src/workflow-editor/domain/workflowEditorValidators.ts`
* `frontend-react/src/workflow-editor/state/workflowEditorViewState.ts`
* `frontend-react/src/workflow-editor/state/workflowEditorRunInputs.ts`
* `frontend-react/src/workflow-editor/domain/promptVariableHints.ts`

阅读这条链时要记住：

* 前端预检只是 UX 层快速暴露，不是正式裁决
* 正式裁决仍以后端 normalize + validator 为准
* graph 派生视图状态在 state 层，而不是组件层

### 9.3 前端 run display 消费链

这条链不是 direct run 主链本身，而是 direct run 结果返回后的消费链。

它回答的是：

* 前端如何把 `RunResult` 变成 `DisplayRun`
* `failure summary`、`writeback diff`、展示态模型在哪里生成
* 哪些组件负责展示 run result

关键文件：

* `frontend-react/src/run/runTypes.ts`
* `frontend-react/src/components/run/runDisplayMappers.ts`
* `frontend-react/src/components/run/runDisplayModels.ts`
* `frontend-react/src/components/run/runFailure.ts`
* `frontend-react/src/components/run/RunResultPanel.tsx`
* 以及 `components/run/` 目录下其他展示组件

线性理解方式：

后端返回 `RunResult`
-> `runTypes.ts` 作为 transport mirror
-> `runDisplayMappers.ts` 把 `RunResult` 映射成 `DisplayRun`
-> `runDisplayModels.ts` 提供展示层模型
-> `runFailure.ts` 提供失败摘要辅助
-> `RunResultPanel.tsx` 与相关组件渲染结果

阅读这条链时要记住：

* `runTypes.ts` 是 transport mirror，不是 transport owner
* `runDisplayModels.ts` 是 display model owner
* `runDisplayMappers.ts` 负责 `RunResult -> DisplayRun`
* stale run 是前端页面 / display 语义，不是后端 transport 语义

### 9.4 前端 model resource 面板链

如果问题落在 model resource 前端消费侧，优先看：

* `frontend-react/src/components/WorkflowModelResourcePanel.tsx`
* `frontend-react/src/model-resources/modelResourceTypes.ts`
* `frontend-react/src/api.ts`

这里要记住：

* `WorkflowModelResourcePanel.tsx` 当前是复合组件
* 它内聚了资源列表展示、局部表单状态、直接 API 调用、基础错误展示和删除阻止 detail 展示
* `modelResourceTypes.ts` 是前端镜像类型层，不是后端 owner

---

## 10. 仓库文件地图

下面按目录给出当前仓库的重要文件与定位。此处目标不是逐字复述目录树，而是让 AI 能建立“哪些文件存在、它们属于哪一层、为什么重要”的稳定地图。

### 10.1 根目录

* `fastapi_app.py`：FastAPI 主入口，挂载 `api.workflows` 路由到 `/api`
* `app_errors.py`：项目级业务错误定义
* `app.py`：Streamlit 直跑入口，属于旁路 / 演示型入口，不是正式主入口
* `visualize.py`：Graphviz 可视化辅助脚本，不属于正式运行链
* `requirements.txt`：Python 依赖清单
* `workflow`：Graphviz dot 中间产物，不是业务入口

### 10.2 `api/`

这是后端 route 与编排层。重要文件：

* `workflows.py`：workflow / prompt / model resource 主路由
* `workflow_converter.py`：YAML shape 与 canonical raw shape 转换层
* `workflow_normalizer.py`：canonical normalize 入口
* `workflow_validator.py`：canonical validator
* `workflow_loader.py`：workflow 文件系统入口和 load/save 壳层
* `workflow_run_service.py`：run execution result 壳层
* `run_http_schemas.py`：run transport DTO owner
* `run_result_mapper.py`：execution -> transport projection
* `run_outcome.py`：run response 收口
* `model_resource_reference_service.py`：model resource 删除保护扫描
* `model_resource_http_schemas.py`：model resource HTTP transport DTO
* `error_translator.py`：AppError -> HTTPException 翻译

### 10.3 `contracts/`

这是跨层共享 contract 层。重要文件：

* `workflow_contracts.py`：workflow canonical contract owner
* `step_projections.py`：step projection shared contract
* `model_resource_contracts.py`：model resource shared contract

### 10.4 `core/`

这是后端核心层。重要文件：

* `engine.py`：workflow 执行引擎
* `execution_types.py`：execution facts owner
* `model_resource_registry.py`：runtime registry / resolve 层
* `llm.py`：LLM 调用封装

### 10.5 `config/`

* `model_resources.json`：model resource 配置事实源

### 10.6 `shared/`

* `model_resource_config_shared.py`：model resource 配置共享规则

### 10.7 `storage/`

* `model_resource_store.py`：`model_resources.json` 文件 IO owner

### 10.8 `utils/`

* `prompt_loader.py`：prompt 模板列举与读取工具

### 10.9 `workflows/`

这是 workflow 正式存储目录。当前正式布局应为：

* `workflows/<canvas_id>/workflow.yaml`
* `workflows/<canvas_id>/metadata.yaml`

旧单文件 YAML 仍可能存在，但应视为历史遗留。

### 10.10 `prompt/`

这是 prompt 模板正文目录。template 模式从这里列举模板并读取内容。

### 10.11 `frontend-react/`

这是前端项目目录。重要部分如下。

#### `frontend-react/src/api.ts`

前端 HTTP request wrapper 层。负责 transport 调用，不负责页面状态管理、业务流程编排或展示态派生。

#### `frontend-react/src/components/`

这是页面渲染与页面装配层。重要文件：

* `WorkflowEditor.tsx`：页面级主控组件
* `WorkflowSidebar.tsx`：左侧操作入口
* `NodeConfigPanel.tsx`：节点配置主入口
* `WorkflowModelResourcePanel.tsx`：model resource 管理侧边面板
* `WorkflowNode.tsx`：ReactFlow 自定义节点组件
* `WorkflowSelectionBar.tsx`：选中态工具条

#### `frontend-react/src/components/node-config/`

按节点类型拆分的表单子目录：

* `InputNodeConfig.tsx`
* `OutputNodeConfig.tsx`
* `PromptNodeConfig.tsx`

#### `frontend-react/src/components/run/`

run result 展示链目录。重要文件：

* `runDisplayMappers.ts`
* `runDisplayModels.ts`
* `runFailure.ts`
* `runFormatters.ts`
* `RunResultPanel.tsx`
* `RunResultStepCard.tsx`
* `RunResultSteps.tsx`
* `RunStateOverview.tsx`
* `RunStepCardBase.tsx`
* `RunStepTimeline.tsx`
* `RunStepWritebackSection.tsx`
* `RunValueBlock.tsx`

#### `frontend-react/src/run/`

* `runTypes.ts`：前端 run transport mirror type

#### `frontend-react/src/model-resources/`

* `modelResourceTypes.ts`：前端 model resource transport / mirror type

#### `frontend-react/src/shared/`

* `workflowSharedTypes.ts`：前端共享基础类型

#### `frontend-react/src/workflow-editor/`

这是前端 workflow 编辑器核心目录。重要子层：

* `workflowEditorTypes.ts`：workflow canonical mirror type
* `workflowEditorGraphTypes.ts`：图编辑壳类型
* `workflowEditorUiTypes.ts`：controller/action/display 侧 UI 类型
* `actions/workflowEditorActions.ts`
* `controllers/useWorkflowGraphEditor.ts`
* `controllers/useWorkflowRuntime.ts`
* `state/workflowEditorRunInputs.ts`
* `state/workflowEditorSelection.ts`
* `state/workflowEditorViewState.ts`
* `operations/workflowEditorOperations.ts`
* `domain/promptVariableHints.ts`
* `domain/workflowEditorConfig.ts`
* `domain/workflowEditorGraph.ts`
* `domain/workflowEditorHelpers.ts`
* `domain/workflowEditorMappers.ts`
* `domain/workflowEditorNodeFactory.ts`
* `domain/workflowEditorRequests.ts`
* `domain/workflowEditorSemantic.ts`
* `domain/workflowEditorValidationRules.ts`
* `domain/workflowEditorValidators.ts`
* `__tests__/`

### 10.12 其他目录

* `docs/`：架构说明、设计文档、分析文档、重构记录
* `tests/`：后端测试目录
* `.venv/`：Python 虚拟环境，不属于业务代码

---

## 11. 哪些目录和文件不要优先进入

以下内容在理解正式主链时必须降级处理：

### 11.1 `sessions/`

如果仓库里仍然保留 `sessions/`，不要默认把它视为 current workflow direct run 主链的一部分。

### 11.2 `app.py`

它绕过了 React + FastAPI 主链，更接近演示 / 辅助脚本。

### 11.3 `visualize.py`

它服务于 workflow 可视化，不定义正式运行行为。

### 11.4 `workflow`

它只是 Graphviz 中间产物或遗留产物，不是业务入口。

### 11.5 `workflows/` 下旧单文件 YAML

当前正式布局是目录式布局，不是单文件布局。遇到旧单文件 YAML，应当把它视为历史遗留，而不是当前正式 save/load 合同。

---

## 12. 遇到不同问题时，先走哪条链

### 12.1 如果问题是“workflow 正式保存态 shape、converter、normalizer、validator、loader、save/load 差异”

先走：后端 workflow canonical / save-load 链。
先看：`workflow_contracts.py`、`workflow_converter.py`、`workflow_normalizer.py`、`workflow_validator.py`、`workflow_loader.py`、`api/workflows.py`。
不要先看：`app.py`、`sessions/`、前端页面组件。

### 12.2 如果问题是“run-draft、engine、execution facts、RunResult、success/failed 语义、prompt window”

先走：后端 direct run / execution 链。
先看：`run_http_schemas.py`、`workflow_run_service.py`、`engine.py`、`execution_types.py`、`run_result_mapper.py`、`run_outcome.py`。
不要先看：前端展示组件的渲染代码。

### 12.3 如果问题是“model resource 配置、resolve、health、删除阻止”

先走：model resource 管理链。
先看：`model_resources.json`、`model_resource_config_shared.py`、`model_resource_store.py`、`model_resource_registry.py`、`model_resource_reference_service.py`。
不要先看：前端 panel 展示代码来反推后端规则。

### 12.4 如果问题是“前端页面状态、controller、operations、WorkflowRunContext、canvas 切换语义”

先走：前端 editor / page / controller 链。
先看：`WorkflowEditor.tsx`、`useWorkflowRuntime.ts`、`useWorkflowGraphEditor.ts`、`workflowEditorOperations.ts`。

### 12.5 如果问题是“graph rule、前端预检、view derivation、inbound bindings、promptVariableHints”

先走：前端 graph rule / validation / view derivation 链。
先看：`workflowEditorGraph.ts`、`workflowEditorValidationRules.ts`、`workflowEditorValidators.ts`、`workflowEditorViewState.ts`。

### 12.6 如果问题是“RunResult 到 DisplayRun 的映射、failure summary、writeback diff、stale run”

先走：前端 run display 消费链。
先看：`runTypes.ts`、`runDisplayMappers.ts`、`runDisplayModels.ts`、`runFailure.ts`、`RunResultPanel.tsx`。

---

## 13. 文末专题文档索引

下面这 10 篇文档是本文档之后的正式专题索引。可以把它们理解为：`00` 是总地图，`01/02/03` 解释后端主链，`04/05/06/07` 解释前端主链，`08` 解释持久化样例与易误解点，`09` 解释限制和技术债务。

### 13.1 `00-system-map.md`

问题类型：系统当前正式主链是什么，哪些目录算主链，哪些不算。
先看原因：这篇负责系统范围、正式主链、分层与事实源总表，是整套文档的总地图。
不要误用：它不是某一条链的详细实现文档。

### 13.2 `01-backend-workflow-canonical-and-save-load.md`

问题类型：workflow 正式 contract 是什么，`nodes / edges / contextLinks` 各自表达什么，save/load 链怎么走，editor load 和 canonical load 有什么区别。
先看原因：这篇是 canonical workflow contract、converter / normalize / validator / loader 分层的 owner 文档。
不要误用：它不负责 direct run 的 execution facts 细节。

### 13.3 `02-backend-direct-run-and-execution.md`

问题类型：direct run 链怎么走，`run-draft` 经过哪些层，engine 的内部产物是什么，execution facts 和 HTTP DTO 谁是 owner，success / failed 应该看什么字段，prompt window 如何实现。
先看原因：这篇把 canonical contract、internal execution facts、direct run HTTP DTO 三层分离讲清楚。
不要误用：它不负责 workflow 保存态 shape owner 规则。

### 13.4 `03-backend-model-resource-chain.md`

问题类型：model resource 从配置文件到 runtime resolve 的链路是什么，删除为什么会被阻止，删除扫描看什么。
先看原因：这篇明确区分 config 事实源、shared 规则层、storage IO owner、runtime registry、删除保护扫描层。
不要误用：它不负责前端 panel 的展示状态设计。

### 13.5 `04-frontend-editor-architecture.md`

问题类型：前端 editor 如何分层，controller、operations、page、domain 各负责什么，页面状态边界在哪里，`requestedCanvasId` 和 `activeCanvasId` 为什么分开，页面如何把后端 `RunResult` 和页面上下文解耦。
先看原因：这篇是前端 editor 总体架构文档，解释页面装配、状态边界和 controller/operations 分工。
不要误用：它不是 graph rule owner 文档。

### 13.6 `05-frontend-graph-rules-and-view-derivation.md`

问题类型：前端 graph 规则 owner 在哪里，ReactFlow 壳和保存态 / 运行态是什么关系，前端预检能做什么、不能做什么，view derivation 在哪里。
先看原因：这篇专门回答 graph rule owner、前端预检与后端 validator 的边界、以及 UI shell 与 canonical contract 的区别。
不要误用：它不是 run display 专文。

### 13.7 `06-frontend-run-display-chain.md`

问题类型：前端如何把 `RunResult` 变成 `DisplayRun`，`failure summary`、`writeback diff`、`primaryState` 在哪里生成，stale run 属于哪一层语义。
先看原因：这篇是 run display 专文，解释 transport mirror、display model、display mapper、failure helper 与展示组件链。
不要误用：它不是后端 `RunResult` transport owner 文档。

### 13.8 `07-frontend-model-resource-panel.md`

问题类型：前端 model resource 面板为什么是复合组件，删除阻止 detail 如何在前端消费。
先看原因：这篇定义 `WorkflowModelResourcePanel.tsx` 的真实定位，并解释 UI、状态、API、错误解析和 detail 展示职责。
不要误用：它不负责后端删除扫描规则本体。

### 13.9 `08-persistent-shape-examples.md`

问题类型：当前正式持久化文件长什么样，`workflow.yaml`、`metadata.yaml`、`model_resources.json` 各自扮演什么角色，`contextLinks: []` 是否等于没有窗口语义。
先看原因：这篇提供持久化文件样例和常见误解澄清。
不要误用：它不是 save/load 链 owner 文档。

### 13.10 `09-known-limits-and-technical-debt.md`

问题类型：当前有哪些已知限制、技术债务、临时兼容、未来收口点。
先看原因：这篇负责跨链路限制与债务，不与主链 owner 文档混写。
不要误用：它不应被当作正式 contract owner 文档。

---

## 14. 最后的使用规则

如果只读这一份文档，应当能先回答以下问题：

* 当前项目正式主链是什么。
* 哪些目录和文件属于正式主链，哪些不属于。
* workflow、direct run、model resource、前端 editor、前端 run display 分别应先看哪些文件。
* 哪些文件是 owner，哪些只是 mirror、mapper、壳层或辅助层。
* 更细的问题应该跳到哪一篇专题文档。

如果问题已经进入字段级、规则级、算法级或运行时细节级，这份文档只负责把问题送到正确的专题文档，不负责代替专题文档回答。
