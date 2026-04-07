
# 00-system-map总地图

## 文档层声明

本文档是项目背景材料，只用于：
- 结构理解
- 主链判断
- owner 初判
- 风险挂牌
- 待核对点整理

本文档不用于：
- 在未核对真实代码前替代代码事实
- 直接输出实现方案
- 直接给出代码级确定结论
## 本篇目标

本篇只回答六类问题：

1. 这个项目当前的正式系统范围是什么。
2. 这个项目当前的正式主链是什么。
3. 后端有哪些正式层次。
4. 前端有哪些正式层次。
5. 各类正式事实源分别是什么。
6. 哪些目录或文件不属于当前正式主链。

本篇是当前正式系统地图，不是整个仓库的全量目录树。

---

## 1. 当前系统范围

当前项目的正式系统范围是：FastAPI 后端 + React Workflow Editor 前端。

当前阶段，正式纳入主链的能力只有以下五类：

1. workflow 编辑与保存。
   前端以当前画布编辑态为准。后端围绕同一份 canonical workflow contract 承接加载、normalize、validator 与持久化写回。

2. direct run / run-draft。
   运行时执行的不是磁盘中的旧 workflow 文件，而是请求体中携带的当前画布 workflow draft。后端执行链会先走 canonical normalize 与 full validator，再进入 engine 执行与结果投影。

3. run result 展示。
   后端返回 direct run transport result。前端把 transport result 解释为 display model，用于页面结果面板、步骤时间线、writeback diff 与失败摘要展示。

4. model resource 管理。
   当前系统提供 model resource 的列表、状态、创建、更新、删除，以及删除前的引用保护扫描。

5. prompt 模板列表。
   前端可以通过后端路由拿到当前 prompt 模板名称列表，用于 prompt 节点编辑时选择模板。

---

## 2. 正式主链总览
当前系统可先按四条正式主链理解：
1. 后端 workflow canonical / save-load 链
2. 后端 direct run / execution 链
3. 后端 model resource 管理链
4. 前端 editor / graph / run display 链

其中，前端 run display 是前端主链中的后置消费段，不单独拥有后端 transport 或 execution owner 身份。
### 2.1 后端 workflow canonical / save-load 链

这条链回答两个问题：
一，workflow 的正式 shape 是什么。
二，workflow 如何从磁盘读取、进入 canonical model、通过校验，再写回正式持久化文件。

正式链路：

`workflow.yaml -> converter -> normalize -> validator -> canonical workflow -> save/load route`

关键文件如下。

#### `contracts/workflow_contracts.py`

角色：workflow shared canonical contract 的定义层。
负责：定义 workflow shared canonical contract。
不负责：route、文件 IO、执行逻辑、展示逻辑。
上下游：上游是 persisted YAML shape 转换后的 canonical raw shape；下游被 save/load、engine 与前端 mirror type 共同围绕。
何时阅读：当你需要确认 workflow shared canonical contract 本体时阅读。

#### `api/workflow_converter.py`

角色：persisted YAML shape 与 canonical raw shape 的转换层。
负责：把 persisted YAML shape 转成 canonical raw shape，或把 canonical workflow 写回 persisted YAML shape。
不负责：normalize、validator、文件路径规则。
上下游：上游是 `workflow.yaml`；下游是 `workflow_normalizer.py`。
何时阅读：当你需要确认 persisted YAML shape 与 canonical raw shape 如何互转时阅读。

#### `api/workflow_normalizer.py`

角色：canonical normalize 层。
负责：对 canonical raw shape 做 canonical normalize。
不负责：文件 IO、route、display。
上下游：上游是 `workflow_converter.py`；下游是 `workflow_validator.py`。
何时阅读：当你需要确认 canonical normalize 入口时阅读。

#### `api/workflow_validator.py`

角色：validator 层。
负责：structure validation 与 dependency validation。
不负责：文件 IO、route、display。
上下游：上游是 `workflow_normalizer.py`；下游是 canonical workflow 消费方。
何时阅读：当你需要确认 workflow 的正式校验层时阅读。

