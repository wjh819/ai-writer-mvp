
# 05-frontend-graph-rules-and-view-derivation主链背景
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
## 本篇适用场景

这篇文档用于回答前端 graph 链的以下问题：

* 前端 graph 规则 owner 在哪里？
* 前端预检和后端 validator 的边界是什么？
* ReactFlow node/edge 壳与保存态、显示态、运行态的关系是什么？
* 当前前端 graph 链有哪些明确限制和技术债？

---

## 先看结论

当前前端 graph 链可以分成五块职责：

1. ReactFlow shell type 层
   `workflowEditorGraphTypes.ts`

2. graph rule / graph-sync owner
   `workflowEditorGraph.ts`

3. validation rules 与保存前预检
   `workflowEditorValidationRules.ts`
   `workflowEditorValidators.ts`

4. editor domain / state derivation
   `workflowEditorSemantic.ts`
   `workflowEditorConfig.ts`
   `workflowEditorNodeFactory.ts`
   `workflowEditorRunInputs.ts`
   `workflowEditorSelection.ts`
   `workflowEditorViewState.ts`
   `promptVariableHints.ts`

5. controller / 组件消费层
   `workflowEditorActions.ts`
   `useWorkflowGraphEditor.ts`
   `WorkflowNode.tsx`
   `WorkflowSelectionBar.tsx`
   `NodeConfigPanel.tsx`
   `PromptNodeConfig.tsx`
   `InputNodeConfig.tsx`
   `OutputNodeConfig.tsx`

这条链最关键的分层原则有四条：

* ReactFlow node/edge shell 不是 canonical contract。前端 `WorkflowEditorNode / WorkflowEditorEdge / WorkflowEditorContextEdge` 只是 UI shell，不是正式保存态 owner。
* graph rule owner 和 validation rule owner 分离。即时连接拒绝、局部图同步、局部联动清理由 `workflowEditorGraph.ts` 负责；批量规则检查和保存前首错暴露由 `workflowEditorValidationRules.ts` 与 `workflowEditorValidators.ts` 负责。
* 前端预检不是后端正式 validator。前端只做 UX 层快速暴露与即时预阻断；后端 normalize + validator 仍是唯一正式裁决者。
* graph truth 必须和 runtime window instance 分开。`graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds` 只表示顶层 `contextLinks` 在当前图上的关系摘要，不是运行时 window identity。

---

## 问题分流

### 如果你要改 ReactFlow 壳字段、node.data 混合内容、显示边壳

先看：

* `workflowEditorGraphTypes.ts`
* `workflowEditorViewState.ts`
* `WorkflowNode.tsx`

原因：

* `workflowEditorGraphTypes.ts` 定义 ReactFlow shell。
* `workflowEditorViewState.ts` 负责把保存态、graph-derived、runtime-derived 叠到显示节点和显示边上。
* `WorkflowNode.tsx` 直接消费这些显示态字段。

### 如果你要改即时连线拒绝、局部联动、删除同步

先看：

* `workflowEditorGraph.ts`

原因：

* data edge 即时连接拒绝、context link 即时连接拒绝、删除联动、output rename 联动、局部 model consistency、轻量 cycle 预阻断都在这一层。

### 如果你要改保存前批量预检或首错暴露

先看：

* `workflowEditorValidationRules.ts`
* `workflowEditorValidators.ts`

原因：

* 细粒度批量规则在 `workflowEditorValidationRules.ts`
* 保存前总预检编排入口在 `workflowEditorValidators.ts`

### 如果你要改 semantic change / stale run 判断

先看：

* `workflowEditorSemantic.ts`

原因：

* `isSameSemanticNodeConfig(...)` 定义了当前 semantic equality 规则。
* 页面层对 stale run 的判断最终依赖 graph semantic version，而其底层定义由这里决定。

### 如果你要改新节点初始 config、默认 output、默认 llm

先看：

* `workflowEditorConfig.ts`
* `workflowEditorHelpers.ts`
* `workflowEditorNodeFactory.ts`

原因：

* 这一组文件拥有 UI 初始 config、轻量建议值、节点壳创建与 UI 收敛。

### 如果你要改 direct run 输入壳与 inputKey 迁移

先看：

* `workflowEditorRunInputs.ts`

原因：

* `input_state` 的 key 来源、改名迁移策略、默认值回退都在这一层。

### 如果你要改 selection 行为

