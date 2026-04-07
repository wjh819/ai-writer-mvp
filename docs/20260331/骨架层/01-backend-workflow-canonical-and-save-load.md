
# 01-backend-workflow-canonical-and-save-load主链背景
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

1. workflow 的正式 canonical contract 是什么。
2. persisted YAML shape 的正式结构是什么。
3. converter / normalize / validator / loader 分别负责什么。
4. save 链与 load 链的正式顺序是什么。
5. 当前这条链已经明确的边界、限制与待收口点有哪些。

本篇只描述 backend workflow canonical / save-load 主链，不描述 direct run、frontend display、model resource 管理链的完整细节。

---

## 1. 主链总览

当前 backend workflow 主链已经围绕一份明确的 canonical workflow contract 收口，并形成了一条分层清晰的 save-load 链。

这条链的正式分工是：

* `workflow_contracts.py` 定义 canonical contract
* `workflow_converter.py` 做 persisted shape 与 canonical raw shape 的映射
* `workflow_normalizer.py` 作为唯一 canonical normalize 入口
* `workflow_validator.py` 作为正式合法性裁决层
* `workflow_loader.py` 作为路径规则、YAML IO 与 load 壳入口
* `workflows.py` 作为 route 编排层

本篇关注的重点不是“文件能不能读写”，而是这条链中哪些层定义 shape，哪些层做映射，哪些层做裁决，哪些层只负责路径、IO 与加载壳。

---

## 2. canonical workflow contract

### 2.1 canonical contract owner

文件路径：`contracts/workflow_contracts.py`
角色：workflow shared canonical contract owner。
负责：定义前端编辑态、后端 save/load 链与 engine 执行共同围绕的共享 canonical shape。
不负责：route 请求体、engine 内部临时对象、展示层 display model。
上下游：上游是 raw payload 或 persisted YAML shape 经过转换后的输入；下游被 save/load、validator、engine 与前端 mirror types 共同围绕。
何时阅读：当你需要确认 workflow 正式 canonical contract 本体时阅读。

当前顶层 canonical 对象是 `WorkflowEditorData`，包含三部分：

* `nodes`
* `edges`
* `contextLinks`

其中每个节点都是 `WorkflowNode`，字段包括：

* `id`
* `config`
* `position`

`position` 只表达编辑画布中的保存态坐标，不表达运行时语义，也不表达展示派生语义。

---

## 3. 节点与关系的正式 shape

### 3.1 `InputNodeConfig`

文件路径：`contracts/workflow_contracts.py`
角色：input 节点 canonical config 定义。
负责：表达 input 节点的正式 config shape。
不负责：input 节点 output 个数与合法性的最终裁决。
上下游：上游是 canonical contract；下游被 validator 与 engine 消费。
何时阅读：当你需要确认 input 节点正式字段与语义时阅读。

字段包括：

* `type="input"`
* `inputKey`
* `outputs`
* `defaultValue`
* `comment`

正式语义包括：

* `inputKey` 用于从 direct run 的 `input_state` 中读取输入值。
* `outputs` 定义该节点会向 workflow 工作态发布哪些 `stateKey`。
* input 节点的 output 个数与合法性，由 validator 再做正式裁决。

### 3.2 `PromptNodeConfig`

文件路径：`contracts/workflow_contracts.py`
角色：prompt 节点 canonical config 定义。
负责：表达 prompt 节点的正式 config shape。
不负责：窗口来源关系保存。
上下游：上游是 canonical contract；下游被 validator、engine 与前端 editor 链消费。
何时阅读：当你需要确认 prompt 节点正式字段与语义时阅读。

字段包括：

* `type="prompt"`
* `promptMode`
* `prompt`
* `inlinePrompt`
* `comment`
* `modelResourceId`
* `llm`
* `outputs`

正式语义包括：

* prompt 节点通过 data edges 获取结构化输入变量。
* prompt 正文可以来自 template 或 inline。
* 模型选择只允许通过 `modelResourceId` 表达。
* `llm` 只承载运行参数，不承载模型选择。
* prompt 节点不再保存窗口来源关系。
* prompt window 的继承 / 分支关系由顶层 `contextLinks` 表达。

