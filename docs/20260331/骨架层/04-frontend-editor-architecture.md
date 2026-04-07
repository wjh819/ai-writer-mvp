
# 04-frontend-editor-architecture主链背景

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

本篇只回答五类问题：

1. 前端 editor 当前怎么分层。
2. controller、operations、page、domain 各负责什么。
3. 页面级上下文和后端 run result 如何解耦。
4. 当前页面状态边界在哪里。
5. 当前这条前端主链还有哪些明确限制和技术债。

本篇只描述前端 editor 主链，不展开 backend canonical / save-load 链与 backend direct run / execution 链的完整细节。

---

## 1. 主链总览

当前前端 editor 主链可以分成六层：

1. 共享基础类型层
2. mirror type 层
3. request / mapper / operations 层
4. controller 层
5. domain / state derivation 层
6. 页面装配层

对应的代表文件是：

* 共享基础类型层：`workflowSharedTypes.ts`
* mirror type 层：`workflowEditorTypes.ts`、`runTypes.ts`、`modelResourceTypes.ts`、`workflowEditorGraphTypes.ts`、`workflowEditorUiTypes.ts`
* request / mapper / operations 层：`api.ts`、`workflowEditorRequests.ts`、`workflowEditorMappers.ts`、`workflowEditorOperations.ts`
* controller 层：`useWorkflowRuntime.ts`、`useWorkflowGraphEditor.ts`
* domain / state derivation 层：`workflowEditorConfig.ts`、`workflowEditorNodeFactory.ts`、`workflowEditorSemantic.ts`、`workflowEditorRunInputs.ts`、`workflowEditorSelection.ts`、`workflowEditorViewState.ts`
* 页面装配层：`WorkflowEditor.tsx`、`WorkflowSidebar.tsx`、`NodeConfigPanel.tsx`、`RunResultPanel.tsx`、`WorkflowModelResourcePanel.tsx`

这条链里最关键的分层原则有三条：

1. 前端 mirror type 不等于后端 owner。前端类型只是镜像，不拥有后端 contract。
2. controller 不等于 page。controller 持有远端数据和图编辑状态；页面层再决定当前 canvas、当前 workflow context、run result 是否 stale、错误如何汇总展示。
3. 后端 `RunResult` 不携带页面语义。页面层通过 `WorkflowRunContext` 和 `WorkflowPageContext` 给它补上“它属于哪个 active workflow context、是否已经 stale”的归属语义。

---

## 2. 共享基础类型层与 mirror type 层

### 2.1 共享基础类型层

文件路径：`workflowSharedTypes.ts`
角色：最小共享基础类型层。
负责：提供 editor / run / display 都会复用的最小基础类型。
不负责：定义 workflow canonical contract、定义 run transport contract。
上下游：上游是前端通用基础类型需求；下游被 editor、run、display 多处复用。
何时阅读：当你需要确认前端哪些基础类型被多层共同使用时阅读。

当前只放两类最小共享基础类型：

* `WorkflowState = Record<string, unknown>`
* `PromptMode = 'template' | 'inline'`

这一层的职责很克制，只提供最小共享基础类型。

### 2.2 workflow canonical mirror

文件路径：`workflowEditorTypes.ts`
角色：workflow canonical mirror type 层。
负责：镜像后端 workflow canonical contract。
不负责：后端 contract owner、runtime validation、默认值补齐。
上下游：上游是后端 canonical workflow contract；下游是前端 editor 链。
何时阅读：当你需要确认前端如何镜像 workflow canonical contract 时阅读。

这一层定义：

* `WorkflowEditorData`
* `WorkflowApiNode`
* `WorkflowApiEdge`
* `WorkflowContextLink`
* `InputNodeConfig / PromptNodeConfig / OutputNodeConfig`

正式边界包括：

* 它是前端的 canonical mirror type 锚点。
* 它不是后端 contract owner。
* 它不做 runtime validation。
* 它不做默认值补齐。

原文还明确保留了几个重要口径：

* `new_window` 不是保存态 `WorkflowContextLink.mode`
* `mode` 只允许 `continue | branch`
* `WorkflowEditorData` 只包含保存态的 `nodes / edges / contextLinks`
* 不包含 graph-derived inputs、run/session 信息、display 字段

### 2.3 run transport mirror

文件路径：`runTypes.ts`
角色：direct run transport mirror type 层。
负责：镜像后端 `RunResult / StepProjection` transport contract。
不负责：承载 engine internal facts、承载 page stale 语义。
上下游：上游是后端 direct run transport contract；下游是前端 run display 链。
何时阅读：当你需要确认前端 run 类型层镜像了哪些 transport 字段时阅读。

这一层定义：

* `RunResult`
* `StepProjection`
* `RunDraftWorkflowPayload`
* `PromptWindowMode`
* `RunStatus / RunScope / FailureStage`

正式口径包括：

* success 时前端消费 `final_state`
* failed 时前端消费 `partial_state`
* `error_* / failure_stage` 是 run 级失败摘要
* `prompt_overrides` 只属于本次 run，不属于保存态