先看：

* `workflowEditorSelection.ts`
* controller 层

原因：

* `workflowEditorSelection.ts` 负责基础单选收敛。
* context edge 特例仍在 controller 分流。

### 如果你要改显示态派生、执行态叠加、context edge 显示

先看：

* `workflowEditorViewState.ts`

原因：

* `executedNodeMap`、`latestStepMap`、`runtime*`、`inboundBindings`、`derivedTargetInputs`、`graphWindow*`、`displayEdges` 都在这里生成。

### 如果你要改 prompt 文本变量 hint

先看：

* `promptVariableHints.ts`
* `PromptNodeConfig.tsx`
* `WorkflowNode.tsx`

原因：

* hint 提取 owner 在 `promptVariableHints.ts`
* UI 展示和边界提示在组件层。

---

## 1. ReactFlow shell type 层

### 文件

`workflowEditorGraphTypes.ts`

### 角色

定义 ReactFlow shell type。

### 负责

* 定义 `WorkflowEditorNode`
* 定义 `WorkflowEditorEdge`
* 定义 `WorkflowEditorContextEdge`
* 定义 `WorkflowGraphEdge`
* 定义 `WorkflowNodeData`

### 不负责

* canonical contract
* 正式保存态 owner

### 关键边界

#### 1.1 WorkflowEditorNode 只是前端壳

`WorkflowEditorNode` 本质上是：

`ReactFlow Node<WorkflowNodeData, 'workflowNode'>`

它不是后端 canonical `WorkflowNode`，也不是保存态 owner。
真正保存链里的业务字段，只有 `node.data.config` 这一块 mirror config。

#### 1.2 node.data 同时承载三类字段

`WorkflowNodeData` 当前混合承载：

1. `config`
   正式业务 config mirror，属于保存链

2. graph-derived 字段
   例如：

* `derivedTargetInputs`
* `inboundBindings`
* `promptVariableHints`
* `graphWindowMode`
* `graphWindowSourceNodeId`
* `graphWindowTargetNodeIds`

3. runtime-derived 字段
   例如：

* `isExecuted`
* `stepIndex`
* `runtimeInputs`
* `runtimeOutput`
* `runtimePublishedState`

必须明确：

`node.data` 不是纯保存态；它是 config、graph-derived、runtime-derived 混合壳。

#### 1.3 edge id 只服务本地编辑期

前端 data edge 和 context edge 都有本地 id，但这些 id 都不是业务稳定 identity。

* data edge id 用于当前前端显示 / 操作 identity
* context edge 显示 id 形如 `context::<contextLink.id>`
* graph 层本地新建 edge/contextLink 时还会生成 temp id

这些 id 的作用只有：

* ReactFlow 渲染
* 前端 selection
* 前端编辑期操作

它们不应被当成持久化 identity，也不应被误写进业务语义层。

### 何时阅读

* 需要判断某个字段是保存态、显示态还是运行态时
* 需要确认某个 node/edge 字段是不是正式业务 contract 时
* 需要确认本地 edge id 是否可作为稳定 identity 时

---

## 2. graph rule / graph-sync owner

### 文件

`workflowEditorGraph.ts`

### 角色

前端图规则的核心 owner，负责图编辑过程中的即时拒绝和局部联动同步。

### 负责

* data edge 即时连接拒绝
* context link 即时连接拒绝
* 删除节点 / 边 / contextLink 时的局部联动清理
* output rename 对 outbound edges 的同步
* context-linked prompt 的局部 `modelResourceId` 一致性检查
* data edges + contextLinks 的联合执行环轻量预阻断

### 不负责

* 后端正式 contract normalize
* 保存前最终合法性裁决
* 外部依赖深校验
* 自动修复任意脏数据
* HTTP payload 映射

### 上下游

* 上游：当前图编辑动作
* 下游：图内节点、边、contextLink 的即时更新与拒绝

### 2.1 data edge 连接规则

入口：

`connectEdgeWithNodeSync(...)`

当前规则包括：

* source / target 必须存在
* 不允许 self-loop
* target 不能是 input 节点
* `sourceOutput / targetInput` 都必须存在
* `targetInput` 不能使用 `CREATE_BINDING_HANDLE_ID`
* `sourceOutput / targetInput` 必须通过 `validateOutputFormat`
* `sourceOutput` 必须存在于 source node 的 outputs 中
* 相同 binding edge 不允许重复
* 同一 target node 的同一 `targetInput` 只能绑定一次
* data edge + contextLinks 的联合执行图不能成环