因此，旧式的 `prompt.context`、`sourcePromptNodeId`、`forkMode` 一类字段，已经不属于当前正式 canonical contract。

### 3.3 `OutputNodeConfig`

文件路径：`contracts/workflow_contracts.py`
角色：output 节点 canonical config 定义。
负责：表达 output 节点的正式 config shape。
不负责：aggregate 迁移后的未来语义。
上下游：上游是 canonical contract；下游被 validator、engine 与保存态写回链消费。
何时阅读：当你需要确认 output 节点当前正式字段与语义时阅读。

字段包括：

* `type="output"`
* `outputs`
* `comment`

正式语义包括：

* output 节点通过 data edges 接收显式输入。
* output 节点当前仍使用 `output` 命名。
* 如果后续整体迁移到 `aggregate` 语义，这里会是 shared contract owner 需要联动调整的地方。

### 3.4 `WorkflowEdge`

文件路径：`contracts/workflow_contracts.py`
角色：data edge canonical shape 定义。
负责：表达结构化输入绑定关系。
不负责：prompt window 继承、branch、runtime window identity。
上下游：上游是 canonical contract；下游被 validator 与 engine 作为数据绑定关系消费。
何时阅读：当你需要确认 data edge 正式语义时阅读。

字段包括：

* `source`
* `sourceOutput`
* `target`
* `targetInput`

它只表达：source 节点哪个输出端口，绑定到 target 节点哪个输入变量。

### 3.5 `WorkflowContextLink`

文件路径：`contracts/workflow_contracts.py`
角色：context link canonical shape 定义。
负责：表达 prompt -> prompt 的窗口继承 / 分支关系。
不负责：结构化输入绑定。
上下游：上游是 canonical contract；下游被 validator 与 engine 作为图关系事实消费。
何时阅读：当你需要确认 context link 正式语义时阅读。

字段包括：

* `id`
* `source`
* `target`
* `mode`

其中 `mode` 当前只允许：

* `continue`
* `branch`

它只表达 prompt -> prompt 的窗口继承 / 分支关系，不参与结构化输入绑定。

### 3.6 `StrictBaseModel` 与 strictness

文件路径：`contracts/workflow_contracts.py`
角色：canonical contract strictness 边界。
负责：通过 `StrictBaseModel` 统一设置 `extra="forbid"`。
不负责：旧数据兼容修复。
上下游：上游是 canonical contract 定义；下游影响 normalize 后实例化时的 shape 边界。
何时阅读：当你需要确认 contract 层对额外字段的正式策略时阅读。

这说明当前 canonical contract 的基本策略是：

* 优先保证 shape 清晰
* 不接受额外字段偷偷混入 canonical model
* contract 层不做宽松兼容

因此，这一层的重点不是自动修复旧数据，而是作为 shared canonical shape 的正式锚点。

---

## 4. 两种关系的正式分层

当前 workflow 主链中，最重要的结构性决策之一，是把关系模型明确分成两类：

* `edges`
* `contextLinks`

这两类关系都参与整个 workflow 的执行关系图，但它们不是同一种语义。

### 4.1 `edges`：只表达数据绑定

文件路径：`contracts/workflow_contracts.py` / `api/workflow_validator.py` / `core/engine.py`
角色：数据绑定关系。
负责：表达 `sourceOutput -> targetInput` 的结构化输入绑定。
不负责：窗口关系。
上下游：上游是保存态 graph truth；下游被 validator 用于输入绑定规则检查，被 engine 用于 bound inputs 解析。
何时阅读：当你需要确认某个节点输入变量从哪里来时阅读。

它负责回答的问题是：

* 某个节点输出的哪个 output name，会作为哪个下游节点的哪个 `targetInput` 输入。
* 某个 prompt 或 output 节点的结构化输入变量从哪里来。