这说明前端 run 类型层只镜像 direct run transport，不承载 engine internal facts，也不承载 page stale 语义。

### 2.4 model resource transport mirror

文件路径：`modelResourceTypes.ts`
角色：model resource transport mirror 层。
负责：镜像 model resource 管理链相关 transport 类型。
不负责：作为 model resource 后端 owner。
上下游：上游是后端 model resource transport contract；下游是前端管理面板消费层。
何时阅读：当你需要确认前端 model resource 类型镜像时阅读。

这一层定义：

* `ModelResourceListItem`
* `ModelResourceConfigHealth`
* Create / Update / Delete payload
* `ModelResourceDeleteBlockedDetail`

原文特别点明了两个历史边界：

* `workflow_name` 仍是兼容字段名，真实语义更接近 `canvas_id`
* `api_key` 仍在 transport item 中出现，这属于当前管理链的限制，不是安全边界设计

### 2.5 ReactFlow graph shell type

文件路径：`workflowEditorGraphTypes.ts`
角色：ReactFlow 编辑与展示壳类型层。
负责：定义 ReactFlow shell types。
不负责：作为保存态 canonical contract。
上下游：上游是前端图编辑壳需求；下游是 graph controller、view derivation、页面展示。
何时阅读：当你需要确认 ReactFlow shell 与保存态 contract 的区别时阅读。

这一层定义：

* `WorkflowEditorNode`
* `WorkflowEditorEdge`
* `WorkflowEditorContextEdge`
* `WorkflowNodeData`

`node.data` 当前同时承载三类信息：

1. `config` 正式业务 config mirror，属于保存链
2. `runtimeInputs / runtimeOutput / runtimePublishedState`，来自最近一次 run 的只读展示字段
3. `derivedTargetInputs / inboundBindings / promptVariableHints / graphWindow*` 这类 graph/text 派生字段，不进入保存态

这里必须守住一句边界：ReactFlow node/edge shell 不是 canonical contract，而是前端编辑与展示壳。

### 2.6 页面 UI-only 类型

文件路径：`workflowEditorUiTypes.ts`
角色：页面 UI-only 类型层。
负责：定义页面语义壳与交互壳。
不负责：定义后端 contract。
上下游：上游是页面状态与交互需求；下游是页面层、controller 与展示层。
何时阅读：当你需要确认页面级上下文与 run 归属语义时阅读。

这一层定义：

* `WorkflowLoadWarning`
* `WorkflowPageContext`
* `WorkflowRunContext`
* `WorkflowRunContextMatch`
* `SelectionResult`
* `RuntimeActionResult`

其中两个最关键的页面语义壳是：

`WorkflowPageContext`，包含：

* `requestedCanvasId`
* `activeCanvasId`
* `workflowContextId`

语义是：

* `requestedCanvasId`：用户当前请求切换到的 canvas
* `activeCanvasId`：页面真正已提交成功的当前 canvas
* `workflowContextId`：每次 active workflow 成功切换后的页面级上下文版本号

`WorkflowRunContext`，包含：

* `canvasId`
* `workflowContextId`
* `graphSemanticVersion`
* `runResult`

语义是：

* 后端 `runResult` 本身不携带 UI/page context
* page 层用这个壳记录它属于哪个 active workflow context
* 同一 workflow context 内 graph semantic 变化后可标记 stale
* 跨 workflow context 时该 run 必须失效

这一层已经把“页面级上下文和后端 run result 如何解耦”写成了正式类型边界。

---

## 3. request / mapper / operations / controller 链

### 3.1 request wrapper 层

文件路径：`api.ts`
角色：最底部 request wrapper 层。
负责：组装 URL、发起 HTTP 请求、返回 transport result。
不负责：组件状态管理、错误文案翻译、业务流程编排、缓存、重试、并发控制。
上下游：上游是 operations 与页面动作；下游是后端 API。
何时阅读：当你需要确认前端请求访问层只做了什么时阅读。

当前主要接口包括：

* `listWorkflows`
* `loadWorkflow`
* `saveWorkflow`
* `runDraftWorkflow`
* `getPrompts`
* `getModelResources`
* `getModelResourcesStatus`
* `create/update/deleteModelResource`

原文明确写了两条技术债：

* `API_BASE` 仍是硬编码开发地址
* `DEFAULT_CANVAS_ID = 'article'` 仍是过渡期便利实现

### 3.2 request helper 层

文件路径：`workflowEditorRequests.ts`
角色：请求辅助纯函数层。
负责：提供轻量纯函数，帮助 operations 消费更收敛的请求结果。
不负责：发请求、持有状态。
上下游：上游是错误对象或 workflow 列表变化；下游是 operations。
何时阅读：当你需要确认请求辅助层为什么不直接发请求时阅读。

原文给出的例子包括：

* `getErrorMessage`
* `resolveNextWorkflowName`

这一层只负责把错误对象或 workflow 列表变化收敛成更容易给 operations 用的结果。

### 3.3 mapper 层