边界：

data edge 只表达结构化输入绑定；contextLinks 不参与 `targetInput` 绑定，但会参与联合执行环预检查。

### 2.2 context link 连接规则

入口：

`connectContextLinkWithGraphSync(...)`

当前规则包括：

* 只允许 prompt -> prompt
* source / target 必须存在
* 不允许 self-loop
* mode 只能是 `continue | branch`
* context link id 不能重复
* 同一 `source->target` pair 不能重复
* target 只允许一个 inbound context link
* source / target 若都已选择 `modelResourceId`，则必须一致
* data edges + contextLinks 的联合执行图不能成环
* source outbound 当前额外约束为：最多一个 `continue`

边界：

`new_window` 不是 graph 链里保存的 mode；它只是“无 inbound context link”时的运行时 / 展示语义。

### 2.3 output rename 的局部联动

当节点 config 更新时，graph 层会在：

`applyUpdatedNodeInGraph(...)`

里处理 output rename。

当前策略是：

* 先比较旧 outputs 和新 outputs
* 生成 `renameMap`
* 同步修改所有 outbound edges 的 `sourceOutput / sourceHandle`
* 如果某个被删除的 output 仍被出边引用，则拒绝本次更新

边界：

output 名称不是纯表单文本；它会影响当前图上的 binding 关系，因此必须由 graph-sync owner 负责联动。

### 2.4 删除联动

graph 层还负责删除联动：

* 删除 edge -> `removeEdgesWithNodeSync`
* 删除 context link -> `deleteContextLinkInGraph`
* 删除 node -> `deleteNodeInGraph`
* 批量 remove node changes -> `removeNodesWithGraphSync`

删除 node 时会同步清理：

* 所有 `source/target` 指向该 node 的 data edges
* 所有 `source/target` 指向该 node 的 contextLinks

### 2.5 context-linked prompt 的局部 model consistency

当更新某个 prompt 节点时，graph 层还会做：

`validatePromptContextModelConsistency(...)`

当前规则是：

* 若该 prompt 和其 context-linked 相邻 prompt 都已经选择了 `modelResourceId`
* 则 source / target 必须一致
* 若节点不再是 prompt，则移除相关 contextLinks

边界：

这条规则只做局部 UX 预检，不替代后端全图依赖裁决。

### 2.6 cycle 预阻断

graph 层通过 `hasExecutionPath(...)` 对 data edges 和 contextLinks 的联合执行图做轻量 DFS 预阻断。

当前口径是：

* 这是前端即时预阻断
* 不是正式 cycle owner
* 最终以后端 validator 为准

### 何时阅读

* 改连线规则
* 改节点删除、边删除、contextLink 删除联动
* 改 output rename 后的同步行为
* 改图编辑期的轻量 cycle 预阻断
* 查为什么某个连接在前端被立即拒绝

---

## 3. validation rules owner

### 文件

`workflowEditorValidationRules.ts`

### 角色

对当前编辑态做批量轻量规则检查，并返回首个用户可展示错误。

### 负责

* output / stateKey / inputKey 基础规则
* edge 引用关系
* inbound binding 基础规则
* contextLink 基础引用关系
* data edges + contextLinks 联合执行环预检
* context outbound 规则的批量预检

### 不负责

* 自动修复
* 外部依赖检查
* 后端正式合法性裁决
* 默认值补齐

### 边界

它的定位是：UX 层细粒度校验规则集合，不是正式 contract owner。

### 3.1 output / stateKey / inputKey 规则

`validateNodeOutputRules(...)` 当前负责：

* 每个 node 至少一个 output
* `output.name` 必须通过 `validateOutputFormat`
* `stateKey` 必须通过 `validateOutputFormat`
* 同一节点内 `output.name` 不能重复
* `stateKey` 不能与自身 `node.id` 相同
* `stateKey` 不能与其他 `node.id` 冲突
* `stateKey` 在 workflow 范围内必须唯一
* input 节点必须恰好一个 output
* output 节点必须恰好一个 output
* input 节点的 `inputKey` 必须合法

### 3.2 edge 引用关系规则

`validateEdgeReferences(...)` 当前负责：

