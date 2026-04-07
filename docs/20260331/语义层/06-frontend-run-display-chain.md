
# 06-frontend-run-display-chain.md主链背景
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
---

## 本篇回答的问题

* 前端如何把 `RunResult` 变成可展示的 `DisplayRun`？
* `failure summary`、`primaryState`、`writeback diff` 是如何生成的？
* 展示组件链如何消费这些 display model？
* stale run 语义位于哪一层？
* 当前这条前端 run display 链还有哪些明确限制和技术债？

## 先给结论

当前前端 run display 链可以明确分成五层：

1. transport mirror 层
   `runTypes.ts`

2. display model 层
   `runDisplayModels.ts`

3. display mapper 层
   `runDisplayMappers.ts`

4. failure 辅助层
   `runFailure.ts`

5. 展示组件链
   `RunResultPanel.tsx`
   `RunResultSteps.tsx`
   `RunStateOverview.tsx`
   `RunStepCardBase.tsx`
   `RunResultStepCard.tsx`
   `RunStepWritebackSection.tsx`
   `RunValueBlock.tsx`
   `runFormatters.ts`

这条链的关键分层原则有三条。

第一，`RunResult` 只是 transport result。
它镜像后端 direct run contract，不是前端最终展示模型。

第二，`DisplayRun` 是前端解释后的展示模型。
`primaryState`、`failureInfo`、`writeback` 都是在 display mapper 层生成的，不直接存在于后端返回体。

第三，stale 不是后端 run contract 字段。
stale 是页面层注入的 display 语义，表示“这次 run 已不再代表当前 graph 事实，只保留参考价值”。

---

## 1. transport mirror 层

前端 direct run transport mirror 在：

* `runTypes.ts`

这一层只是镜像后端 `RunResult / StepProjection` contract，定义：

* `RunResult`
* `StepProjection`
* `RunStatus / RunScope / FailureStage`
* `PromptWindowMode`
* 各类 `Input / Prompt / Output` 的 success / failed step projection

它的正式边界很明确：

* 负责前端消费 direct run response 的基础类型约束
* 不定义后端 run contract
* 不承载 engine internal facts
* 不承载 persisted run detail 语义

这里要明确的几个正式口径是：

* success 时前端消费 `final_state`
* failed 时前端消费 `partial_state`
* `error_type / error_message / error_detail / failure_stage` 属于 run 级失败摘要
* step 级 `error_message / error_detail` 属于单步详情

因此 transport mirror 层只是“后端 direct run 结果的前端镜像”，不是展示层 owner。

---

## 2. display model 层

display model 层在：

* `runDisplayModels.ts`

这一层定义前端展示层真正消费的模型：

* `DisplayRun`
* `DisplayStep`
* `DisplayFailureInfo`
* `DisplayWriteback`
* `DisplayWritebackItem`

### 2.1 `DisplayRun`

`DisplayRun` 是整个前端 run 展示链的 display model 锚点。它包含：

* `source`
* `status`
* `runScope`
* `failureStage`
* `inputState`
* `primaryState`
* `primaryStateTitle`
* `steps`
* `failureInfo`
* `raw`
* `isStale`

这里最关键的是三件事：

第一，`primaryState` 已经由 mapper 选好。
不是组件自己再去判断该展示 `final_state` 还是 `partial_state`。

第二，`failureInfo` 已经是展示友好的失败摘要。
组件不需要自己再拼 run-level error 与 failed step error。

第三，`raw` 保留原始 `RunResult`。
它只服务调试透视，不应被视为正式展示语义层。

### 2.2 `DisplayStep`

`DisplayStep` 是单步展示模型，包含：

* `id`
* `index`
* `node / type / status`
* `startedAt / finishedAt / durationMs`
* prompt 相关字段
* `inputs / renderedPrompt / output`
* `errorMessage / errorDetail`
* window 相关字段
* `writeback`

这里要明确两个边界：

* `DisplayStep.id` 是 display-local id，不是稳定业务 id
* `windowId / windowParentId` 只用于当前 run 展示，不是 durable identity

### 2.3 `DisplayFailureInfo`

