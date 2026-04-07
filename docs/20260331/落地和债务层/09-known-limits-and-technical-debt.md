
# 09-known-limits-and-technical-debt.md限制/技术债
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


## 排除区

不要把当前技术债误读成以下含义：

* 不要再把当前问题理解为“旧链未删干净”或“系统仍然混乱”
* 不要把已经明确的边界重新混回去，例如 workflow 保存态与运行态、contextLinks 与 prompt config、modelResourceId 与 llm
* 不要把阶段性工程简化误读成正式长期规则，例如 `API_BASE`、默认 canvas、默认 provider、默认 base URL
* 不要把双份维护误读成稳定 owner 结构，它们当前能工作，但天然有漂移风险
* 不要把当前前端 display / runtime 壳字段误当成保存态字段
* 不要把 panel 层的展示性 mask 误读为安全边界
* 不要把当前 `output` 命名误读为语义已经完全收口；文档里已经明确它在逼近 `aggregate`，但迁移尚未完成 

## 本篇回答的问题

* 当前系统还存在哪些已知限制与技术债？
* 这些问题主要分布在哪些链路和层？
* 哪些是当前可接受的阶段性限制，哪些是后续必须收口的边界问题？ 

## 先看结论

到当前这个阶段，系统主链已经基本收口，旧的残留测试文件也已经全部删除。当前已知问题不再主要体现在“旧链未删干净”，而主要集中在以下几类：

* 主链内部仍有若干阶段性可接受但尚未收口的实现简化
* 个别链路仍存在弱类型、硬编码、双份规则维护、组件职责过重等问题
* 某些边界已经明确，但实现层仍保留过渡期痕迹
* 前后端虽然大方向已分层，但仍有少数地方需要继续压实 owner 边界

因此，当前技术债更准确的理解不是“系统仍然混乱”，而是：主链已经成型，但若要进一步稳定、扩展和降低维护成本，还需要把若干已知的阶段性实现收口成更严格的正式边界。

## 债务分布总览

当前技术债主要分布在四条链上：

* workflow save/load 持久化链
* model resource 管理与 resolve 链
* 前端 editor / graph / view derivation 链
* 前端 run display 与管理面板链

这些问题的共同特点是：

* 主链已经明确
* owner 边界大体清楚
* 但实现层仍存在过渡期简化、局部重复、弱约束或 UI 内聚过重的问题 

## 后端：workflow 保存态与加载链

### 1. metadata.yaml 仍只是展示壳

当前：

* `workflow.yaml` 才是 workflow 保存态事实源
* `metadata.yaml` 只承载 `label` 等展示壳信息

这本身不是错误，但它意味着：

* `metadata` 不能被误用为 workflow 存在性判断依据
* 任何未来想往 `metadata` 里继续堆业务语义的做法，都必须非常谨慎

这是一个已经明确、但仍需持续防止被重新污染的边界。

### 2. loader 仍同时承担多种职责

`api/workflow_loader.py` 当前同时承担：

* 路径规则
* raw YAML IO
* editor load 壳
* canonical load 壳

这条链已经比过去收口很多，但文件本身仍偏重。后续如果继续扩展 workflow 文件相关能力，仍可能进一步拆分成更细的 owner。

### 3. editor load 的 warning 口子仍是特殊分支

当前 editor load 保留了一个很克制的 warning 降级口：

* context source outbound 规则违规可作为 warning 打开并修图

这条规则是刻意保留的，但它也意味着：

* editor load 不是完全严格等价于 canonical load
* 需要持续约束 warning 范围，避免重新演变成“兼容修复入口” 

### 4. workflow 持久化 shape 仍带阶段性历史命名

例如：

* Output 节点当前保存态 `type` 仍叫 `output`
* 但实际行为已经越来越接近 `aggregate`

这说明命名层仍保留过渡期痕迹。它不会立刻破坏主链，但会增加后续维护时的语义摩擦。

## 后端：model resource 链

### 1. 配置写回非原子、无并发保护

`storage/model_resource_store.py` 当前写回策略是：