文件路径：`workflowEditorMappers.ts`
角色：编辑态与 transport 纯映射层。
负责：ReactFlow 壳与 `WorkflowEditorData` 之间的双向纯映射。
不负责：normalize、非法 config 修复、业务规则裁决。
上下游：上游是 ReactFlow nodes / edges / contextLinks 或 canonical mirror；下游是 save/run payload 与显示壳。
何时阅读：当你需要确认 payload 构建为什么只是纯映射时阅读。

它负责：

* `WorkflowEditorNode[] / WorkflowEditorEdge[] / contextLinks -> WorkflowEditorData`
* `WorkflowEditorData -> ReactFlow nodes / edges`

关键函数包括：

* `buildEditorPayload`
* `buildReactFlowNodes`
* `buildReactFlowEdges`
* `buildWorkflowContextLinks`

这里的边界是：mapper 只做纯映射，不做 normalize，不修复非法 config，不裁决业务规则。
这说明 save/run 流程里的 payload 构建，是先把 ReactFlow 壳压成后端 transport shape，再交给后端正式 normalize + validator。

### 3.4 operations 层

文件路径：`workflowEditorOperations.ts`
角色：异步操作编排层。
负责：组织 bootstrap、workflow detail load、save、direct run、prompt / model resource / canvas list 拉取。
不负责：成为状态 owner。
上下游：上游是 controller；下游是 request wrapper、mapper 与后端接口。
何时阅读：当你需要确认前端异步流程壳负责哪些请求编排时阅读。

主要函数有：

* `fetchWorkflowBootstrapResult`
* `fetchWorkflowDetailResult`
* `saveWorkflowResult`
* `runDraftWorkflowResult`

这一层的正式口径是：

* 只做前端轻量预检与请求编排
* 正式 save/load/run contract 仍以后端为准
* run 当前只走 direct run / run-draft，不包含 persisted run

也就是说，operations 是异步流程壳，不是状态 owner。

### 3.5 runtime controller

文件路径：`useWorkflowRuntime.ts`
角色：远端数据与运行期状态 controller。
负责：持有远端数据和运行期状态，并暴露 save/run/load 等 runtime 入口。
不负责：graph 规则、run display 映射、workflow 默认值、正式合法性裁决。
上下游：上游是页面装配层；下游是 operations 与运行期 UI。
何时阅读：当你需要确认 runtime 侧主控制器持有哪些状态时阅读。

它持有：

* `canvasList`
* `prompts`
* `modelResources`
* `runInputs`
* `isSaving / isRunning / isLoadingWorkflow`
* `bootstrapErrorMessage`

并提供：

* `refreshWorkflowList`
* `refreshModelResources`
* `loadCurrentWorkflow`
* `handleSave`
* `handleRun`
* `syncRunInputs`
* `resetRunInputContext`

这一层的正式边界是：

* 它是 runtime 侧主控制器
* 它持有远端数据和运行期状态
* 它不拥有 graph 规则
* 它不拥有 run display 映射
* 它不定义 workflow 默认值
* 它不做正式合法性裁决

### 3.6 graph controller

文件路径：`useWorkflowGraphEditor.ts`
角色：页面级 graph state 与用户操作编排中心。
负责：持有图编辑壳状态，并组织 ReactFlow 相关交互。
不负责：作为 graph rule owner。
上下游：上游是页面装配层；下游消费 state derivation 结果并驱动编辑器图交互。
何时阅读：当你需要确认 graph controller 持有什么、为什么不是 graph rule owner 时阅读。

它持有：

* `nodes`
* `edges`
* `contextLinks`
* `selectedNodeId / selectedEdgeId / selectedContextLinkId`
* `pendingBindingRequest`

它组织：

* ReactFlow `onNodesChange / onEdgesChange / onConnect`
* add / update / delete node
* delete selected edge / context link
* selection change
* context link mode 切换
* `runResult -> display graph` 的接线

这一层还会消费 state derivation：

* `buildExecutedNodeMap`
* `buildDisplayNodes`
* `buildDisplayEdges`
* `buildInputNodes`
* `buildSelectedNode`

所以 graph controller 的真实角色不是 graph rule owner，而是页面级 graph state + 用户操作编排中心。

---

## 4. domain / state derivation 层

### 4.1 UI 初始 config 层

文件路径：`workflowEditorConfig.ts`
角色：UI 初始 config 与轻量收敛层。
负责：给新建节点提供 UI 初始 config，对编辑态 config 做轻量 trim / coerce。
不负责：后端正式默认值 owner、正式 contract normalize、非法值修复层。
上下游：上游是前端建节点与编辑态需求；下游是 node factory 与 controller。
何时阅读：当你需要确认前端 UI 初始值属于哪一层时阅读。

这里有两个很重要的前端架构口径：

* prompt 新节点默认是“未配置完成态”
* `modelResourceId` 初始为空字符串，表示尚未完成资源选择

### 4.2 node factory 层