`DisplayFailureInfo` 包含：

* `typeLabel`
* `summary`
* `detail`
* `failedNode`

这说明前端展示层并不直接显示后端的原始 `error_type`，而是先转为展示 label，并收口为统一失败摘要结构。

### 2.4 `DisplayWriteback`

`DisplayWriteback` 包含：

* `applied`
* `items`

每个 `DisplayWritebackItem` 包含：

* `key`
* `beforeValue`
* `afterValue`

这意味着前端单步写回展示不是直接复用 `published_state` 原始对象，而是先做一层 display diff 解释。

---

## 3. display mapper 层

display mapper 层在：

* `runDisplayMappers.ts`

这是整条 run display 链最关键的 owner。它负责把后端 `RunResult` 解释为前端 `DisplayRun / DisplayStep`。

### 3.1 唯一主入口

主要入口是：

* `buildDisplayRunFromDirectRun(runResult, options?)`

正式口径是：

* 这是 direct run -> display run 的唯一主入口
* 原始 `RunResult` 会保留在 `raw`
* `isStale` 由页面层通过 `options` 注入

也就是说，前端所有 direct run 展示都应先经过这层，而不是组件自己解释 `RunResult`。

### 3.2 选择 `primaryState`

`primaryState` 的选择逻辑在：

* `buildPrimaryState(...)`

规则很简单而且是正式规则：

* success -> `final_state`
* failed -> `partial_state`

并同时配套一个展示标题：

* success -> `Final State`
* failed -> `Partial State Before Failure`

这就是为什么 `RunStateOverview` 不需要再自己判断运行成功或失败。

### 3.3 把 raw steps 解释成 `DisplayStep`

单步映射在：

* `buildDisplayStepsFromRawSteps(inputState, steps)`

它做了几件事：

1. 以 `inputState` 为初始基线创建前端 `workingState`
2. 顺序遍历 raw `steps`
3. 为每一步生成 `DisplayStep`
4. 若该步是 success 且带 `published_state`，则：

   * 先对比 `workingState` 生成 `writeback`
   * 再把 `published_state` 应用到 `workingState`

这意味着前端逐步 writeback 展示，不是后端直接给出的结构，而是前端基于 step 顺序重放得出的解释结果。

### 3.4 `promptDisplayText`

mapper 还会为 prompt step 生成：

* `promptDisplayText`

规则是：

* 有 `prompt_ref` 且非空 -> 展示 `prompt_ref`
* 否则若 `prompt_mode === inline` -> 展示 `(inline)`
* 否则不展示

这让组件不需要直接去理解 `prompt_ref` 与 `prompt_mode` 的组合语义。

---

## 4. writeback diff 是如何生成的

### 4.1 输入基线

writeback diff 的基线不是空对象，而是：

* `inputState`

也就是本次 run 的输入黑板态快照。

### 4.2 published_state 重放

每一步若满足：

* `status === success`
* 存在合法 `published_state`
* `published_state` 非空

则 mapper 会：

1. 读取当前 `workingState`
2. 按 key 构造 `beforeValue / afterValue`
3. 生成 `DisplayWritebackItem[]`
4. 组成 `DisplayWriteback`
5. 再把这些 key 写回 `workingState`

这意味着 `writeback diff` 的本质是：

> 前端按 step 顺序重放 `published_state` 所得到的浅层 key 级 before/after 对照。

### 4.3 diff 的粒度

当前 diff 粒度非常明确：

* 只按顶层 key 重放
* `beforeValue` 取写回前 workingState 中同 key 的值
* `afterValue` 取这一步 `published_state` 中的值

它不做：

* 深层对象 diff
* 结构化 patch 语义
* 非顺序执行修复

所以当前 writeback 展示是“弱解释 display diff”，不是正式状态演算 contract。

---

## 5. failure summary 是如何生成的

failure summary 主要由两层配合完成：

* `runFailure.ts`
* `buildDisplayFailureInfo(...)`

### 5.1 `runFailure.ts`

这一层提供两个基础辅助：

* `getErrorText(value)`
* `mapErrorTypeLabel(errorType)`