#### `api/workflow_loader.py`

角色：正式 workflow 文件加载层。
负责：canvas_id 到文件路径的正式映射、YAML IO、editor load / canonical load 分流。
不负责：canonical contract 定义。
上下游：上游是 `workflows/<canvas_id>/workflow.yaml`；下游是 converter / normalize / validator 链。
何时阅读：当你需要确认 workflow 如何从 canvas_id 进入正式加载链时阅读。

#### `api/workflows.py`

角色：route 编排层。
负责：编排 save/load 请求。
不负责：canonical contract 定义、文件路径规则本身。
上下游：上游是 HTTP 请求；下游是 save/load 正式链。
何时阅读：当你需要确认 save/load route 如何接入正式链时阅读。

这条链的边界结论只有一条：后端已经明确采用 canonical workflow contract 作为唯一共享锚点。前端编辑态、后端 save/load、以及 engine 执行都围绕同一份 `WorkflowEditorData` 结构工作，而不是各自拥有独立 workflow contract。

---

### 2.2 后端 direct run / execution 链

这条链回答三个问题：
一，当前画布如何被执行。
二，内部 execution facts 是什么。
三，对外 direct run HTTP 结果是什么。

正式链路：

`draft workflow payload -> normalize -> validator -> engine -> execution facts -> run result mapper -> RunResult`

关键文件如下。

#### `core/execution_types.py`

角色：execution internal facts 定义层。
负责：定义 engine 与 service 之间交换的内部 execution facts。
不负责：HTTP DTO、前端 display model。
上下游：上游是 engine 执行结果；下游是 `workflow_run_service.py` 与 `run_result_mapper.py`。
何时阅读：当你需要确认 execution facts 本体时阅读。

#### `core/engine.py`

角色：workflow 执行引擎层。
负责：消费合法 canonical workflow，执行 input / prompt / output 节点，维护 run 内 prompt window 状态，并产出 success / failed execution steps。
不负责：HTTP transport DTO。
上下游：上游是 normalize + validator 后的 canonical workflow；下游是 execution facts。
何时阅读：当你需要确认 workflow 在运行时如何被执行时阅读。

#### `api/workflow_run_service.py`

角色：execution service 收敛层。
负责：把 engine 成功路径与失败路径统一收敛为 `WorkflowExecutionResult`。
不负责：execution facts owner 定义、前端 display model。
上下游：上游是 `core/engine.py`；下游是 `run_result_mapper.py` 与 `run_outcome.py`。
何时阅读：当你需要确认 engine 结果如何被 service 层统一收口时阅读。

#### `api/run_http_schemas.py`

角色：direct run HTTP transport DTO 定义层。
负责：定义 direct run HTTP transport DTO；请求体是 `RunDraftRequest`，响应体是 `RunResult`。
不负责：execution facts 定义。
上下游：上游是 run route；下游是 API response。
何时阅读：当你需要确认 direct run 对外 HTTP contract 时阅读。

#### `api/run_result_mapper.py`

角色：execution facts 到 transport DTO 的映射层。
负责：把 execution facts 单向投影为 direct run transport DTO。
不负责：execution facts owner 定义。
上下游：上游是 execution facts；下游是 `RunResult`。
何时阅读：当你需要确认 execution facts 如何进入 API transport result 时阅读。

#### `api/run_outcome.py`

角色：API response 收口层。
负责：把内部统一 execution result 转成最终 API response。
不负责：execution facts 定义。
上下游：上游是 `workflow_run_service.py`；下游是 route response。
何时阅读：当你需要确认 direct run API response 的最终收口点时阅读。

#### `api/workflows.py`

角色：direct run route 暴露层。
负责：暴露 `POST /workflows/{canvas_id}/run-draft` 路由。
不负责：execution facts owner、transport DTO owner。
上下游：上游是 HTTP 请求；下游是 direct run 正式链。
何时阅读：当你需要确认 run-draft 路由入口时阅读。