文件路径：`workflowEditorNodeFactory.ts`
角色：前端节点壳创建与 UI 收敛层。
负责：创建新的前端节点壳，对更新后的节点壳做 UI 收敛。
不负责：保存窗口关系到节点 config 中。
上下游：上游是 UI 初始 config；下游是 graph controller 与 ReactFlow shell。
何时阅读：当你需要确认新节点壳如何生成时阅读。

关键规则包括：

* 新节点 `id` 与 `position` 只服务当前编辑器壳
* 节点创建后 `type` 不可切换
* 窗口关系不在节点 config 中保存，而在顶层 `contextLinks`

### 4.3 semantic owner

文件路径：`workflowEditorSemantic.ts`
角色：semantic change 规则 owner。
负责：定义什么算 semantic change。
不负责：定义页面之外的后端语义。
上下游：上游是图与节点配置变化；下游是 stale run 判断基础。
何时阅读：当你需要确认 graph semantic version 为什么会变化时阅读。

当前正式规则是：

* `comment` 不计入 semantic version
* input 的 `inputKey / defaultValue / outputs` 计入
* prompt 的 `promptMode / prompt / inlinePrompt / modelResourceId / llm / outputs` 计入
* output 的 `outputs` 计入

这直接决定 stale run 的判断基础。

### 4.4 runInputs 派生层

文件路径：`workflowEditorRunInputs.ts`
角色：runInputs 派生层。
负责：过滤 input 节点、解析 inputKey、在 inputKey 改名后迁移旧值、为缺失项补 `defaultValue` 或空字符串。
不负责：把 `inputKey` 与 `outputs[].stateKey` 混成同一层。
上下游：上游是 input 节点列表与当前 runInputs；下游是 runtime controller 的 run input 管理。
何时阅读：当你需要确认 direct run `input_state` 的 key 到底来自哪里时阅读。

这里要守住一个正式分层：direct run `input_state` 的 key 来自 `inputKey`，不等于 input 节点发布到 workflow state 的 `outputs[].stateKey`。

### 4.5 selection 派生层

文件路径：`workflowEditorSelection.ts`
角色：selection 派生层。
负责：定义当前正式单选 selection 设计。
不负责：多选架构。
上下游：上游是节点、边、pane 点击；下游是 graph controller 与页面选中态。
何时阅读：当你需要确认当前是否是正式单选设计时阅读。

当前正式设计是单选：

* 节点点击 -> 单个节点选中
* 边点击 -> 单个边选中
* pane 点击 -> 清空选中
* selection change -> 只收敛第一个节点

所以这不是“临时只做单选”，而是当前正式单选架构。

### 4.6 viewState 派生层

文件路径：`workflowEditorViewState.ts`
角色：viewState 派生层。
负责：从 runResult、data edges、contextLinks 与图状态派生只读展示字段。
不负责：把 graph truth 与运行时 window instance 混为一谈。
上下游：上游是 runResult 与 graph truth；下游是 graph controller 与页面展示。
何时阅读：当你需要确认节点运行态展示与 graph 派生信息来自哪里时阅读。

它负责：

* 从 `runResult.steps` 派生节点执行态
* 从 data edges + contextLinks 派生 display edges
* 给 prompt 节点补 graph truth 的窗口摘要
* 给节点补 `runtimeInputs / runtimeOutput / runtimePublishedState`
* 给节点补 `derivedTargetInputs / inboundBindings / promptVariableHints`

这里必须明确两件事：

第一，`graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds` 是 graph truth 摘要，不是运行时 window instance。
第二，当前节点运行态展示主要取 latest step，不表达更复杂的多次执行历史。

---

## 5. 页面装配层

页面装配核心在 `WorkflowEditor.tsx`，它是真正的 page-level orchestration owner。

### 5.1 页面层持有的核心状态

文件路径：`WorkflowEditor.tsx`
角色：page-level orchestration owner。
负责：持有页面级核心状态并装配 controller、run context、错误、panel 开关等页面语义。
不负责：代替 controller 成为 graph rule owner 或后端 contract owner。
上下游：上游是应用页面入口；下游是 sidebar、graph、panel 与 run 展示。
何时阅读：当你需要确认页面层为什么不只是渲染组件时阅读。

它持有：

* `requestedCanvasId`
* `activeCanvasId`
* `activeWorkflowContextId`
* `graphSemanticVersion`
* `graphPersistedVersion`
* `committedGraphPersistedVersion`
* `runContext`
* `workflowWarnings`
* `isModelResourcePanelOpen`
* `pageErrorMessage`
* `isSwitchingWorkflow`
* `pendingTargetInput`

这说明页面层不只是渲染组件，而是在做真正的 page state 编排。

### 5.2 页面如何装配两个 controller

文件路径：`WorkflowEditor.tsx` / `useWorkflowRuntime.ts` / `useWorkflowGraphEditor.ts`
角色：页面层 controller 装配点。
负责：把 runtime controller 与 graph controller 接起来。
不负责：把 controller 与 page 混成同一层。
上下游：上游是两个 controller；下游是页面状态与 UI 响应。
何时阅读：当你需要确认页面层与 controller 层如何分工时阅读。