* 直接整表覆盖 `model_resources.json`

当前不具备：

* 临时文件 + rename 的原子写
* 并发锁
* 版本冲突控制

这意味着它当前适用于：

* 低并发
* 本地单用户
* 简化管理面板场景

如果未来进入更复杂使用场景，这会是必须收口的问题。

### 2. provider 支持集双份维护

当前 provider 支持集同时存在于：

* `shared/model_resource_config_shared.py`
* `contracts/model_resource_contracts.py`

这会带来直接维护风险：

* 扩展 provider 时，必须同步修改两处
* 否则 shared 规则层与 contract 层可能漂移

这是典型的“当前能工作，但后续扩展容易踩坑”的技术债。

### 3. shared normalize 仍是宽松文本收敛

当前 `normalize_model_resource_item(...)` 采取的是：

* `str(...).strip()` 风格的宽松文本收敛

它不是严格 typed validate。这样做在当前阶段有利于管理链简化，但长期来看会让“共享配置规则层”和“正式严格约束层”的边界不够锐利。

### 4. runtime registry 仍是弱类型 dict

`core/model_resource_registry.py` 当前输出的是：

* `dict[str, dict]`

而不是显式的强类型 runtime resource model。这个状态说明：

* resolve 链条已经成立
* 但 runtime 侧 contract 仍偏弱
* 扩展时更容易出现“字段名约定”而非“类型锚点” 

### 5. resolve_model_resource 失败仍抛 ValueError

当前以下情况都会抛 `ValueError`，再由上层解释：

* 空 id
* registry 为空
* id 不存在

这说明 model resource resolve 失败语义还没有完全并入统一的 AppError 分类体系。它现在可以工作，但错误边界仍不够统一。

### 6. 删除扫描强绑定当前 persistent YAML shape

`api/model_resource_reference_service.py` 当前删除保护扫描直接假定：

* workflow root 是 object
* `nodes` 是 dict
* prompt 节点上直接有 `type` 与 `modelResourceId`

这使得删除保护链对当前 persistent YAML shape 高度敏感。未来如果 workflow 保存态 shape 变化，这条链必须联动修改，否则删除保护会失真。

## 后端：错误语言与 detail contract

### 1. 大多数 AppError 仍主要以字符串为主

当前只有少数错误真正带结构化 detail，例如：

* `ModelResourceDeleteBlockedError`

而大量其他 AppError 仍然主要依赖：

* `str(exc)`

这意味着当前内部错误语言体系已经有框架，但还没有全面进入结构化 error schema 阶段。

### 2. HTTP translator 仍有“字符串错误优先”的阶段性特征

`api/error_translator.py` 当前整体策略仍是：

* 普通错误 -> `detail: string`
* 少数结构化错误 -> `detail: object`

这没有问题，但它说明：

* 对前端稳定机器可消费错误分支的支持还不够广泛
* 结构化 error 体系仍在局部成型，而非系统性铺开 

## 前端：API 与 transport / mirror

### 1. API_BASE 仍硬编码

`api.ts` 当前仍使用固定开发地址。这说明 request wrapper 还没有完成环境化收口。它对当前本地开发无碍，但长期不应保持。

### 2. 默认 canvas 仍是 article

当前前端仍保留：

* `DEFAULT_CANVAS_ID = 'article'`

这是一种明显的过渡期便利实现。它可以帮助当前页面快速启动，但不应被误当成正式多画布规则。

### 3. mirror types 仍全部手写同步

当前这些前端 mirror types 仍是手写：

* `workflowEditorTypes.ts`
* `runTypes.ts`
* `modelResourceTypes.ts`

这意味着每次后端 contract 变更时：

* 前端都需要人工同步
* 存在漂移风险

这类债务不是立即致命，但会持续增加维护成本。

## 前端：graph 规则与 view derivation

### 1. cycle path 逻辑双份维护

当前联合执行图遍历逻辑在两处都实现了一份：

* `workflowEditorGraph.ts`
* `workflowEditorValidationRules.ts`