* edge `source / target` 不为空
* `source / target node` 必须存在
* input 节点禁止 inbound binding
* `sourceOutput / targetInput` 必须合法
* `sourceOutput` 必须存在于 source node outputs
* 同一 target 的同一 `targetInput` 只能被一个 source 拥有

### 3.3 output node inbound 规则

`validateNodeInboundBindingRules(...)` 当前只额外检查：

* output 节点必须至少有一个 inbound binding

### 3.4 context link 基础规则

`validateContextLinkReferences(...)` 当前负责：

* id 必填且唯一
* `source / target` 必填且必须存在
* 只能 prompt -> prompt
* mode 只能是 `continue / branch`
* 不允许 self-loop
* 同一 target 只允许一个 inbound context link
* `source / target modelResourceId` 必须一致
* 与 data edges 合并后的执行图不能成环

### 3.5 context outbound 规则

`validateContextSourceOutboundRules(...)` 当前只实现了最小规则：

* 同一 source 最多一个 `continue outbound context link`

这不是完整 topology 目标，只是当前前端已实现的最小收口规则。

### 何时阅读

* 改前端批量预检规则
* 查保存前为什么报某个图错误
* 查 `stateKey / inputKey / output.name` 规则
* 查 contextLink 批量规则

---

## 4. 保存前总预检入口

### 文件

`workflowEditorValidators.ts`

### 角色

保存前总预检入口。

### 核心入口

`validateWorkflowBeforeSave(...)`

### 负责

* 编排执行顺序
* 尽早返回首个可展示错误
* 服务 save 前 UX 提前失败

### 不负责

* 收集完整错误列表
* 外部依赖深校验
* 正式 contract 裁决
* 自动修复非法数据

### 当前执行顺序

1. 节点 output / stateKey 规则
   `validateNodeOutputRules`

2. prompt 节点局部规则
   `validatePromptNodeRules`

3. edge 引用关系
   `validateEdgeReferences`

4. inbound binding 规则
   `validateNodeInboundBindingRules`

5. context link 引用关系
   `validateContextLinkReferences`

6. 执行图环检查
   `validateDataEdgeExecutionCycles`

### 4.1 prompt 节点局部规则

`validatePromptNodeRules(...)` 当前负责：

* `promptMode` 必须是 `template | inline`
* `modelResourceId` 必填
* `llm.temperature / timeout / max_retries` 必须存在且为 number

template 模式下：

* `prompt` 必填
* `inlinePrompt` 必须为空

inline 模式下：

* `inlinePrompt` 必填
* `prompt` 必须为空

这一层不检查：

* prompt 模板是否真实存在
* model resource 是否真实可解析
* prompt 变量与 inbound bindings 是否匹配

### 4.2 和后端 validator 的边界

正式口径：

* 这里只是 UX 层提前失败
* 只返回首个错误
* 后端保存链仍会执行唯一正式 normalize + validator
* prompt 模板存在性、model resource 存在性、依赖匹配等问题，前端不拥有正式裁决权

也就是说：

前端 validators 负责“尽快提示”，后端 validator 负责“最终裁决”。

### 何时阅读

* 改保存前校验编排顺序
* 查为什么前端只报首个错误
* 查 prompt 节点保存前最小规则
* 确认某类问题是不是前端拥有正式裁决权

---

## 5. semantic change owner

### 文件

`workflowEditorSemantic.ts`

### 角色

semantic change owner。

### 核心函数

`isSameSemanticNodeConfig(...)`

### 当前正式规则

当前 semantic equality 规则是：

* `comment` 不计入 semantic version

input 节点：

* `inputKey`
* `defaultValue`
* `outputs`

计入 semantic version

prompt 节点：

* `promptMode`
* `prompt`
* `inlinePrompt`
* `modelResourceId`
* `llm.temperature / timeout / max_retries`
* `outputs`

计入 semantic version

output 节点：

* `outputs`

计入 semantic version

节点 `type` 改变必定视为语义变化。

### 关键边界

`isSameOutputs(...)` 当前是按 index 比较的，所以：

* output 集合相同但顺序不同
* 当前仍视为 semantic 变化

### 下游

页面层对 stale run 的判断，最终依赖 graph semantic version。
而 graph semantic version 的底层定义，正是由这层决定的。

### 何时阅读

* 改 stale run 判断
* 改哪些字段算 semantic change
* 改 outputs 顺序是否算语义变化

---

## 6. UI 初始 config 与 node factory

### 文件