这条链的边界结论只有三条：

1. canonical workflow contract 不是 execution facts。
2. execution facts 不是 direct run HTTP DTO。
3. direct run 当前只返回 transport result，不写 persisted run 历史。

---

### 2.3 后端 model resource 管理链

这条链回答两个问题：
一，model resource 从配置文件到运行时 resolve 的路径是什么。
二，删除保护如何工作。

正式链路：

`model_resources.json -> shared config rule -> storage record map -> runtime registry / management DTO / delete protection`

关键文件如下。

#### `shared/model_resource_config_shared.py`

角色：model resource 共享规则层。
负责：定义配置路径、provider 支持集、单条配置项的轻量归一化规则。
不负责：文件 IO、HTTP DTO。
上下游：上游是 `model_resources.json` 原始配置；下游是 storage 层。
何时阅读：当你需要确认 model resource 配置共享规则时阅读。

#### `storage/model_resource_store.py`

角色：model resource 配置文件 IO owner。
负责：strict parse JSON、构建 `ModelResourceRecord` map、整表写回、最小文件级 health。
不负责：runtime registry、HTTP DTO。
上下游：上游是 `config/model_resources.json`；下游是 `core/model_resource_registry.py` 与 API 管理链。
何时阅读：当你需要确认 model resource 文件读写 owner 时阅读。

#### `contracts/model_resource_contracts.py`

角色：model resource 共享 contract 定义层。
负责：定义共享 record 与删除阻止 detail contract。
不负责：文件 IO、route、registry。
上下游：上游是 storage record；下游被 core 与 api 共同复用。
何时阅读：当你需要确认 model resource 共享 contract 时阅读。

#### `core/model_resource_registry.py`

角色：runtime registry owner。
负责：把 storage record map 投影为运行时 registry，并提供 resolve 入口。
不负责：配置文件 IO、HTTP DTO。
上下游：上游是 `model_resource_store.py`；下游是 runtime resolve。
何时阅读：当你需要确认 runtime registry 与 resolve 入口时阅读。

#### `api/model_resource_http_schemas.py`

角色：model resource 管理接口 DTO 定义层。
负责：定义 model resource 管理接口的 HTTP DTO。
不负责：配置文件 IO、runtime registry。
上下游：上游是 API 管理链；下游是管理面板消费方。
何时阅读：当你需要确认 model resource 管理接口对外 DTO 时阅读。

#### `api/model_resource_reference_service.py`

角色：删除保护扫描层。
负责：扫描 workflow 原始 YAML 中对某个 model resource 的引用，并决定是否允许删除。
不负责：配置文件 IO owner、runtime registry owner。
上下游：上游是 workflow 原始 YAML；下游是 delete 路由。
何时阅读：当你需要确认删除前引用保护如何判断时阅读。

#### `api/workflows.py`

角色：管理 route 编排层。
负责：承接 model resource 的 list / status / create / update / delete 路由。
不负责：配置文件 IO、runtime registry。
上下游：上游是 HTTP 请求；下游是 model resource 正式链。
何时阅读：当你需要确认 model resource 路由入口时阅读。

这条链的边界结论只有一条：model resource 当前不是单纯的配置读写链，而是同时服务于 runtime resolve、管理面板 DTO、删除保护扫描三个下游。

---

### 2.4 前端 editor / graph / run display 链

这条链回答三个问题：
一，页面如何加载 workflow。
二，页面如何编辑 graph、发起保存与 direct run。
三，页面如何把 raw run result 映射为可展示结果。

正式链路一：

`App -> WorkflowEditor -> controllers -> operations -> api.ts -> backend`

正式链路二：

`direct run transport result -> runTypes mirror -> runDisplayMappers -> DisplayRun -> components`

关键文件如下。

#### `frontend-react/src/main.tsx`