这是当前最典型的一项前端结构债。它背后的现实原因是：

* graph 层要做即时预阻断
* validationRules 层要做保存前预检

但从长期看，这种双份维护非常容易漂移。未来图语义若变化，两处都必须同步改。

### 2. context outbound 规则只覆盖“最多一个 continue”

当前前端关于 context source outbound 的规则只有：

* 同一 source 最多一个 `continue`

这是一条最小规则，不是完整 topology 目标。它足以挡住最明显的错误，但仍明显弱于更完整的图语义控制。

### 3. graph truth 与 runtime window instance 需要持续严格分层

当前前端已经明确：

* `graphWindowMode / graphWindowSourceNodeId / graphWindowTargetNodeIds` 只是 graph truth 摘要
* `window_id / window_parent_id` 属于运行态 step / display 语义

这是正确的边界。但它也是一个必须反复守住的边界，因为 UI 很容易把两者混在一起。

### 4. ReactFlow shell 混合了承载多类字段

当前 `WorkflowNodeData` 同时承载：

* `config`
* graph-derived 字段
* runtime-derived 字段

这本身是当前显示壳设计，但它带来的风险是：

* 后续开发者可能误把 display / runtime 字段当成保存态字段
* `node.data` 的语义越来越重，心智成本上升 

### 5. selection 仍是正式单选设计

当前 selection helper、controller、selection bar 都按单选组织。这不是 bug，但意味着：

* 未来如要支持多选，不是局部小改，而是正式设计变化 

### 6. runInputs 派生仍只支持简单改名迁移

当前 `buildNextRunInputs(...)` 只理解：

* `inputKey` 同名保留
* 同一 node 的 `inputKey` 改名迁移
* 否则回退 `defaultValue / 空字符串`

它不理解更复杂的字段迁移历史。这对当前系统足够，但在更复杂的编辑演进下会有限制。

### 7. prompt variable hints 只是轻量 hint

当前 `promptVariableHints.ts`：

* 只支持 inline prompt
* 只提取 root-level hint
* 不读取 template 正文
* 不参与正式绑定或校验

这条边界已经很清楚，但也意味着它永远不能被误升格为正式 parser 或 validator。

## 前端：页面层与组件职责

### 1. WorkflowEditor.tsx 仍是重页面组件

虽然当前页面装配边界已经比过去清楚很多，但 `WorkflowEditor.tsx` 仍然持有大量页面级状态：

* active / requested canvas
* workflow context
* graph semantic / persisted version
* runContext
* warnings
* page error
* model resource panel 开关
* pending binding dialog 状态

这并不意味着设计错误，而是说明：

* 当前页面层仍然是主编排中心
* 如果后续继续长大，可能还要继续拆 page-level orchestration 

### 2. display mapper 仍由页面层直接接入

当前：

* `WorkflowEditor.tsx` 直接调用 `buildDisplayRunFromDirectRun(...)`

这意味着 run transport -> display run 的接线仍挂在页面层，而不是更独立的 display controller。它不影响正确性，但属于尚未完全收口的编排位置。

### 3. WorkflowModelResourcePanel.tsx 仍是复合组件

这是当前前端最明显的组件层技术债之一。它同时承担：

* UI
* 表单状态
* API 调用
* 错误文本提取
* delete blocked detail 解析
* 刷新编排

这说明 model resource 管理功能在前端还没有完全沉淀为：

* request helper
* operations
* controller
* pure presentational view 

### 4. status 刷新与 resources 刷新不是统一数据流

当前面板内：

* resource list 走上层 `onResourcesChanged`
* status 走组件内 `getModelResourcesStatus()`

这造成：

* create / update / delete 成功后会刷新 resource list
* 但不会自动联动刷新 config health

这是当前 panel 数据流未统一的直接表现。

### 5. provider / base URL 默认值硬编码

`WorkflowModelResourcePanel.tsx` 当前仍硬编码：

* 默认 provider
* 默认 base URL

这让 UI 当前更方便，但意味着默认值策略还未收口为统一配置。