在 validator 中，模板变量绑定、input binding 唯一性、`targetInput` 冲突等规则，都是围绕 data edges 做的。
在 engine 中，bound inputs 的解析也只看 incoming data edges。

### 4.2 `contextLinks`：只表达 prompt window 继承 / 分支关系

文件路径：`contracts/workflow_contracts.py` / `api/workflow_validator.py` / `core/engine.py`
角色：窗口关系图事实。
负责：表达 prompt -> prompt 的窗口继承 / 分支关系。
不负责：结构化输入绑定。
上下游：上游是保存态 graph truth；下游被 validator 用于图规则检查，被 engine 解释为 runtime window 行为。
何时阅读：当你需要确认 prompt window 关系如何在图上表达时阅读。

它负责回答的问题是：

* 某个 prompt 是否沿另一个 prompt 的窗口继续。
* 某个 prompt 是否从另一个 prompt 的提交完成快照上 branch。

在 validator 中，`contextLinks` 会参与：

* `source/target` 是否存在
* `source/target` 是否都是 prompt
* `target` 是否存在多个 inbound context link
* `source/target` 的 `modelResourceId` 是否一致
* source outbound 规则
* data edges + contextLinks 的联合 DAG 检查

在 engine 中，`contextLinks` 会被解释成 runtime window 行为，但它本身仍然只是 graph truth，不是 runtime window instance。

### 4.3 `new_window` 不是保存态字段

文件路径：`contracts/workflow_contracts.py` / `core/engine.py`
角色：保存态与运行时语义边界。
负责：明确无 inbound context link 的 prompt 在语义上视为 `new_window`。
不负责：把 `new_window` 保存成持久化字段。
上下游：上游是保存态是否存在 inbound context link；下游由运行时与展示层解释为 `new_window`。
何时阅读：当你需要区分保存态 graph truth 与运行时解释结果时阅读。

没有 inbound context link 的 prompt，在语义上视为 `new_window`。
但 `new_window` 不作为保存态字段存在。
保存态里只需要知道“有没有 inbound context link”；至于这是否意味着 `new_window`，那是运行时与展示层的解释结果，而不是 workflow YAML 自身要显式保存的字段。

---

## 5. persisted YAML shape

### 5.1 正式文件位置

文件路径：`workflows/<canvas_id>/workflow.yaml`
角色：workflow 正式持久化事实源。
负责：作为当前 workflow 的正式 persisted YAML 文件。
不负责：展示壳信息。
上下游：上游是 save 链写回；下游是 load 链读取。
何时阅读：当你需要确认 workflow 的正式持久化文件位置时阅读。

当前 workflow 的正式持久化文件是：

`workflows/<canvas_id>/workflow.yaml` 

### 5.2 顶层结构

文件路径：`api/workflow_converter.py`
角色：persisted YAML 顶层结构定义入口。
负责：要求正式顶层结构显式包含 `nodes`、`edges`、`contextLinks`。
不负责：缺失字段自动补齐。
上下游：上游是 raw YAML；下游是 canonical raw shape 转换。
何时阅读：当你需要确认 persisted YAML 顶层必须长什么样时阅读。

当前正式顶层结构必须显式包含：

* `nodes`
* `edges`
* `contextLinks`

其中：

* `nodes` 必须是 dict
* `edges` 必须是 list
* `contextLinks` 必须是 list

如果顶层缺少这些字段，converter 会直接失败，而不是默认补齐。

### 5.3 `nodes` 的持久化 shape

文件路径：`api/workflow_converter.py`
角色：节点 persisted shape 与 canonical shape 的映射入口。
负责：处理 persisted `nodes` dict 与 canonical `nodes` list 之间的结构转换。
不负责：节点 config 的业务合法性裁决。
上下游：上游是 YAML 中的 `nodes` dict；下游是 canonical raw nodes list。
何时阅读：当你需要确认为什么 converter 必须存在时阅读。

当前 persisted YAML 中，`nodes` 是一个 dict，以 node id 为 key。
每个节点对象中：

* `position` 放在节点顶层
* 其余字段视为 node config 原始字段