* `workflowEditorConfig.ts`
* `workflowEditorNodeFactory.ts`
* `workflowEditorHelpers.ts`

### 角色

拥有 UI 初始 config、轻量建议值、节点壳生成与 UI 收敛。

### 6.1 workflowEditorConfig.ts

#### 负责

* 新建节点 UI 初始 config
* 轻量 trim / coerce

#### 不负责

* 后端正式默认值
* 正式 contract normalize
* 非法值修复
* 深层合法性裁决

#### 新节点初始 config

`createInitialWorkflowNodeConfig(...)` 当前规则是：

input 节点初始：

* `inputKey = nodeId`
* 单个默认 output
* `defaultValue = ''`

output 节点初始：

* 单个默认 output

prompt 节点初始：

* `promptMode = 'template'`
* `prompt = ''`
* `inlinePrompt = ''`
* `modelResourceId = ''`
* `llm = getDefaultLLMConfig()`
* 默认 output 一项

必须强调：

prompt 新节点初始是“未配置完成态”，不是可直接保存态。

### 6.2 workflowEditorHelpers.ts

#### 负责

提供轻量公共建议值：

* `getDefaultLLMConfig()`
* `buildDefaultOutput(nodeId)`
* `buildNextPromptOutputSpec(nodeId, outputs)`

#### 边界

这些都只是 UI 建议，不是后端正式默认值，也不保证全图唯一。

### 6.3 workflowEditorNodeFactory.ts

#### 负责

* 创建新的前端节点壳
* 对更新后的节点壳做 UI 收敛

#### 关键规则

* 节点 id 与 position 只服务编辑器壳
* type 创建后不可切换
* 窗口关系不在节点 config 内保存，而在顶层 `contextLinks`
* `coerceEditorNodeForUI(...)` 只保证 ReactFlow node 壳稳定，不承担后端 normalize

### 何时阅读

* 改新节点默认值
* 改默认 llm / 默认 output 建议
* 改节点壳创建规则
* 查某个 UI 默认值是不是正式后端默认值

---

## 7. runInputs 派生

### 文件

`workflowEditorRunInputs.ts`

### 角色

页面持有的 direct run 输入壳派生层。

### 负责

* 构建 input 节点列表
* 决定 `input_state` 的 key
* 处理 inputKey 改名后的值迁移

### 核心函数

* `buildInputNodes(...)`
* `getRunInputKey(...)`
* `buildNextRunInputs(...)`

### 当前正式规则

direct run `input_state` 的 key 来自 `inputKey`。
不等于 input 节点 `outputs[0].stateKey`。

这明确把：

* request input contract
* workflow published state contract

分开了。

### 改名迁移策略

当 `inputKey` 改名时，`buildNextRunInputs(...)` 当前策略是：

* 优先保留已有同名 key 的值
* 若只是同一 node 的 `inputKey` 改名，则按 `node.id` 迁移旧 key 的值
* 否则回退到 `defaultValue`
* 再否则回退为空字符串

### 边界

runInputs 派生层只服务页面持有的 direct run 输入壳，不表达 workflow 保存态 contract。

### 何时阅读

* 改 direct run 输入壳
* 改 inputKey 改名迁移
* 查为什么 `input_state` 的 key 不是 `stateKey`

---

## 8. selection 派生

### 文件

`workflowEditorSelection.ts`

### 角色

selection 派生 owner。

### 负责

* `buildSelectedNode(...)`
* `buildEdgeClickSelection(...)`
* `buildPaneClickSelection(...)`
* `buildNodeClickSelection(...)`
* `buildSelectionChangeResult(...)`

### 当前正式规则

当前系统只支持单选。
不是“暂时没做多选”。

### 关键行为

`buildSelectionChangeResult(...)` 会把 ReactFlow selection 事件收敛为：

* 没有选中节点 -> `null`
* 有多个节点 -> 只取第一个节点 id

这意味着 selection 派生层本身就是单选架构的一部分。

### 边界

这层自己也明确：

* 不处理 context edge 特例
* context/data edge 的差异由 controller 继续分流

也就是说 selection helper 负责基础单选收敛，controller 再加上业务分流。

### 何时阅读

* 改单选行为
* 查为什么多选会被收敛成单选
* 改 selection 结果装配
* 改 context edge 特例分流

---

## 9. viewState 派生

### 文件

`workflowEditorViewState.ts`

### 角色

前端显示态的关键派生层。