角色：前端应用启动入口。
负责：前端应用启动。
不负责：业务规则 owner。
上下游：上游是应用入口；下游是 `App.tsx`。
何时阅读：当你需要确认前端启动入口时阅读。

#### `frontend-react/src/App.tsx`

角色：顶层应用根组件。
负责：承接前端应用根层。
不负责：后端 contract owner。
上下游：上游是 `main.tsx`；下游是页面级组件。
何时阅读：当你需要确认前端根组件时阅读。

#### `frontend-react/src/components/WorkflowEditor.tsx`

角色：页面级主控与装配层。
负责：作为页面级主控与装配层。
不负责：graph rule owner、后端 contract owner。
上下游：上游是 `App.tsx`；下游连接 controller、state derivation 与 display。
何时阅读：当你需要确认页面级 workflow 主控时阅读。

#### `frontend-react/src/api.ts`

角色：request / transport access 层。
负责：URL、payload、请求/响应基础类型约束。
不负责：组件状态、错误文案、复杂流程编排。
上下游：上游是 operations；下游是 backend。
何时阅读：当你需要确认前端 request / transport 访问层时阅读。

#### `frontend-react/src/workflow-editor/operations/workflowEditorOperations.ts`

角色：异步操作编排层。
负责：把 list/load/save/run 等请求组织成 controller 可直接消费的结果壳，并在 save/run 之前做前端轻量预检或 payload 收敛。
不负责：页面展示、后端 contract owner。
上下游：上游是 controller；下游是 `api.ts`。
何时阅读：当你需要确认异步操作如何组织时阅读。

#### `frontend-react/src/workflow-editor/controllers/useWorkflowRuntime.ts`

角色：runtime controller。
负责：持有 `canvasList`、`prompts`、`modelResources`、`runInputs`、`isSaving`、`isRunning` 等 runtime 状态。
不负责：graph rule owner。
上下游：上游是页面组件；下游是 operations、state derivation 与 display。
何时阅读：当你需要确认前端 runtime 状态控制时阅读。

#### `frontend-react/src/workflow-editor/controllers/useWorkflowGraphEditor.ts`

角色：graph controller。
负责：持有 `nodes`、`edges`、`contextLinks`、`selection`、`pendingBindingRequest` 等 graph 编辑状态。
不负责：graph rule owner。
上下游：上游是页面组件；下游是 graph 编辑流程。
何时阅读：当你需要确认前端 graph 编辑控制时阅读。

#### `frontend-react/src/workflow-editor/workflowEditorTypes.ts`

角色：workflow canonical mirror type 层。
负责：镜像 workflow canonical contract。
不负责：后端 owner。
上下游：上游是后端 canonical workflow contract；下游是前端 editor 链。
何时阅读：当你需要确认前端 workflow mirror type 时阅读。

#### `frontend-react/src/run/runTypes.ts`

角色：direct run transport mirror type 层。
负责：镜像 direct run transport contract。
不负责：后端 owner、display model owner。
上下游：上游是 direct run transport result；下游是 run display mapper。
何时阅读：当你需要确认前端 run transport mirror type 时阅读。

#### `frontend-react/src/workflow-editor/state/workflowEditorViewState.ts`

角色：view derivation 层。
负责：把 nodes、edges、contextLinks 与最近一次 runResult 合并，派生 displayNodes、displayEdges、runtimeInputs、runtimeOutput、graphWindowMode 等只读视图数据。
不负责：后端 contract owner。
上下游：上游是 editor state 与 run result；下游是页面展示。
何时阅读：当你需要确认编辑态如何被派生成只读展示数据时阅读。

#### `frontend-react/src/components/run/runDisplayModels.ts`

角色：display model 层。
负责：定义前端 run 展示层的 display model 锚点。
不负责：direct run transport contract、execution internal facts。
上下游：上游是 transport -> display mapper；下游是 run components。
何时阅读：当你需要确认前端 run display model 时阅读。

#### `frontend-react/src/components/run/runDisplayMappers.ts`