因此，当前持久化节点结构不是 canonical list，而是：

* persisted shape：`nodes: { node_id: raw_node }`
* canonical shape：`nodes: [WorkflowNode, ...]`

这正是 converter 需要存在的原因之一。

### 5.4 `edges` 与 `contextLinks` 的持久化 shape

文件路径：`api/workflow_converter.py`
角色：关系 persisted shape 收口层。
负责：把 `edges` 与 `contextLinks` 作为分离的正式持久化列表结构处理。
不负责：从旧 prompt 内部字段推导窗口关系。
上下游：上游是 raw YAML；下游是 canonical raw relation structures。
何时阅读：当你需要确认数据绑定与窗口关系在持久化层已经分离时阅读。

`edges` 在持久化中是普通 list，每项包含：

* `source`
* `sourceOutput`
* `target`
* `targetInput`

`contextLinks` 在持久化中也是普通 list，每项包含：

* `id`
* `source`
* `target`
* `mode`

这种设计保证 data binding 与 window relation 在持久化层已经分开，不需要再从某个 prompt 节点内部历史字段中推导窗口关系。

### 5.5 与旧字段的边界

文件路径：`api/workflow_converter.py`
角色：persisted YAML 严格形态边界。
负责：只接受当前正式 layout。
不负责：旧 `prompt.context` 残留兼容、旧字段迁移、静默跳过非法结构。
上下游：上游是 raw YAML；下游是 normalize。
何时阅读：当你需要确认当前 persisted YAML shape 不是历史兼容容器时阅读。

当前 converter 已经明确：

* 不兼容旧 `prompt.context`
* 不做旧字段迁移
* 不静默跳过非法结构

因此，当前正式 persisted YAML shape 不是“能读历史各种形态”的兼容容器，而是只接受当前正式 layout 的严格持久化格式。

---

## 6. converter 的职责边界

文件路径：`api/workflow_converter.py`
角色：workflow persisted YAML shape 与 canonical raw shape 的转换层。
负责：在 persisted YAML shape 与 canonical raw shape 之间做 shape mapping。
不负责：默认值补齐、合法性判断、dependency check、旧字段迁移、静默跳过非法数据。
上下游：上游是 raw YAML 或合法 canonical model；下游是 normalize 或 YAML 写回。
何时阅读：当你需要确认 converter 只做结构映射、不做业务裁决时阅读。

### 6.1 YAML shape -> canonical raw shape

加载时，converter 的职责包括：

* 把 `nodes` dict 转成 canonical raw nodes list
* 从节点顶层拆出 `position`
* 保留 config 其余字段供 normalize 再处理
* 把 `edges` 和 `contextLinks` 收敛成后续 canonical raw 结构

这一步仍然不是 canonical model 实例化，也不是正式合法性裁决。

### 6.2 canonical model -> YAML shape

保存时，converter 的职责包括：

* `nodes` 写回 dict
* `edges` 写回 list
* `contextLinks` 写回 list
* `position` 写回节点顶层
* `config` 各字段按节点类型写回

也就是说，converter 负责把已经进入 canonical model 的 `WorkflowEditorData` 写回当前正式 YAML 结构。

### 6.3 它不是业务解释层

converter 的作用不是修数据，而是把一种正式 shape 映射成另一种正式 shape。
它并不理解 config 内部业务语义。以加载路径为例，它只会抽出 `position`，把其余字段原样交给 normalize。
诸如：

* `promptMode` 合不合法
* `outputs` 是否为空
* `modelResourceId` 是否存在
* `contextLink` 是否形成非法图关系

都不属于 converter 的职责。

---

## 7. normalize 的职责边界

文件路径：`api/workflow_normalizer.py`
角色：workflow canonical normalize 层，也是 backend 唯一 canonical normalize 入口。
负责：把等价原始输入收敛成统一 canonical shape，并实例化 `WorkflowEditorData`。
不负责：非法值纠正、旧数据兼容修复、graph 合法性判断、外部依赖检查、推导 `new_window` 等运行时窗口语义。
上下游：上游是 converter 产出的 canonical raw shape 或前端提交的等价 raw payload；下游是 validator。
何时阅读：当你需要确认 normalize 负责最小 shape 收敛而不是正式裁决时阅读。