`WorkflowEditor.tsx` 同时装配两个控制器：

* `useWorkflowRuntime()`
* `useWorkflowGraphEditor(...)`

其中：

* runtime controller 负责远端数据、运行期状态和 save/run/load 流程入口
* graph controller 负责 `nodes/edges/contextLinks/selection/pending binding` 等编辑壳状态

页面层再把它们接起来，例如：

* workflow load 成功后，用 `replaceGraph(...)` 原子替换图状态
* `inputNodes` 变化后，调用 `syncRunInputs(inputNodes)`
* run 成功后，把 transport `runResult` 包进 `WorkflowRunContext`
* graph semantic 改变时，增加 `graphSemanticVersion`

### 5.3 Sidebar 是页面意图出口

文件路径：`WorkflowSidebar.tsx`
角色：页面意图发出组件。
负责：接 props 并触发页面动作。
不负责：持有图规则、持有 runtime 状态。
上下游：上游是页面层传入 props；下游是用户意图事件。
何时阅读：当你需要确认 sidebar 为什么不是状态 owner 时阅读。

它只接 props 并触发：

* canvas 切换
* 刷新 canvas list
* 新增节点
* 编辑 run inputs
* Save / Run / Clear Run State
* 打开 model resource panel

### 5.4 NodeConfigPanel 是节点编辑装配层

文件路径：`NodeConfigPanel.tsx`
角色：节点配置装配层。
负责：作为选中节点的配置编辑入口，展示只读元信息，统一编辑 outputs、comment、inputKey，并为 prompt/input/output 子表单装配 props。
不负责：图规则、保存前裁决、config normalize、runtime 语义解释。
上下游：上游是 selected node 与 graph-derived 信息；下游是具体节点配置子表单。
何时阅读：当你需要确认 NodeConfigPanel 为什么不是规则 owner 时阅读。

它还会从 `edges / contextLinks` 派生 graph-derived 只读信息。
但它本质上是节点配置装配层，不是规则 owner。

### 5.5 RunResultPanel 只消费 `DisplayRun`

文件路径：`RunResultPanel.tsx` / `WorkflowEditor.tsx`
角色：run display 消费边界。
负责：`RunResultPanel.tsx` 只消费 `DisplayRun`；页面层负责把 direct run transport 映射为 display run。
不负责：让 `RunResultPanel` 直接解释后端 `RunResult`。
上下游：上游是页面层的 display mapper 接线；下游是 run 展示 UI。
何时阅读：当你需要确认 run transport -> display run 映射当前接在哪一层时阅读。

`RunResultPanel.tsx` 明确只吃：

* `DisplayRun`

不直接解释后端 `RunResult`。
而且 `WorkflowEditor.tsx` 里是页面层直接调用：

* `buildDisplayRunFromDirectRun(runResult, { isStale })`

这意味着：direct run transport -> display run 的映射当前是在页面装配层接入的，而不是在 runtime controller 里完成的。
这是必须点明的一条边界。

### 5.6 `WorkflowModelResourcePanel` 仍是复合组件

文件路径：`WorkflowModelResourcePanel.tsx`
角色：页面装配层中的复合组件。
负责：同时承担 UI 渲染、局部表单状态、直接 API 调用、错误解析、删除阻止 detail 展示。
不负责：完全收口进 operations/controller 链。
上下游：上游是页面层 overlay / side panel；下游是 model resource 管理 UI 与直接 API 交互。
何时阅读：当你需要确认 model resource panel 为什么还带 request / protocol knowledge 时阅读。

所以它虽然在页面装配层里出现，但实际上还保留了一部分 request / protocol knowledge，没有完全收口到 operations/controller 链。

---

## 6. `requestedCanvasId` vs `activeCanvasId`

### 6.1 两层 canvas 语义

文件路径：`WorkflowEditor.tsx`
角色：页面 canvas 上下文边界。
负责：同时维护 `requestedCanvasId` 与 `activeCanvasId` 两层语义。
不负责：把用户请求目标与当前已成功提交目标混成同一层。
上下游：上游是 canvas 切换意图；下游是 workflow load 成功 / 失败后的页面状态。
何时阅读：当你需要确认页面为什么要拆两层 canvasId 时阅读。

页面层同时维护：

* `requestedCanvasId`
* `activeCanvasId`

它们的区别是：

* `requestedCanvasId`：用户当前请求切换到的 canvas
* `activeCanvasId`：真正已提交成功、当前页面事实所对应的 canvas

### 6.2 切换流程

文件路径：`WorkflowEditor.tsx`
角色：canvas 切换提交流程。
负责：在切换流程中先更新 requested，再在成功后提交 active。
不负责：让失败切换污染当前 active 页面事实。
上下游：上游是用户切换 canvas；下游是 workflow load 结果。
何时阅读：当你需要确认切换失败时页面如何避免错乱时阅读。

当用户请求切换 canvas 时：

1. 页面先更新 `requestedCanvasId`
2. 进入 `isSwitchingWorkflow = true`
3. 异步调用 `loadCurrentWorkflow(targetCanvasId)`