角色：transport -> display 映射层。
负责：把 transport result 映射为 display model。
不负责：execution facts owner。
上下游：上游是 `runTypes.ts`；下游是 `runDisplayModels.ts` 与 run components。
何时阅读：当你需要确认 raw run result 如何进入页面展示时阅读。

这条链的边界结论只有一条：前端当前不是“组件直接打 API”的扁平结构，而是已经形成了 `mirror type -> request -> operations -> controller -> state/view derivation -> components/display` 这条正式主链。

---

## 3. 事实源总表

当前系统里，最容易混淆的问题不是“有哪些文件”，而是“哪类事实到底归谁所有”。

### 3.1 workflow 保存态事实源

workflow 保存态的正式事实源是：

`workflows/<canvas_id>/workflow.yaml`

它是 workflow 是否作为正式 canvas 存在的判断依据，也是 loader、save、reference scan 等链路复用的正式 workflow 文件位置。

当前 workflow 持久化 shape 的正式结构是：

1. 顶层 `nodes` 为 dict。
2. 顶层 `edges` 为 list。
3. 顶层 `contextLinks` 为 list。
4. 节点的 `position` 放在节点顶层，其余字段视为节点 config。

### 3.2 canvas 展示壳事实源

canvas 展示壳的事实源是：

`workflows/<canvas_id>/metadata.yaml`

它当前只承担展示信息角色，例如 `label`。它不是 workflow 存在性的 owner，也不是 workflow 合法性的 owner。若 `metadata.yaml` 缺失或非法，workflow 仍然可能作为正式 canvas 存在，只是列表展示时会回退到 `canvas_id`。

### 3.3 model resource 配置事实源

model resource 配置事实源是：

`config/model_resources.json`

它的顶层 key 是 `resource_id`。value 包含：

1. `provider`
2. `model`
3. `api_key`
4. `base_url`

storage 层会把这份 JSON strict parse 成 `ModelResourceRecord` map。core 层再把 record map 投影为 runtime registry。API 管理链再把它投影为管理面板消费的 HTTP DTO。

### 3.4 direct run 事实边界

当前 direct run 主链的事实只存在于本次请求与本次响应之内。

后端 route 接收当前画布 draft workflow、`input_state` 与 `prompt_overrides`，经过 engine 执行后返回 `RunResult`。这条链当前不写持久化 run 历史，也不把 `session` 当作当前 direct run 主链的一部分。

### 3.5 页面 run 归属边界

当前页面上的 run 归属、stale 判定以及“这次 run 属于哪个 workflow context”这些语义，不归后端 run contract 所有，而归前端页面 / controller / display 链管理。

`WorkflowEditor.tsx` 维护 `activeWorkflowContextId`、`runContext`、`graphSemanticVersion` 等页面级状态；`runDisplayMappers.ts` 再把 raw `RunResult` 解释成 display model。页面当前展示的 run result 属于页面级上下文语义，不是后端 persisted run identity。

---

## 4. 后端层次总图

如果按正式分层概括，后端可以抽象成六层：

1. `contracts/`
2. `api/`
3. `core/`
4. `storage/`
5. `shared/`
6. `utils/`

### 4.1 `contracts/`

角色：共享 contract 层。
负责：定义跨 storage / core / api / frontend 共同围绕的共享结构锚点。
不负责：route、engine、文件 IO、展示逻辑。
上下游：上游是正式数据结构抽象；下游被后端与前端共同复用。
何时阅读：当你需要确认共享 shape owner 时阅读。

代表文件：

* `workflow_contracts.py`：workflow canonical contract
* `model_resource_contracts.py`：model resource 共享 record 与删除阻止 detail contract
* `step_projections.py`：shared step projection shape

### 4.2 `api/`

角色：后端入口与编排层。
负责：承接 HTTP 请求、调用 save/load/run/model-resource 正式链路、把内部错误翻译为 HTTP 语义、返回当前 API transport contract。
不负责：自动拥有所有业务 owner。
上下游：上游是 HTTP 请求；下游是各条正式链。
何时阅读：当你需要确认后端 route 与 API transport 入口时阅读。