### 7.1 输入与输出

输入是：

* converter 产出的 canonical raw shape
* 或前端提交的等价 raw payload

输出是：

* `WorkflowEditorData` canonical model

它会把 raw 节点、raw edges、raw contextLinks、position、outputs、llm、文本字段等做最小 shape 收敛，然后实例化 canonical model。

### 7.2 它负责的最小 shape 收敛

normalize 负责的工作包括：

* 顶层必须存在 `nodes / edges / contextLinks`
* node id、edge 字段、contextLink 字段必须是 string 并做 trim
* `position` 必须含 `x / y`
* `outputs` 必须是 list 且每项具备 `name / stateKey`
* prompt 节点的 `llm` 必须显式提供三项数值字段
* `comment`、inactive branch 的 prompt 文本等可归零字段做 `None -> ""`
* 最终实例化为 canonical model

它的目标是：把等价原始输入收敛成统一 canonical shape。

### 7.3 它不修复非法值

normalize 当前明确不会：

* 自动补 `defaultValue`
* 给缺失的 `llm` 填默认值
* 为缺失的 `outputs` 自动生成 output spec
* 替你修正非法 `promptMode`

它不是默认值工厂，也不是非法值修复器。当前系统希望把默认值逻辑收口在更清晰的上游，例如前端 UI 初始值或其他明确入口，而不是散落在 backend normalize 阶段。

### 7.4 与 Pydantic strictness 的边界

当前 normalize 通过 canonical model 实例化来完成 shape-level 合法值收口，但其数值字段仍可能受 Pydantic coercion 影响。
因此，它当前并不等于完全 strict typed validator。
例如 `LLMConfig` 的数值字段是否足够严格，仍然受当前 Pydantic 行为影响。

---

## 8. validator 的职责边界

文件路径：`api/workflow_validator.py`
角色：workflow canonical editor model 的正式 validator。
负责：作为 backend 正式合法性裁决层，提供 structure validation 与 dependency validation，并通过 `validate_workflow_editor_data()` 作为统一入口。
不负责：默认值补齐、旧字段兼容、HTTP 语义翻译、engine 运行。
上下游：上游是 normalize 后的 canonical model；下游是 save、strict load 与执行前裁决。
何时阅读：当你需要确认 workflow 合法性到底由哪一层正式裁决时阅读。

### 8.1 structure validation

structure validation 负责纯 workflow 结构与图关系规则，包括：

* workflow 至少要有一个 node
* node id 唯一
* 每个 node 至少声明一个 output
* output name / `stateKey` 必须满足 identifier 规则
* output name 在节点内唯一
* `stateKey` 不能与 node id 冲突，也不能在全图重复
* input 节点必须恰好一个 output，且必须声明 `inputKey` 与 `defaultValue`
* prompt 节点必须声明 `modelResourceId` 与 `llm`
* template mode / inline mode 的 prompt 字段互斥规则
* output 节点必须恰好一个 output
* edge 的 `source/target` 必须存在
* input 节点禁止 inbound bindings
* `targetInput` 不能有多个 inbound data edges
* contextLink id 唯一
* contextLink `source/target` 必须存在且都为 prompt
* 每个 prompt target 最多一个 inbound contextLink
* context `source / target` 的 `modelResourceId` 必须一致
* source outbound context rule
* data edges + contextLinks 的联合执行关系图必须无环

这里最关键的一点是：输入绑定规则与执行关系规则都归 validator 所有。

### 8.2 dependency validation

dependency validation 负责 workflow 之外的外部依赖检查，包括：

* `modelResourceId` 是否能在 active runtime registry 中找到
* prompt template 是否可加载
* template / inline prompt 中声明的变量，是否都能由 inbound data edges 绑定到

这意味着 validator 并不是纯内存函数。它会访问：