成功后才提交：

* `activeCanvasId = targetCanvasId`
* `activeWorkflowContextId += 1`

失败时：

* `activeCanvasId` 保持不变
* `requestedCanvasId` 回退到旧的 active

这正是 `buildCanvasSwitchErrorMessage(...)` 和 `commitWorkflowLoad(...)` 在做的事情。

### 6.3 为什么要拆两层

如果只有一个 `canvasId`，切换失败时页面会陷入“UI 已显示目标 canvas，但实际图状态仍是旧 canvas”的混乱状态。
拆成 requested 和 active 后，页面可以明确表达：

* 用户想切过去哪里
* 当前真正成功提交的是哪里

这也是 `WorkflowSidebar.tsx` 里同时显示 Requested 与 Active 的原因。

---

## 7. `WorkflowRunContext`：页面如何和后端 `RunResult` 解耦

这是这篇最关键的一节。

### 7.1 后端 `RunResult` 不带页面归属

文件路径：`runTypes.ts` / `workflowEditorUiTypes.ts` / `WorkflowEditor.tsx`
角色：transport result 与页面归属的边界。
负责：明确后端 `RunResult` 只表达 transport result，不包含页面归属语义。
不负责：让后端 run contract 承担页面上下文。
上下游：上游是 direct run transport result；下游是页面层 ownership 壳。
何时阅读：当你需要确认为什么 stale 与页面归属不在后端 `RunResult` 里时阅读。

后端 direct run 返回的是 transport `RunResult`。它只包含：

* `status`
* `run_scope`
* `input_state`
* `final_state / partial_state`
* `steps`
* `error_*`
* `failure_stage`

它不包含：

* 属于哪个页面
* 属于哪个 active canvas context
* 当前是否 stale

### 7.2 页面层补一个 ownership 壳

文件路径：`workflowEditorUiTypes.ts` / `WorkflowEditor.tsx`
角色：页面 ownership 壳。
负责：把裸 `RunResult` 包进 `WorkflowRunContext`。
不负责：修改后端 run contract。
上下游：上游是 run 成功后的 transport result；下游是页面当前 run 事实。
何时阅读：当你需要确认页面如何给后端 `RunResult` 补归属语义时阅读。

页面层在 run 成功后，不直接保存裸 `RunResult`，而是保存：

* `canvasId`
* `workflowContextId`
* `graphSemanticVersion`
* `runResult`

也就是 `WorkflowRunContext`。

### 7.3 当前 run 是否还能被当作“当前页面事实”

文件路径：`WorkflowEditor.tsx`
角色：当前页面 run 事实过滤层。
负责：先做 workflow context 过滤，再做 semantic version stale 判断。
不负责：把所有旧 run 统一当成当前页面事实。
上下游：上游是 `runContext`、`activeWorkflowContextId`、`graphSemanticVersion`；下游是 `activeRunContext` 与 `isRunResultStale`。
何时阅读：当你需要确认 run 何时失效、何时只是 stale 时阅读。

页面会先做两层过滤。

第一层，workflow context 过滤：

* 若 `runContext.workflowContextId !== activeWorkflowContextId`
* 则该 run 直接失效，不再视为当前页面 run

第二层，semantic version 过滤：

* 若 `runContext.graphSemanticVersion !== graphSemanticVersion`
* 则该 run 不完全失效，但会被标记为 stale

这正对应：

* `activeRunContext`
* `isRunResultStale`

### 7.4 stale 的正式语义

文件路径：`WorkflowEditor.tsx` / `RunResultPanel.tsx`
角色：stale 页面语义层。
负责：把 stale 明确定义为页面级语义。
不负责：把 stale 加回后端 run contract。
上下游：上游是 `WorkflowRunContext` 与 graph semantic version；下游是页面提示条与 display run。
何时阅读：当你需要确认 stale 到底是什么意思时阅读。

当前 stale 语义是：

* stale 是页面级语义
* stale 不是后端 run contract 的字段
* stale 的意思是：这个 run 属于当前 workflow context，但它对应的是旧 semantic version 的 graph
* 这种结果只保留参考价值，不再代表当前 graph 事实

`RunResultPanel.tsx` 里也把这点展示成黄色提示条。

### 7.5 跨 workflow context 时必须失效

文件路径：`WorkflowEditor.tsx`
角色：跨 workflow context 失效边界。
负责：在成功切换 canvas 或重新加载 committed workflow 并重置图时清空 `runContext`。
不负责：让旧 run 挂在新页面事实之上。
上下游：上游是 workflow context 切换；下游是当前页面 run 事实。
何时阅读：当你需要确认跨 canvas 或重载后旧 run 为什么会消失时阅读。

当页面成功切换到另一个 canvas，或者重新加载 committed workflow 并重置图时，页面会：

* `setRunContext(null)`

因此跨 workflow context 的旧 run 不会继续挂在当前页面事实之上。
这就是“页面级上下文和后端 run result 解耦”的正式实现方式：不是修改后端 run contract，而是前端加 ownership 壳和 stale 规则。