### 4.3 `core/`

角色：后端核心运行层。
负责：workflow 执行引擎、execution internal facts、model resource runtime registry、LLM 调用封装。
不负责：HTTP transport contract、workflow 文件持久化路径规则。
上下游：上游是 canonical workflow 与 storage record；下游是 execution facts 与 runtime resolve。
何时阅读：当你需要确认运行时逻辑中心时阅读。

### 4.4 `storage/`

角色：持久化 record 的正式 IO 层。
负责：strict parse、record map 构建、整表写回、最小文件级 health。
不负责：runtime registry、HTTP DTO。
上下游：上游是配置文件；下游是 core 与 api。
何时阅读：当你需要确认持久化 record 的正式文件 IO owner 时阅读。

### 4.5 `shared/`

角色：共享规则层。
负责：配置文件路径常量、provider 支持集、单条配置项的最小归一化规则。
不负责：文件 IO、HTTP DTO。
上下游：上游是原始配置；下游是 storage 与 api。
何时阅读：当你需要确认共享规则而不是 IO 或 route 时阅读。

### 4.6 `utils/`

角色：辅助性能力层。
负责：例如 prompt 模板读取这类辅助能力。
不负责：主 contract owner、正式 runtime registry owner。
上下游：上游是辅助输入；下游会被 validator、route、engine 等链路复用。
何时阅读：当你需要确认被多条链复用的辅助能力时阅读。

---

## 5. 前端层次总图

如果按正式分层概括，前端可以抽象成七层：

1. mirror type 层
2. request / transport 层
3. operations 编排层
4. controller 层
5. domain rule 层
6. state / view derivation 层
7. components / page 装配层

### 5.1 mirror type 层

角色：镜像后端 contract 的静态类型层。
负责：为前端提供静态类型锚点。
不负责：后端 owner。
上下游：上游是后端 contract；下游是前端 editor / run 链。
何时阅读：当你需要确认前端镜像类型层时阅读。

代表文件：

* `workflowEditorTypes.ts`：workflow canonical mirror type
* `runTypes.ts`：direct run transport mirror type
* `modelResourceTypes.ts`：model resource transport / mirror types

### 5.2 request / transport 层

角色：HTTP 请求与 transport 访问层。
负责：发起 HTTP 请求并返回 transport result。
不负责：组件状态、错误文案、复杂流程编排。
上下游：上游是 operations；下游是 backend。
何时阅读：当你需要确认请求访问层时阅读。

代表文件：

* `api.ts`

### 5.3 operations 编排层

角色：异步请求流程组织层。
负责：组织 list/load/save/run 等请求，并在 save/run 之前做前端轻量预检或 payload 收敛。
不负责：页面展示、后端 owner。
上下游：上游是 controller；下游是 request / transport 层。
何时阅读：当你需要确认前端异步操作编排时阅读。

代表文件：

* `workflowEditorOperations.ts`

### 5.4 controller 层

角色：页面运行时状态与图交互状态控制层。
负责：维护 runtime 状态与 graph 编辑状态。
不负责：graph rule owner。
上下游：上游是页面组件；下游是 operations、state derivation 与 graph 编辑流程。
何时阅读：当你需要确认 controller 持有的页面状态时阅读。

代表文件：

* `useWorkflowRuntime.ts`
* `useWorkflowGraphEditor.ts`

### 5.5 domain rule 层

角色：graph rule 与 UX 预检层。
负责：graph rule、payload mapper、前端轻量 validator、字段初始值与局部 graph-sync 规则。
不负责：页面组件装配。
上下游：上游是 controller 与 operations；下游支撑 graph 编辑与 UX 预检。
何时阅读：当你需要确认 graph rule owner 与 UX 预检 owner 时阅读。

### 5.6 state / view derivation 层