### 负责

* `latest step map`
* `executedNodeMap`
* `runtimeInputs / runtimeOutput / runtimePublishedState`
* `inboundBindings`
* `derivedTargetInputs`
* `graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds`
* `displayEdges = data edges + context edges`

### 9.1 executedNodeMap

`buildExecutedNodeMap(runResult)` 当前记录的是：

* 节点最后一次出现的 step index

它不表达：

* 执行次数
* 重试次数
* 循环次数

### 9.2 latestStepMap

`buildLatestStepMap(runResult)` 当前记录的是：

* 节点 -> 最近一步 step

因此如果未来出现同节点多次执行，这里默认取最后一步。

### 9.3 buildDisplayNodes(...)

这一层会给节点叠加：

* `isExecuted`
* `stepIndex`
* `runtimeInputs`
* `runtimeOutput`
* `runtimePublishedState`
* `derivedTargetInputs`
* `inboundBindings`
* `promptVariableHints`
* `graphWindowMode`
* `graphWindowSourceNodeId`
* `graphWindowTargetNodeIds`

必须明确两个边界：

第一，`runtime*` 字段来自最近一次 run 的展示态，不进入保存态。
第二，`graphWindow*` 来自 `contextLinks` 的 graph truth 摘要，不是运行态 window instance。

### 9.4 buildDisplayEdges(...)

这一层会把：

* data edges
* contextLinks

统一映射成 display edges。

其中：

* data edge 标记为 `relationType = 'data'`
* context edge 标记为 `relationType = 'context'`

context edge 会额外带：

* `contextLinkId`
* `mode`
* `label`
* 颜色 / dash 样式

因此页面上的“显示边”并不等于保存态 edge 集合，而是：

data edges + context edges 的前端统一显示壳。

### 9.5 组件如何消费这些派生字段

`WorkflowNode.tsx` 会直接消费：

* `derivedTargetInputs`
* `inboundBindings`
* `promptVariableHints`
* `runtimeInputs`
* `runtimeOutput`
* `runtimePublishedState`
* `graphWindowMode`
* `graphWindowSourceNodeId`
* `graphWindowTargetNodeIds`

`OutputNodeConfig.tsx` 会把 `derivedTargetInputs` 只读展示为：

* `Derived Inputs`

`NodeConfigPanel.tsx` 和 `PromptNodeConfig.tsx` 会把：

* `inboundBindings`
* `promptVariableHints`
* `graphWindow*`

作为 graph-derived 只读信息展示出来。

这进一步说明：

viewState 派生是显示态 owner，而不是保存态 owner。

### 何时阅读

* 改节点显示态叠加
* 改执行结果显示映射
* 改 graphWindow 摘要显示
* 改 context edge 的显示壳
* 查某个字段是不是只读显示态

---

## 10. prompt variable hints

### 文件

`promptVariableHints.ts`

### 角色

prompt variable hints owner。

### 核心函数

`extractPromptVariableHints(promptMode, inlinePrompt)`

### 负责

* 从 inline prompt 文本中提取 root-level 变量名 hint
* 为 editor UI 提供展示辅助

### 不负责

* 正式输入语义定义
* 保存态生成
* binding 创建
* prompt 变量与 inbound bindings 一致性校验

### 当前规则

* 只有 `promptMode === 'inline'` 时才提取
* template 模式下不提供 hint
* 使用正则从 `{...}` 提取
* 只保留 root-level 名称
* `a.b -> a`
* `a[0] -> a`
* 去重后返回字符串数组

### 它如何被消费

`WorkflowNode.tsx` 会把它显示为：

* `prompt variable hints (text-derived, not authoritative)`

`PromptNodeConfig.tsx` 会明确展示：

* 这些名字只来自 prompt 文本
* 系统真正认可的结构化输入来源仍然是 inbound bindings from edges
* template 模式下当前 UI 拿不到模板正文，因此不给 hint

边界：

prompt variable hints 只服务展示，不参与正式输入绑定与校验。

### 何时阅读

* 改 inline prompt 文本 hint 提取
* 改变量 hint 展示说明
* 查为什么 template 模式没有 hint
* 确认 hint 是否参与正式校验

---

## 11. controller / 组件消费层

### 文件

* `workflowEditorActions.ts`
* `useWorkflowGraphEditor.ts`
* `WorkflowNode.tsx`
* `WorkflowSelectionBar.tsx`
* `NodeConfigPanel.tsx`
* `PromptNodeConfig.tsx`
* `InputNodeConfig.tsx`
* `OutputNodeConfig.tsx`