---

## 8. 页面状态边界

当前页面状态边界主要体现在 `WorkflowEditor.tsx`。

### 8.1 错误边界

文件路径：`WorkflowEditor.tsx`
角色：页面错误分层。
负责：把页面错误分成 bootstrap 错误与 page 错误，并组合成 top-level 错误展示。
不负责：把不同阶段错误混成一个来源。
上下游：上游是初始化与后续动作错误；下游是页面顶部错误展示。
何时阅读：当你需要确认 top-level error 来自哪两层时阅读。

当前页面错误分成两层：

* `bootstrapErrorMessage`
* `pageErrorMessage`

然后拼成：

* `topLevelErrorMessage`

这说明：

* bootstrap 错误是页面初始化阶段的远端数据加载错误
* page 错误是后续用户动作、切换、保存、运行、图交互过程中的页面级错误

### 8.2 graph version 边界

文件路径：`WorkflowEditor.tsx`
角色：页面 graph version 边界。
负责：维护 semantic、persisted、committed 三类版本号。
不负责：把三类 version 语义混成一个 version。
上下游：上游是图变化、保存、加载；下游是 dirty 判断与 stale 判断。
何时阅读：当你需要确认 dirty 与 stale 分别依赖什么版本信息时阅读。

当前页面维护三类版本号：

* `graphSemanticVersion`
* `graphPersistedVersion`
* `committedGraphPersistedVersion`

语义分别是：

* `graphSemanticVersion`：影响当前 graph 语义的变更版本
* `graphPersistedVersion`：当前编辑壳发生的可持久化变更版本
* `committedGraphPersistedVersion`：最近一次成功保存或成功加载后对应的持久化版本锚点

页面通过：

* `graphPersistedVersion !== committedGraphPersistedVersion`

判断当前图是否 dirty。

### 8.3 warning 边界

文件路径：`WorkflowEditor.tsx`
角色：workflow load warning 边界。
负责：维护 `workflowWarnings`，并区分 warning 与错误。
不负责：把 editor load 的 warning 混成普通错误。
上下游：上游是 editor load warning；下游是页面 warning 展示与清理。
何时阅读：当你需要确认页面 warning 从哪里来、何时会清空时阅读。

`workflowWarnings` 来自 editor load 的 warning，而不是普通错误。
保存成功后会清空 warnings，重新加载 committed workflow 时则会更新 warnings。

### 8.4 model resource panel 开关

文件路径：`WorkflowEditor.tsx`
角色：页面 panel 开关状态。
负责：持有 `isModelResourcePanelOpen`。
不负责：把 model resource panel 做成独立路由或独立全局状态。
上下游：上游是页面动作；下游是 overlay / side panel 展示。
何时阅读：当你需要确认 model resource panel 当前挂在哪里时阅读。

这说明 model resource panel 当前仍是页面级 overlay / side panel，而不是独立路由或独立全局状态。

### 8.5 pending binding 是纯页面交互态

文件路径：`WorkflowEditor.tsx` / `useWorkflowGraphEditor.ts`
角色：binding 临时 UI 交互态。
负责：由 `pendingTargetInput` 与 `pendingBindingRequest` 共同组成“创建 binding 的临时 UI 交互态”。
不负责：进入保存态或后端 transport。
上下游：上游是页面与 graph controller 交互；下游是 binding 创建 UI。
何时阅读：当你需要确认 pending binding 为什么不进入保存链时阅读。

这两者一起组成“创建 binding 的临时 UI 交互态”，不进入保存态，也不进入后端 transport。

---

## 9. 当前限制与技术债

### 9.1 `API_BASE` 仍硬编码

文件路径：`api.ts`
角色：request wrapper 当前限制。
负责：当前仍以硬编码开发地址作为 API_BASE。
不负责：环境化配置收口。
上下游：上游是 request wrapper；下游是所有前端 API 请求。
何时阅读：当你需要确认前端 API 地址为什么还未环境化时阅读。

当前仍是：

* `http://127.0.0.1:8000/api`

这意味着前端 request wrapper 还没有完成环境化配置收口。

### 9.2 默认 canvas 仍是 `article`

文件路径：`api.ts` / `WorkflowEditor.tsx`
角色：默认 canvas 过渡期假设。
负责：当前保留 `DEFAULT_CANVAS_ID = 'article'`。
不负责：完整多画布默认规则。
上下游：上游是页面默认入口；下游是 workflow 初始加载。
何时阅读：当你需要确认默认 canvas 规则为什么仍带过渡期痕迹时阅读。

这说明当前多画布规则还带有过渡期默认入口假设。

### 9.3 mirror types 仍是手写同步

文件路径：`workflowEditorTypes.ts` / `runTypes.ts` / `modelResourceTypes.ts`
角色：手写镜像类型边界。
负责：当前通过手写 mirror types 与后端 contract 同步。
不负责：自动生成或自动漂移校验。
上下游：上游是后端 contract 变化；下游是前端类型同步成本。
何时阅读：当你需要评估前后端 contract 漂移风险时阅读。