角色：只读视图派生层。
负责：把编辑态、run result 与 graph truth 派生为前端可展示的只读视图数据。
不负责：后端 contract owner。
上下游：上游是 editor state 与 run result；下游是 components。
何时阅读：当你需要确认页面展示前的派生层时阅读。

代表文件：

* `workflowEditorViewState.ts`
* `workflowEditorRunInputs.ts`
* `workflowEditorSelection.ts`

### 5.7 components / page 装配层

角色：页面装配与 UI 展示层。
负责：消费 controller、state derivation 与 display model 的结果。
不负责：重新定义后端 contract。
上下游：上游是 controller、state derivation、display model；下游是页面 UI。
何时阅读：当你需要确认页面装配与展示层时阅读。

代表文件：

* `WorkflowEditor.tsx`
* `WorkflowSidebar.tsx`
* `NodeConfigPanel.tsx`
* `WorkflowModelResourcePanel.tsx`
* `RunResultPanel.tsx`
* `components/run/*`

---

## 6. owner 速查表

这一节只用 owner 视角，快速钉住最容易混淆的对象。

### 6.1 canonical workflow contract owner

文件路径：`contracts/workflow_contracts.py`
角色：workflow shared canonical contract owner。
负责：定义 `WorkflowEditorData`、`WorkflowNode`、`WorkflowEdge`、`WorkflowContextLink`、`InputNodeConfig`、`PromptNodeConfig`、`OutputNodeConfig`。
不负责：HTTP DTO、运行时 display model。
上下游：上游是 workflow shared shape 定义；下游被 save/load、engine、frontend mirror type 共同围绕。
何时阅读：当你需要确认 canonical workflow contract owner 时阅读。

### 6.2 execution facts owner

文件路径：`core/execution_types.py`
角色：execution facts owner。
负责：定义 `ExecutionStep`、`WorkflowExecutionResult`、`WorkflowRunError`。
不负责：direct run HTTP DTO、前端 display model。
上下游：上游是 engine；下游是 service 与 mapper。
何时阅读：当你需要确认 execution facts owner 时阅读。

### 6.3 direct run HTTP DTO owner

文件路径：`api/run_http_schemas.py`
角色：direct run HTTP DTO owner。
负责：定义 `RunDraftRequest`、`RunResult`、`RunStep`。
不负责：execution facts owner。
上下游：上游是 API transport 层；下游是 direct run route response。
何时阅读：当你需要确认 direct run 对外 DTO owner 时阅读。

### 6.4 runtime registry owner

文件路径：`core/model_resource_registry.py`
角色：runtime registry owner。
负责：把 storage record map 投影成 runtime registry，并提供 `resolve_model_resource`。
不负责：配置文件 IO、HTTP DTO。
上下游：上游是 storage record map；下游是 runtime resolve。
何时阅读：当你需要确认 runtime registry owner 时阅读。

### 6.5 graph rule owner

文件路径：`frontend-react/src/workflow-editor/domain/*`
角色：graph 规则层 owner。
负责：graph 规则与联动清理逻辑。
不负责：页面级 graph controller。
上下游：上游是 graph 编辑流程；下游支撑 controller 与 UX 预检。
何时阅读：当你需要确认 graph rule owner 时阅读。

### 6.6 display model owner

文件路径：`frontend-react/src/components/run/runDisplayModels.ts`
角色：display model owner。
负责：定义 `DisplayRun`、`DisplayStep`、`DisplayFailureInfo`、`DisplayWriteback`。
不负责：direct run transport contract、execution internal facts。
上下游：上游是 display mapper；下游是 run 展示组件。
何时阅读：当你需要确认前端 run display model owner 时阅读。

---

## 7. 排除区：旁路与遗留

系统地图不能只写正式主链，也必须明确排除哪些对象不属于当前正式主链。

### 7.1 `sessions/`