### 角色

消费 graph 链各层已经生成的壳、规则、派生字段和选择结果。

### 负责

* 组件展示
* controller 分流
* 消费 graph-derived / runtime-derived 字段
* 消费 selection 派生结果

### 不负责

* ReactFlow shell type owner
* graph rule owner
* 保存前预检 owner
* prompt variable hints owner
* viewState owner

### 关键边界

* `WorkflowNode.tsx` 直接消费显示态字段
* `NodeConfigPanel.tsx / PromptNodeConfig.tsx / OutputNodeConfig.tsx` 消费 graph-derived 只读信息
* context edge 特例仍在 controller 分流，不在 selection helper 内

### 何时阅读

* 查某个 graph-derived 字段最终是如何展示的
* 查某个只读摘要为什么会出现在配置面板里
* 改 context/data edge 在页面层的分流逻辑

---

## 12. 当前限制与债务

### 12.1 cycle path 逻辑双份维护

`hasExecutionPath(...)` 当前同时存在于：

* `workflowEditorGraph.ts`
* `workflowEditorValidationRules.ts`

这意味着：

* graph 层即时预阻断一份
* validationRules 保存前预检再一份

若未来图语义变化，两处必须同步修改。

### 12.2 context outbound 规则当前较弱

当前前端只实现了：

* 同一 source 最多一个 `continue`

这只是最小规则，不代表完整 topology 目标已经全部收口。

### 12.3 graph truth 与 runtime window instance 必须严格区分

当前：

* `graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds` 只来自顶层 `contextLinks`
* 它们只表示当前图关系摘要
* 不是运行态 `window_id / window_parent_id`

这个边界在 `workflowEditorGraphTypes.ts`、`WorkflowNode.tsx`、`PromptNodeConfig.tsx` 里都必须持续维持。

### 12.4 ReactFlow shell 混合多类字段

当前 `node.data` 混合承载：

* `config`
* graph-derived
* runtime-derived

这虽然是当前显示壳设计，但也意味着维护时极易把 display/runtime 字段误当成保存态字段。

### 12.5 预检只返回首个错误

`validateWorkflowBeforeSave(...)` 当前只返回首个错误，不提供完整错误列表。

这是刻意的 UX 选择，但也意味着排查复杂图错误时信息粒度有限。

### 12.6 prompt variable hints 只是轻量 hint

当前 hint 提取：

* 不读取模板正文
* 不做正式 parser
* 不校验 bindings
* 不理解真实渲染语义

不能把它升级误用为正式变量解析器。

### 12.7 node factory 默认值只是 UI 建议

llm 默认值、默认 output/stateKey 命名、prompt 初始态，都只是前端 UI 建议值，不是后端正式默认值来源。

### 12.8 selection 仍是单选正式设计

当前 selection 派生和 controller 都以单选为正式前提。
若未来要支持多选，不只是改 UI，还要改 selection helper、controller、selection bar、node config 装配链。

---

## 最后总结

当前前端 graph 链已经形成比较清晰的 owner 分层：

* `workflowEditorGraphTypes.ts` 定义 ReactFlow shell，而不是 canonical contract
* `workflowEditorGraph.ts` 拥有即时图规则与局部 graph-sync
* `workflowEditorValidationRules.ts` 与 `workflowEditorValidators.ts` 拥有前端轻量预检
* `workflowEditorSemantic.ts` 拥有 semantic change 判断
* `workflowEditorConfig.ts / workflowEditorNodeFactory.ts` 拥有 UI 初始 config 与节点壳生成
* `workflowEditorRunInputs.ts / workflowEditorSelection.ts / workflowEditorViewState.ts` 拥有派生状态与显示态解释
* `promptVariableHints.ts` 只拥有文本 hint 提取，不拥有正式输入语义
* controller / 组件层负责消费这些壳、规则和派生结果

其中最关键的架构点有三个：

第一，ReactFlow shell 只是前端显示与编辑壳，不是正式业务 contract。
第二，前端 graph 规则和前端保存前预检都是 UX 层能力，后端 validator 才是正式裁决者。
第三，graph truth 必须始终和 runtime window instance 严格分层，不能把 `contextLinks` 图关系摘要误写成运行时窗口事实。