原文明确指出，这要求前后端 contract 变更时人工同步，存在漂移风险。

### 9.4 页面层仍直接接入 display mapper

文件路径：`WorkflowEditor.tsx`
角色：display mapper 接线当前落点。
负责：当前由页面层直接调用 `buildDisplayRunFromDirectRun(...)`。
不负责：把 run transport -> display run 收口进单独 controller 或 display adapter 层。
上下游：上游是 direct run transport result；下游是 `RunResultPanel`。
何时阅读：当你需要确认 display mapper 为什么还直接接在 page 层时阅读。

这说明 run transport -> display run 的接线还在 page 层，而不是单独 controller 或 display adapter 层。

### 9.5 `WorkflowModelResourcePanel` 仍是复合组件

文件路径：`WorkflowModelResourcePanel.tsx`
角色：model resource 前端链的未完全收口点。
负责：同时承担 UI、局部表单状态、API 调用、错误解析、delete blocked detail 展示。
不负责：完全收口进 operations/controller。
上下游：上游是页面 overlay；下游是 model resource 管理交互。
何时阅读：当你需要确认 model resource 管理链为什么还没有完全前端分层收口时阅读。

这意味着 model resource 管理链在前端还没有完全收口进 operations/controller。

### 9.6 graph shell 混合了多类字段

文件路径：`workflowEditorGraphTypes.ts`
角色：graph shell 混合字段的设计边界。
负责：当前在 `WorkflowNodeData` 中同时装 `config`、graph-derived 字段、runtime-derived 字段。
不负责：把这些字段当成保存态 contract。
上下游：上游是显示壳设计；下游是图编辑与展示。
何时阅读：当你需要确认哪些字段绝不能误写回保存链时阅读。

这是当前前端显示壳设计，不是保存态 contract。维护时必须持续警惕把 display/runtime 字段误写回保存链。

### 9.7 single-select 是正式设计

文件路径：`workflowEditorSelection.ts` / `useWorkflowGraphEditor.ts`
角色：当前 selection 设计边界。
负责：按单选组织 selection 派生与 controller。
不负责：多选。
上下游：上游是 selection 事件；下游是页面选中态。
何时阅读：当你需要确认当前是否应按单选心智维护 graph editor 时阅读。

原文明确指出：这不是“暂时没做多选”，而是当前正式设计边界。

### 9.8 页面层仍有部分编排重复

文件路径：`useWorkflowGraphEditor.ts`
角色：页面/controller 局部重复边界。
负责：当前仍存在 selection change 路径未完全复用 selection helper、edge click 与 selection change 仍使用较宽松输入形状的问题。
不负责：完全收口这些局部重复。
上下游：上游是 graph controller 编排；下游是 selection 与交互逻辑。
何时阅读：当你需要评估页面/controller 编排上还有哪些局部未收口点时阅读。

这属于页面/controller 编排上的局部重复和不够收口。

---

## 10. 关键分层原则

### 10.1 mirror type 不等于后端 owner

前端这些 mirror types 只是镜像后端 canonical / transport contract。
它们不拥有后端 contract，也不替代后端 owner。

### 10.2 controller 不等于 page

controller 持有远端数据和图编辑状态。
页面层再决定当前 canvas、当前 workflow context、run result 是否 stale、错误如何汇总展示。
这两层不能混。

### 10.3 后端 `RunResult` 不等于页面事实

后端 `RunResult` 只表达 transport result。
页面层通过 `WorkflowRunContext` 和 `WorkflowPageContext` 给它补上 active canvas、workflow context、semantic version 这层页面语义。
transport result 和页面事实是分离的。

### 10.4 ReactFlow shell 不等于保存态 contract

ReactFlow node/edge shell 是前端编辑与展示壳。
它不是 canonical contract。
其中 runtime-derived 与 graph-derived 字段都不能被误写回保存链。

### 10.5 stale 是页面级语义，不是后端字段

stale 只表示：这个 run 仍属于当前 workflow context，但它对应的是旧 semantic version 的 graph。
它不是后端 run contract 的字段，而是页面层 ownership 壳与 semantic version 对比后的结果。

---

## 结语

当前前端 editor 架构已经形成了比较清晰的链条：

* 共享基础类型层负责最小共享基础类型
* mirror type 层负责把后端 canonical / transport contract 镜像到前端
* request / mapper / operations 负责远端交互与纯映射
* runtime controller 持有远端数据与运行期状态
* graph controller 持有图编辑壳与页面交互态
* domain / state derivation 负责 UI 初始 config、semantic change、runInputs、selection、display graph 的派生
* 页面层再统一装配 canvas context、workflow context、run stale 语义、错误展示与面板开关

其中最关键的架构点是：

后端 `RunResult` 不负责页面归属；前端通过 `WorkflowPageContext` 和 `WorkflowRunContext` 补上“当前 active canvas、当前 workflow context、当前 semantic version”这层页面语义，从而把 transport result 和页面事实解耦。