### 6. mask 只是展示层，不是安全边界

虽然前端对 `api_key` 做了 mask 展示，但 transport item 仍包含原值。这意味着当前系统对 secret 的处理仍然建立在：

* 本地单用户管理
* 展示层不完整显示

这样的假设之上。

## 前端：run display 链

### 1. display step id 只是 display-local id

`runDisplayMappers.ts` 当前用：

* `node + index`

生成 `DisplayStep.id`。这只能保证当前展示上下文里的局部稳定，不是稳定业务标识。

### 2. writeback diff 只是浅层 key 级重放

当前 writeback diff：

* 以 `inputState` 为初始 `workingState`
* 顺序重放 `published_state`
* 只比较顶层 key 的 before / after

它不做：

* 深层对象 diff
* 结构化 patch 语义
* 非线性执行兼容 

### 3. step 顺序是 writeback 正确性的隐含前提

display mapper 当前默认：

* `steps` 已经按真实执行顺序排列

如果未来 run 语义变复杂，例如：

* 重试
* 循环
* 并行
* 同节点多次执行

那当前 writeback 重放与 latest step 选择逻辑都需要重新审视。

### 4. run-level finished_at 尚未进入 direct run transport

当前 step 层已经有：

* `started_at`
* `finished_at`
* `duration_ms`

但 run-level 还没有正式 `finished_at`。因此 display run 目前无法自然展示一次 run 的完整总时长闭环。

### 5. error label 映射仍是手写镜像

`runFailure.ts` 当前仍手写：

* `error_type -> display label`

这同样存在前后端漂移风险。

## 已经收口、但必须持续守住的边界

### 1. workflow 保存态与运行态分层

当前已经明确：

* `workflow.yaml` 只存保存态
* direct run 不写 persisted run 历史
* page run context 是前端页面壳，不是后端保存态 contract

这条边界已经建立，但需要后续文档、实现和重构都继续遵守。

### 2. prompt window 关系只存 top-level contextLinks

当前已经明确：

* 不再把窗口语义塞回 prompt config
* graph truth 和 runtime window instance 分层

这条边界是正确的，也是必须持续防止回潮的。

### 3. model resource 身份与运行参数分层

当前已经明确：

* `modelResourceId` 表达模型资源身份
* `llm` 只承载运行参数

这条边界也已经建立，但必须防止后续又把模型身份塞回 `llm` 或 prompt config 其他角落。

### 4. output 语义正在逼近 aggregate

当前系统虽然仍写作 `output`，但语义越来越接近 `aggregate`。这说明迁移方向已经很清楚，但命名与 canonical 收口还没完全完成。

## 如何理解当前阶段技术债

### 1. 阶段性可接受的工程简化

例如：

* `API_BASE` 硬编码
* 默认 canvas 是 `article`
* provider / base URL 默认值硬编码
* model resource 写回无并发保护

这些在当前阶段可接受，但不应长期停留。

### 2. 必须持续防漂移的双份规则或镜像

例如：

* provider 支持集双份维护
* 前端 mirror types 手写同步
* cycle path 双份维护
* error type label 手写映射

这些问题最危险的地方不在“今天不能跑”，而在“后续很容易悄悄漂移”。

### 3. 后续必须继续收口的结构问题

例如：

* `WorkflowModelResourcePanel.tsx` 是复合组件
* runtime registry 是弱类型 dict
* `resolve_model_resource` 失败仍抛 `ValueError`
* ReactFlow shell 混合承载多类字段

这些问题是后续要提升系统整洁度和可扩展性时必须继续处理的。

## 一句话总结

当前系统的技术债已经从“旧链路残留太多”转向了“主链内部若干阶段性实现还未完全收口”。更准确地说：后端主链已经建立，但部分实现仍偏弱类型、低并发、本地化；前端 editor / graph / run display 链已经清晰，但仍存在双份规则维护、硬编码、复合组件和显示壳过重的问题；一些关键边界已经被明确建立，但后续必须持续防止回潮或漂移。