* `core/model_resource_registry.py`
* `utils/prompt_loader.py`

因此，这一层的边界应理解为：

* structure validation：纯结构与图规则
* dependency validation：外部资源可解析性与模板变量绑定规则

### 8.3 editor load 的有限宽松口子

当前 validator 还支持一个有限的结构宽松口子：

`validate_workflow_structure(..., enforce_source_outbound_rules=False)`

这允许 editor load 时，把极少数 context source outbound 规则违规降级为 warning，而不是直接加载失败。
但这个口子是有限的，并不意味着 editor load 是一个宽松兼容旧数据的通用修复器。

---

## 9. loader 的职责边界

文件路径：`api/workflow_loader.py`
角色：workflow 文件系统入口与加载壳层。
负责：canvas_id -> 文件路径规则 owner、workflow / metadata YAML IO、editor load 与 canonical load 的分流入口。
不负责：旧布局兼容迁移、旧字段补齐、默认值修复、HTTPException 翻译、正式业务合法性裁决之外的修数据。
上下游：上游是 canvas_id 与磁盘文件；下游是 converter / normalize / validator 链与 save/load 壳。
何时阅读：当你需要确认 workflow 的路径规则、YAML IO 与 load 壳入口时阅读。

### 9.1 路径规则 owner

loader 明确拥有当前正式路径规则：

* `workflows/<canvas_id>/workflow.yaml`
* `workflows/<canvas_id>/metadata.yaml`

并通过 `normalize_canvas_id()` 统一做 canvas_id 规范化与合法性校验。
调用方不应该自己到处手拼这些路径。

### 9.2 YAML IO 与事实源边界

loader 负责：

* 读取 workflow YAML
* 读取 metadata YAML
* workflow 与 metadata 的写盘壳
* 列出正式 canvas 摘要

同时它也明确区分：

* `workflow.yaml` 是正式 workflow 事实源
* `metadata.yaml` 只是展示壳，不是 workflow 存在性 owner

### 9.3 editor load 与 canonical load 分流

当前有两条不同的 load 路径。

#### editor load

文件路径：`api/workflow_loader.py`
角色：面向修图的有限宽松加载壳。
负责：只接受当前正式 YAML shape，不做旧字段迁移，不做 dependency validation，只做到 canonical shape 收敛 + structure validation，并允许极少数 outbound 规则违规降级为 warning。
不负责：作为后续严格执行链的统一合法入口。
上下游：上游是 raw YAML；下游是前端 editor。
何时阅读：当你需要确认 editor 为何能在有限问题下仍把图打开时阅读。

它的目标是：尽量让用户把图打开并在 UI 中修复少量结构问题。

#### canonical load

文件路径：`api/workflow_loader.py`
角色：面向正式后续链路的严格合法 workflow 入口。
负责：执行 `raw YAML -> converter -> normalize -> full validator`，且不保留 editor load 的 warning 降级口子。
不负责：宽松加载。
上下游：上游是 raw YAML；下游是需要完整合法 workflow 的严格链路。
何时阅读：当你需要确认严格合法 workflow 从哪里进入后续链路时阅读。

它的目标是：为后续需要完整合法 workflow 的链路提供严格入口。

---

## 10. save 链正式顺序

文件路径：`api/workflows.py` / `api/workflow_normalizer.py` / `api/workflow_validator.py` / `api/workflow_converter.py`
角色：workflow save 正式链。
负责：在 route 中按固定顺序完成 normalize、validator、shape 转换与写盘。
不负责：把原始 payload 直接写盘。
上下游：上游是当前前端提交的 workflow raw payload；下游是 `workflow.yaml` 与必要时最小 `metadata.yaml`。
何时阅读：当你需要确认 save 时到底先裁决还是先写盘时阅读。

### 10.1 route 接收当前画布 payload

save route 接收：

* `canvas_id`
* 当前前端提交的 workflow raw payload

这份 payload 表达的是当前画布编辑态，不是某个 workflow id 引用。

### 10.2 先 normalize

进入 route 后，首先会做：