角色：旁路对象。
负责：当前不纳入 workflow direct run 主链。
不负责：当前 direct run 正式归属 owner。
上下游：当前 direct run 不围绕 session 展开。
何时阅读：当你在系统图中区分 direct run 主链与旁路对象时阅读。

### 7.2 `app.py`

角色：早期直跑 / 演示入口。
负责：历史入口。
不负责：当前正式后端主入口。
上下游：当前正式后端入口是 `fastapi_app.py -> api.workflows`。
何时阅读：当你需要排除历史入口与现行主入口混淆时阅读。

### 7.3 `visualize.py`

角色：辅助脚本。
负责：调试、分析或可视化辅助。
不负责：workflow save/load/run/model-resource 正式主链。
上下游：它不进入正式运行链。
何时阅读：当你需要区分辅助脚本与正式主链时阅读。

### 7.4 `workflow/` 可视化中间文件

角色：Graphviz 中间产物或历史可视化输出。
负责：中间产物或遗留输出。
不负责：当前正式 workflow 持久化事实源。
上下游：当前正式 workflow 保存态事实源已经收口到 `workflows/<canvas_id>/workflow.yaml`。
何时阅读：当你需要排除中间产物与正式事实源混淆时阅读。

---

## 8. 当前系统的关键分层原则

这一节只保留当前系统地图必须守住的边界。

### 8.1 canonical contract 不等于 HTTP DTO

workflow canonical contract 的 owner 在 `contracts/workflow_contracts.py`。
HTTP transport DTO 的 owner 在 API 层，例如 `run_http_schemas.py`、`model_resource_http_schemas.py`。
二者可以引用同一批共享 projection shape，但不能因此把 canonical model、execution facts 与 HTTP DTO 混成同一层。

### 8.2 execution facts 不等于 display model

`core/execution_types.py` 定义的是 execution internal facts。
`runDisplayModels.ts` 定义的是前端 display model。
二者之间必须经过 transport result 和 display mapper。display model 可以附带前端展示语义，但这些都不是 execution facts 本身。

### 8.3 graph truth 不等于 runtime window instance

保存态与图真相里，prompt window 关系只由顶层 `contextLinks` 表达。
运行时 engine 会把这些 graph truth 解释成 `new_window / continue / branch` 以及 run-local `window_id`、`window_parent_id`、消息历史快照。
因此，`contextLinks` 是图关系事实，window instance 是运行时解释结果。不能把运行时 window identity 反写成保存态 graph truth。

### 8.4 data edges 不等于 contextLinks

`edges` 只表达结构化输入绑定。
`contextLinks` 只表达 prompt window 继承 / 分支关系。
二者共同参与执行顺序图，但只有 data edges 参与输入变量绑定。不能把 `contextLinks` 当成普通输入绑定。

### 8.5 前端 UX 预检不等于后端正式 validator

前端可以做保存前预检、graph rule 即时拒绝、`targetInput` 格式检查、cycle 轻量预阻断等 UX 级提示。
但后端 `workflow_normalizer.py + workflow_validator.py` 才是正式 contract 裁决链。前端 validator 不能替代后端合法性判定。

### 8.6 页面 run context 不等于 persisted run identity

当前页面上的 run 归属、stale 判断和 `workflowContextId`，是页面级语义，不是后端 persisted run identity。
这也是为什么当前 direct run 可以稳定运行与展示，但系统仍然可以同时明确说：当前不写 persisted run 历史。

---

## 结语

如果只保留一句总括，那就是：

这个项目当前已经不是“脚本 + 页面”的松散集合，而是一个围绕 canonical workflow contract、execution facts、HTTP transport、frontend display model 逐层分离的正式主链系统。

对后续维护而言，最重要的不是先记住所有文件名，而是先守住这几条边界：

1. workflow canonical contract 的 owner 在哪里。
2. execution facts 的 owner 在哪里。
3. transport DTO 的 owner 在哪里。
4. display model 的 owner 在哪里。
5. 正式事实源到底是哪个文件，而不是哪个中间产物。