其中：

#### `getErrorText`

负责把任意错误值收敛为可展示文本：

* string -> 原样返回
* null / undefined -> `''`
* object -> `JSON.stringify`
* 其他 -> `String(value)`

这说明当前对象错误更偏调试展示，而不是精心设计的用户文案。

#### `mapErrorTypeLabel`

负责把后端 `error_type` 转成前端展示 label，例如：

* `missing_inputs` -> `Missing Inputs`
* `prompt_render_failed` -> `Prompt Render Failed`
* `structured_output_invalid` -> `Structured Output Invalid`
* `workflow_definition_error` -> `Workflow Definition Error`
* `node_execution_failed` -> `Node Execution Failed`

未知类型统一回退为：

* `Run Failed`

### 5.2 `buildDisplayFailureInfo(...)`

真正的失败摘要收口在：

* `buildDisplayFailureInfo(...)`

规则是：

1. 只有 `status === failed` 时才生成失败摘要
2. 优先使用 run-level：

   * `error_detail`
   * `error_message`
3. 若 run-level 信息不够，再回退到最后一个 failed step 的：

   * `errorDetail`
   * `errorMessage`

这里的关键口径是：

> run-level error 优先，step-level error 用于兜底补充。

这和后端 direct run 语义是对齐的：run 级错误摘要是主口径，step 级错误只负责单步详情。

### 5.3 `failedNode`

`failedNode` 的获取方式是：

* 从展示层 steps 中找最后一个 failed step

这意味着失败摘要里的“失败节点”是 display 层根据 step 列表推导出来的，而不是后端单独给出的专门字段。

---

## 6. primaryState 与整体 state 总览

`primaryState` 在 mapper 层已经选好，组件层的整体 state 展示则由：

* `RunStateOverview.tsx`

负责。

### 6.1 组件职责

它做两件事：

* 并排展示 `inputState` 与 `resultState`
* 生成一个轻量差异摘要

这里的差异摘要不是逐步 writeback，而是整体 run 前后对照。

### 6.2 差异摘要规则

`buildOverallStateDiff(...)` 当前只统计两类 key：

* `addedKeys`：运行前不存在、运行后存在
* `modifiedKeys`：运行前后都存在且值发生变化

它不统计：

* 删除的 key
* 深层结构 diff
* 更复杂的语义变化

值是否相等当前由 `areValuesEqual(...)` 轻量判断：

* 优先严格相等
* 否则退化为 `JSON.stringify` 后比较

因此 `RunStateOverview` 的角色是：

> 整体 state 总览与弱摘要，不是逐步 writeback 时间线。

---

## 7. 展示组件链

展示组件链的结构很清楚。

### 7.1 `RunResultPanel.tsx`

最上层总展示面板，负责：

* 展示 stale 提示
* 展示 run status / scope
* 展示 failure summary
* 展示整体 state 总览
* 展示步骤列表
* 展示 raw JSON

它只消费：

* `DisplayRun`

不直接解释 `RunResult`。

### 7.2 `RunResultSteps.tsx`

负责：

* 展示步骤列表标题
* 空态处理
* 逐个渲染 `RunResultStepCard`

它依赖上游已提供稳定的 display-local `step.id`。

### 7.3 `RunResultStepCard.tsx`

只是一个轻装配组件：

* 外层用 `RunStepCardBase`
* 中间插入 `RunStepWritebackSection`

它不自己解释 step 语义，也不自己计算 writeback。

### 7.4 `RunStepCardBase.tsx`

这是单步基础渲染组件，负责展示：

* step index / node / status / type
* prompt mode / prompt source
* started / finished / duration
* conversation window 信息
* inputs
* rendered prompt
* success output 或 failure detail

这里有两个展示层判断值得在文档里点明：

#### 聚合 output 节点特殊展示

若满足：

* `step.type === 'output'`
* success
* `step.inputs` 与 `step.output` JSON 等价

则该步被视为“聚合输出步骤”，隐藏单独的 Inputs block，避免重复展示。

#### prompt output 标题特殊展示