* `normalize_canvas_id(canvas_id)`
* `normalize_workflow_editor_data(workflow)`

也就是说，save 不直接拿原始 payload 写盘，而是必须先进入 canonical normalize。

### 10.3 再 full validator

接着 save 链会调用：

* `validate_workflow_editor_data(normalized_workflow)`

这里走的是 full validator，包括 structure validation 与 dependency validation。
因此，save 不是 editor load 式的宽松入口，而是正式持久化写回前的完整裁决入口。

### 10.4 最后 converter 写回 YAML

当 workflow 已经成为合法 canonical model 后，save 链才会调用：

* `editor_schema_to_yaml(normalized_workflow)`
* `dump_canvas_workflow(normalized_canvas_id, yaml_data)`

也就是说，写盘前必须先完成：

* normalize
* validator
* canonical -> persisted shape 转换

### 10.5 `metadata.yaml` 的边界

如果目标 canvas 缺失 `metadata.yaml`，当前 save 链会补一个最小展示壳：

`{"label": normalized_canvas_id}`

这里必须保留的边界是：

* metadata 只是展示壳
* 它不是 workflow 保存态事实源
* save 链补 metadata 只是为了展示层最小可用，不是为了定义 workflow 合法性

---

## 11. editor load 与 canonical load 的区别

### 11.1 editor load

文件路径：`api/workflow_loader.py`
角色：面向 editor 的有限宽松加载壳。
负责：让前端编辑器拿到当前 workflow 图，并尽可能保留修图能力。
不负责：提供完整合法 workflow 给后续严格链路。
上下游：上游是 raw YAML；下游是前端 editor。
何时阅读：当你需要确认 editor load 为什么不做 full validator 时阅读。

它的特点是：

* 只走 structure validation
* 不做 dependency validation
* 允许极少数 outbound context rule 违规变成 warning

它适合 editor 场景，不适合作为后续严格执行链的统一合法入口。

### 11.2 canonical load

文件路径：`api/workflow_loader.py`
角色：面向正式后续链路的严格合法入口。
负责：返回完整合法的 `WorkflowEditorData`。
不负责：宽松修图加载。
上下游：上游是 raw YAML；下游是需要严格合法 workflow 的链路。
何时阅读：当你需要确认 full validator 之后的 workflow 从哪里来时阅读。

它的特点是：

* 走 full validator
* 不保留 warning 降级口子
* 只有完整合法 workflow 才能返回

### 11.3 本质区别

这两条链的区别不是“一个新，一个旧”，也不是“一个前端，一个后端”，而是：

* editor load 是面向修图的有限宽松加载壳
* canonical load 是面向正式后续链路的严格合法 workflow 入口

只要这个边界不混，后续 editor warning、strict run、save 规则就不会互相污染。

---

## 12. 事实源与边界速查

### 12.1 workflow 正式事实源

文件路径：`workflows/<canvas_id>/workflow.yaml`
角色：workflow 保存态事实源。
负责：承载当前 workflow 的正式 persisted YAML。
不负责：展示信息。
上下游：上游是 save 链；下游是 load 链、reference scan 等正式链路。
何时阅读：当你需要确认 workflow 是否正式存在时阅读。

### 12.2 metadata 展示壳

文件路径：`workflows/<canvas_id>/metadata.yaml`
角色：canvas 展示壳。
负责：提供例如 `label` 这类展示信息。
不负责：作为 workflow 存在性 owner 或 workflow 合法性 owner。
上下游：上游是 save 链在缺失时补最小展示壳；下游是列表展示。
何时阅读：当你需要区分 workflow 事实源与展示壳时阅读。

---

## 13. 当前限制与待收口点

### 13.1 output 节点命名仍是 `output`

文件路径：`contracts/workflow_contracts.py`
角色：当前 output canonical type 边界。
负责：维持当前 `output` 命名。
不负责：未来 `aggregate` 迁移。
上下游：上游是 shared canonical contract；下游联动 mirror types、converter 写回与相关显示逻辑。
何时阅读：当你需要评估 output -> aggregate 迁移影响面时阅读。