若是 prompt step 且 writeback 多于 1 项，则 output 标题改为：

* `Raw Output`

否则通常就是：

* `Output`

### 7.5 `RunStepWritebackSection.tsx`

负责展示单步 state writeback：

* 没有 writeback 或 items 为空 -> 不渲染
* 有 writeback -> 展示每个 key 的 Before / After

它不自己计算 diff，只消费 display model。

### 7.6 `RunValueBlock.tsx`

这是值展示基础组件：

* string -> 文本折叠/展开
* 非 string -> PrettyJson
* 同时展示 kind 和轻量 summary

它统一承担 run 展示里的值对象渲染壳。

### 7.7 `runFormatters.ts`

当前只提供：

* `formatDuration(durationMs)`

规则很轻量：

* 非法 number -> `-`
* 合法 number -> `${durationMs} ms`

---

## 8. stale run 语义

stale 不是 run display 链内部自己发明的字段，而是页面层注入进来的展示语义。

### 8.1 stale 不属于后端 run contract

后端 `RunResult` 没有 `isStale`。
`DisplayRun.isStale` 是前端 display model 字段。

### 8.2 stale 的注入点

注入点在页面层：

* `buildDisplayRunFromDirectRun(runResult, { isStale })`

也就是说，display mapper 不自己判断 stale，只接受页面传入的 stale 结果。

### 8.3 stale 的正式含义

当前 stale 的意思是：

* 这次 run 仍属于当前 workflow context
* 但它对应的是旧的 semantic version
* 因此它只保留参考价值，不再代表当前 graph 事实

`RunResultPanel.tsx` 会把 stale 结果展示成黄色提示条，而不是隐藏结果本身。

因此这条链里的 stale 语义边界是：

> stale 是页面级 display 语义，不是 direct run transport contract，也不是 display mapper 自主推断出的后端事实。

---

## 9. 当前限制与技术债

这条 run display 链至少有以下明确限制。

### 9.1 `DisplayStep.id` 只是 display-local id

当前 step id 由：

* `node + index`

拼出来，只在当前展示上下文内稳定，不是业务稳定标识。

### 9.2 writeback diff 是浅层 key 级重放

当前 diff 只做：

* 顶层 key
* before / after

不做：

* 深对象比较
* 结构化 patch
* 非线性执行兼容

### 9.3 diff 依赖 step 顺序真实可靠

`workingState` 重放默认假设：

* `steps` 已按真实执行顺序排列

如果将来出现更复杂的重试、循环或并发语义，这条链需要重新审视。

### 9.4 failure label 映射是手写镜像

`runFailure.ts` 中的 `error_type -> label` 映射是手写前端镜像，需要与后端同步维护。

### 9.5 对象错误展示偏调试

对象错误当前直接 `JSON.stringify`，更适合调试，不是精细用户文案。

### 9.6 `run-level finished_at` 尚未进入 direct run transport contract

当前 step 层可以展示：

* `started_at`
* `finished_at`
* `duration_ms`

但 run-level `finished_at` 还没有进入 direct run transport result，所以 display run 目前也没有对应字段。

### 9.7 `RunStateOverview` 只是整体摘要

它只统计：

* 新增字段
* 更新字段

不负责逐步写回时间线，也不承担正式 diff 语义。

### 9.8 `RunResultPanel` 里的 raw JSON 只是透视层

它服务调试和核对，不应被误读为正式用户语义层。

---

## 最后总结

当前前端 run display 链已经形成清晰分层：

* `runTypes.ts` 负责镜像 direct run transport contract
* `runDisplayModels.ts` 定义展示层真正消费的 `DisplayRun / DisplayStep`
* `runDisplayMappers.ts` 是 direct run -> display run 的核心 owner
* `runFailure.ts` 提供错误文本与错误类型标签映射
* 各展示组件只消费 display model，不再直接解释后端 transport result

其中最关键的架构点有两个。

第一，`primaryState`、`failureInfo`、`writeback` 都是前端 display interpretation，不是后端直接给出的展示字段。
第二，stale 是页面级语义，只在 display 层保留“参考价值”提示，不改变后端 run contract。