如果后续正式迁到 `aggregate` 语义，这将需要联动：

* shared canonical contract
* 前端 mirror types
* converter 的持久化写回
* 相关显示与兼容逻辑

### 13.2 editor load warning 只保留极少数口子

文件路径：`api/workflow_validator.py` / `api/workflow_loader.py`
角色：有限 warning 降级边界。
负责：只允许极少数 context source outbound 规则违规降级为 warning。
不负责：作为宽松兼容历史数据的总开关。
上下游：上游是 editor load；下游是 editor 修图能力。
何时阅读：当你需要判断能否继续新增 warning 口子时阅读。

未来若要新增 warning 口子，必须非常谨慎，否则会重新把 loader 变成隐式修复层。

### 13.3 normalize 数值 strictness 仍受 Pydantic 影响

文件路径：`api/workflow_normalizer.py`
角色：normalize strictness 当前限制。
负责：完成 shape-level 收敛。
不负责：成为完全严格的 typed numeric validator。
上下游：上游是 raw shape；下游是 canonical model。
何时阅读：当你需要评估 numeric strictness 是否还要继续收紧时阅读。

如果未来要进一步收紧 numeric strictness，这一层可能仍需要补 stronger strict 策略。

### 13.4 validator 与 engine 存在部分防御性重复

文件路径：`api/workflow_validator.py` / `core/engine.py`
角色：当前链路的重复防御边界。
负责：validator 做正式裁决，engine 仍保留部分防御性定义检查。
不负责：把重复彻底清零。
上下游：上游是完整校验链；下游是执行期防御。
何时阅读：当你需要评估 validator 与 engine 的职责重叠时阅读。

这在当前阶段有助于防止上游绕过校验后错误直接下沉到执行期，但长期看仍属于需要谨慎管理的重复。

### 13.5 loader 当前同时承担路径规则、IO 与 load 壳职责

文件路径：`api/workflow_loader.py`
角色：集中式 workflow load 壳层。
负责：同时承载路径规则、raw YAML IO、editor/canonical load 分流。
不负责：进一步细分后的未来形态。
上下游：上游是 canvas_id 与磁盘文件；下游是 load 链各层。
何时阅读：当你需要评估 loader 是否还会继续拆分时阅读。

在当前阶段，这种集中式壳层仍然是可理解且可维护的。

---

## 14. 关键分层原则

### 14.1 shape mapping 不等于 normalize

converter 负责的是 shape mapping。
normalize 负责的是 canonical shape 收敛与实例化。
二者不能混成同一个层。

### 14.2 normalize 不等于 validator

normalize 不是正式合法性裁决层。
validator 才是 backend 正式合法性裁决层。

### 14.3 loader 不等于修复器

loader 负责的是路径、IO 与 load 壳。
它不是旧字段兼容迁移器，也不是自动修数据层。

### 14.4 editor load 不等于 canonical load

editor load 服务于修图。
canonical load 服务于严格后续链路。
二者不能混用为同一个合法入口。

### 14.5 metadata 不等于 workflow 事实源

`metadata.yaml` 只是展示壳。
`workflow.yaml` 才是 workflow 保存态正式事实源。

---

## 结语

当前 backend workflow canonical / save-load 链已经形成了比较明确的正式分工。它最重要的价值，不只是“能 load/save workflow”，而是已经把几个最容易混淆的边界明确分开了：

* canonical contract 在哪里定义
* persisted YAML shape 在哪里收口
* shape mapping 由谁负责
* canonical normalize 由谁负责
* 正式合法性裁决由谁负责
* load 壳与路径规则由谁负责
* editor load 与 canonical load 为什么不能混用
* `metadata.yaml` 为什么不是 workflow 事实源

后续无论是继续收紧 strictness、推进 `output -> aggregate` 迁移，还是扩展 run / subgraph 相关能力，都应继续沿着这条已经分层完成的主链推进，而不是重新把这些职责混回同一个文件或入口里。

