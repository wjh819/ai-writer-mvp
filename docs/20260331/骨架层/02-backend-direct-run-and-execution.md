
# 02-backend-direct-run-and-execution主链背景
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

1. direct run 链如何进入正式主链。
2. engine 的内部产物是什么。
3. canonical workflow contract、internal execution facts、direct run HTTP DTO 分别是什么。
4. success / failed 的正式语义是什么。
5. prompt window 在运行时如何实现。
6. 当前这条链已经明确的边界、限制与待收口点有哪些。

本篇只描述 backend direct run / execution 主链，不描述 workflow save-load 链与 frontend display 链的完整细节。

---

## 1. 主链总览

当前 direct run 主链已经形成了一条比较清晰的正式链路，并且明确分成三层：

* canonical workflow contract
* internal execution facts
* direct run HTTP DTO

route 入口只负责编排，正式顺序是：

`run-draft route -> normalize -> validator -> execute_draft_workflow -> WorkflowEngine.run -> WorkflowExecutionResult -> run_result_mapper -> RunResult`

这条链当前最重要的边界有五条：

1. engine 产出的是 execution facts，不是 HTTP response。
2. success 时 run 级主状态只看 `final_state`。
3. failed 时 run 级主状态只看 `partial_state`。
4. step 级错误详情只服务单步展示，不替代 run 级失败摘要。
5. prompt window 是 run 内内存态机制，不是持久化对象，也不是 durable identity。

---

## 2. 三层分离

### 2.1 canonical workflow contract

文件路径：`contracts/workflow_contracts.py`
角色：workflow 正式共享 contract owner。
负责：定义 workflow 保存态 / 共享态 shape。
不负责：运行结果、HTTP transport DTO。
上下游：上游是 normalize + validator 之前后的 workflow 主链；下游被 engine 直接消费。
何时阅读：当你需要确认 engine 运行前到底消费什么正式 workflow shape 时阅读。

这一层定义的是：

* `WorkflowEditorData`
* `WorkflowNode`
* `WorkflowEdge`
* `WorkflowContextLink`
* `InputNodeConfig`
* `PromptNodeConfig`
* `OutputNodeConfig`

这一层的关键口径包括：

* `edges` 只表达数据绑定。
* `contextLinks` 只表达 prompt window 继承 / 分支关系。
* `new_window` 不是保存态字段，而是运行时推导语义。
* `modelResourceId` 是 prompt 节点唯一合法的模型资源身份表达。
* `llm` 只承载运行参数，不承载模型身份。

因此 engine 消费的不是随意 shape，而是已经通过 normalize + validator 收敛过的 canonical workflow。

### 2.2 internal execution facts

文件路径：`core/execution_types.py`
角色：execution facts owner。
负责：定义 engine 与 service 之间交换的内部执行事实。
不负责：对外 API contract。
上下游：上游是 engine 执行结果；下游是 `workflow_run_service.py` 与 `run_result_mapper.py`。
何时阅读：当你需要确认 engine 实际产出的内部结果壳时阅读。

这一层定义的是：

* `ExecutionStep`
* `WorkflowExecutionResult`
* `WorkflowRunError`

这一层负责表达：

* 每一步节点到底执行了什么
* 哪一步成功 / 失败
* 写回了什么 published state
* prompt 节点实际使用了什么 window 运行时上下文
* run 级最终是 success 还是 failed
* failed 时的 `partial_state`、`error_type`、`error_message`、`error_detail`、`failure_stage`

这一层不是对外 API contract。

### 2.3 direct run HTTP DTO

文件路径：`api/run_http_schemas.py`
角色：direct run HTTP transport DTO owner。
负责：定义 direct run 对外 transport contract。
不负责：execution facts owner。
上下游：上游是 `run_result_mapper.py` 投影后的 transport shape；下游是前端消费的 response。
何时阅读：当你需要确认 direct run 对外到底暴露什么字段时阅读。

当前对外主响应包括：

* `RunDraftRequest`
* `RunResult`
* `RunStep`

其中 step shape 复用了 `contracts/step_projections.py` 定义的 projection model，但 transport owner 仍然是 `api/run_http_schemas.py`，不是 `execution_types`。

这一层做的是：

* execution facts 到对外字段名的投影
* 去掉当前不想公开暴露的 internal 字段
* 保持前端可稳定消费的 response shape

原文给出的直接例子包括：

* internal step 用 `node_id`，transport step 用 `node`
* internal prompt step 用 `bound_inputs`，transport prompt step 用 `inputs`
* internal prompt success step 用 `raw_output_text`，transport prompt success step 用 `output`

---

## 3. execution facts owner

### 3.1 `ExecutionStep`

文件路径：`core/execution_types.py`
角色：step 级 internal facts 定义层。
负责：定义 typed execution step。
不负责：对外 step transport shape。
上下游：上游是 engine 节点执行；下游是 service 与 mapper。
何时阅读：当你需要确认 step 级内部事实不是松散 dict 时阅读。

当前 step 分成 success / failed 两大类，并按节点类型再细分：

* `InputSuccessExecutionStep`
* `InputFailedExecutionStep`
* `PromptSuccessExecutionStep`
* `PromptFailedExecutionStep`
* `OutputSuccessExecutionStep`
* `OutputFailedExecutionStep`

每个 step 都继承 `BaseExecutionStep`，带有：

* `node_id`
* `node_type`
* `status`
* `primary_state_key`
* `started_at`
* `finished_at`
* `duration_ms`

其中 `primary_state_key` 当前只是 internal projection 锚点，带明显过渡性质，不应继续外溢成公开 contract。

### 3.2 `WorkflowExecutionResult`

文件路径：`core/execution_types.py`
角色：run 级统一结果壳。
负责：统一承载 success 与 failed 两种 run 结果。
不负责：直接作为 HTTP response。
上下游：上游是 service 收敛结果；下游是 `run_result_mapper.py`。
何时阅读：当你需要确认 run 级内部结果壳时阅读。

它包含：

* `status`
* `run_scope`
* `input_state`
* `final_state`
* `partial_state`
* `steps`
* `error_type`
* `error_message`
* `error_detail`
* `failure_stage`
* `finished_at`

这一层的核心设计点包括：

* success 与 failed 共用同一结果壳
* run 级失败摘要与 step 级失败详情分层
* `finished_at` 已经存在于 internal execution result
* 但当前 direct run HTTP API 还没有对外暴露它

### 3.3 `WorkflowRunError`

文件路径：`core/execution_types.py`
角色：engine -> service 的失败路径载体。
负责：在 engine 执行失败时携带 run 级失败结果。
不负责：作为 HTTP error 或用户侧 detail。
上下游：上游是 engine 失败路径；下游被 `workflow_run_service.py` 收敛为 `WorkflowExecutionResult`。
何时阅读：当你需要确认 engine 失败时为什么不是直接返回半成品 dict 时阅读。

这个异常显式携带：

* `partial_state`
* `steps`
* `error_message`
* `error_detail`
* `error_type`
* `failure_stage`

当前失败链路是：

`engine 抛 WorkflowRunError -> workflow_run_service 收敛为 WorkflowExecutionResult -> run_result_mapper 投影为 RunResult` 

### 3.4 step 级事实与 run 级失败摘要的边界

文件路径：`core/execution_types.py` / `api/run_http_schemas.py`
角色：step 级详情与 run 级摘要的边界定义。
负责：把单步事实与整次 run 失败摘要分层。
不负责：让单步错误替代 run 级摘要，或让 run 级摘要替代单步详情。
上下游：上游是 execution facts；下游是前端 summary panel 与 step detail 展示。
何时阅读：当你需要确认前端该看 top-level 还是 step-level 错误时阅读。

原文明确区分：

step 级事实解决的是：

* 某一步节点输入是什么
* 某一步 prompt 渲染结果是什么
* 某一步 output 聚合了什么
* 某一步到底报了什么错

run 级失败摘要解决的是：

* 整次 run 为什么失败
* 失败属于 `request / definition / execution` 哪一层
* 前端上方 summary panel 应该显示什么
* failed 主状态应该展示哪份 state

所以：

* step 级错误信息不替代 run 级失败摘要
* run 级失败摘要也不替代单步详情

---

## 4. engine 的职责

文件路径：`core/engine.py`
角色：workflow 执行引擎。
负责：消费合法 canonical workflow，执行节点，维护 run 内状态，产出 execution facts。
不负责：workflow contract 定义、save/load 规则、HTTP response、persisted run 记录、validator 裁决。
上下游：上游是 normalize + validator 后的 canonical workflow；下游是 `ExecutionStep`、`WorkflowExecutionResult`、`WorkflowRunError`。
何时阅读：当你需要确认 direct run 的运行核心到底做什么时阅读。

### 4.1 消费合法 canonical workflow

`WorkflowEngine.__init__` 明确要求输入是 `WorkflowEditorData`。
这说明 engine 不拥有另一套 workflow contract，而是直接消费 canonical workflow。

### 4.2 构建执行关系图

engine 初始化时会构建：

* `graph`
* `in_degree`
* `incoming_edges_by_target`
* `incoming_context_link_by_target`

这里有一条关键规则：

* data edges 既参与执行顺序，也参与结构化输入绑定
* contextLinks 只参与执行顺序，不参与结构化输入绑定

这条分层直接决定后面的 `bound_inputs` 和 prompt window 是两条不同机制。

### 4.3 解析 `bound_inputs`

engine 通过 `_resolve_bound_inputs(node_id, state, strict=...)` 从 incoming data edges 解析结构化输入。

解析规则是：

1. 找到 target 节点的所有 incoming data edges。
2. 从 source 节点 outputs 声明里找到 `sourceOutput -> stateKey`。
3. 再从当前 state 中读取这个 `stateKey` 的值。
4. 填到 target 侧的 `targetInput`。

因此 prompt / output 节点看到的 `bound_inputs` 来自 data edges，不来自 contextLinks，也不来自 prompt 文本变量 hint。

### 4.4 执行 input / prompt / output 节点

engine 的 `run_node` 会根据 config 类型分发到：

* `run_input_node`
* `run_prompt_node`
* `run_output_node`

input 节点从 `state[config.inputKey]` 或 `config.defaultValue` 读取值，然后按 `outputs[0]` 发布到 workflow state。
prompt 节点执行顺序包括：解析 `bound_inputs`、解析 prompt 正文、解析 prompt window runtime、resolve `modelResourceId`、构建 LLM client、组装 messages、调 LLM、把结果解释成命名输出、commit prompt window、产出 `PromptSuccessExecutionStep`。
output 节点会把所有 `bound_inputs` 聚合起来；若只有一个 inbound binding，直接取该值；若有多个 inbound bindings，聚合成对象；然后按 `outputs[0]` 发布到 workflow state。

### 4.5 维护 run 内 prompt window 状态

engine 内部维护三份 prompt window 运行时状态：

* `prompt_window_id_by_node`
* `window_histories`
* `prompt_committed_history_by_node`

这三者共同实现了 `new_window / continue / branch`。

### 4.6 产出 success / failed execution steps

每个节点执行成功时，engine 产出 typed success step：

* `InputSuccessExecutionStep`
* `PromptSuccessExecutionStep`
* `OutputSuccessExecutionStep`

执行失败时，会构造 typed failed step：`_build_failed_step(...)`，然后把当前 `current_state`、已有 `steps` 和失败摘要打包进 `WorkflowRunError` 抛给 service。

---

## 5. direct run 链

### 5.1 route 入口

文件路径：`api/workflows.py`
角色：run-draft route 入口。
负责：承接 `POST /workflows/{canvas_id}/run-draft` 请求并编排 direct run 正式链。
不负责：执行逻辑 owner、execution facts owner。
上下游：上游是 HTTP 请求；下游是 normalize、validator、service、engine、mapper。
何时阅读：当你需要确认 direct run 到底从哪里进入后端时阅读。

它的正式口径是：

* 跑的是请求体里的当前画布内容
* 不读磁盘旧 workflow
* 不写 persisted run
* 不带 session 语义

这意味着当前 direct run 是纯 draft run，不是“按 canvas id 去找旧保存文件运行”。

### 5.2 normalize

文件路径：`api/workflow_normalizer.py`
角色：canonical normalize 主链入口。
负责：shape-level 收敛、字段级最小 trim / object/list 规范化、通过 canonical model 实例化收紧 shape。
不负责：业务默认值补齐、图合法性裁决、外部依赖检查。
上下游：上游是 `req.workflow`；下游是 validator。
何时阅读：当你需要确认 direct run 进入 engine 前先做了什么收敛时阅读。

route 先执行：

`normalize_workflow_editor_data(req.workflow)` 

### 5.3 validator

文件路径：`api/workflow_validator.py`
角色：direct run 前的正式合法性裁决层。
负责：结构裁决与依赖裁决。
不负责：让 engine 顺手兜底完成正式校验。
上下游：上游是 normalized workflow；下游是 engine。
何时阅读：当你需要确认 direct run 不是先跑 engine 再报错时阅读。

route 接着调用：

`validate_workflow_editor_data(normalized_workflow)`

validator 分两段：

* `validate_workflow_structure(...)`
* `validate_workflow_dependencies(...)`

前者负责：

* `nodes / edges / contextLinks` 结构
* output / `stateKey` / edge binding 规则
* context link 规则
* data edges + contextLinks 的 DAG 检查

后者负责：

* `modelResourceId` 是否存在
* prompt 模板是否能加载
* 模板变量和 inbound bindings 是否对齐

因此，direct run 不是 engine 顺手兜底验证，而是先走正式 validator，再进 engine。

### 5.4 service 层

文件路径：`api/workflow_run_service.py`
角色：execution 层与 API projection 层之间的正式壳。
负责：调用 engine，并把 success / failed 统一包装成 `WorkflowExecutionResult`。
不负责：HTTP schema owner。
上下游：上游是 route；下游是 engine 与 mapper。
何时阅读：当你需要确认 run-level status / error_* / failure_stage / finished_at 由谁统一收口时阅读。

route 之后进入：

`execute_draft_workflow(...)`

service 的职责是：

* 调用 engine
* 成功 / 失败统一包装成 `WorkflowExecutionResult`
* 统一 run-level `status / error_* / failure_stage / finished_at`

### 5.5 engine

文件路径：`core/engine.py`
角色：运行时执行层。
负责：真正执行 workflow 节点。
不负责：直接返回 HTTP response。
上下游：上游是 service；下游是 `current_state + steps` 或异常。
何时阅读：当你需要确认 service 之后实际执行发生在哪里时阅读。

service 内部创建：

`WorkflowEngine(workflow_data=workflow, prompt_overrides=...)`

然后调用：

`engine.run(input_state)`

`engine.run(...)` 返回：

* `current_state`
* `steps`

或者抛出：

* `WorkflowRunError`
* `WorkflowDefinitionError`
* 其他异常

### 5.6 mapper

文件路径：`api/run_outcome.py` / `api/run_result_mapper.py`
角色：internal execution facts -> transport DTO 投影层。
负责：把 `WorkflowExecutionResult` 投影成 `RunResult`。
不负责：execution facts owner 定义。
上下游：上游是 service；下游是最终 response。
何时阅读：当你需要确认对外字段名是在哪里从 internal facts 映射出来时阅读。

service 返回 `WorkflowExecutionResult` 后，route 最后调用：

`build_run_outcome_response(execution)`

而 `api/run_outcome.py` 只是薄壳，再调：

`build_run_result_from_execution(execution)`

这一步在 `api/run_result_mapper.py` 完成。

### 5.7 最终 response

文件路径：`api/workflows.py`
角色：direct run 最终 response 返回点。
负责：返回 `RunResult.model_dump()`。
不负责：定义 `RunResult`。
上下游：上游是 mapper；下游是前端 HTTP 消费方。
何时阅读：当你需要确认 route 最后对外到底返回什么时阅读。

整条链可以简写成：

`POST /workflows/{canvas_id}/run-draft -> normalize -> validate -> execute_draft_workflow -> WorkflowEngine.run -> WorkflowExecutionResult -> build_run_result_from_execution -> RunResult` 

---

## 6. success / failed 正式语义

### 6.1 success 只看 `final_state`

文件路径：`api/workflow_run_service.py`
角色：success run-level 主状态定义入口。
负责：在 success 时构造 `final_state`。
不负责：让 failed 也使用 `final_state` 作为主状态。
上下游：上游是 engine 成功结果；下游是 `WorkflowExecutionResult`。
何时阅读：当你需要确认 success 的主状态应该看哪份 state 时阅读。

成功结果通过 `build_success_execution_result(...)` 构造：

* `status="success"`
* `final_state=dict(final_state or {})`
* `partial_state=None`

因此 success 的主状态语义非常明确：success 时只看 `final_state`。

### 6.2 failed 只看 `partial_state`

文件路径：`api/workflow_run_service.py`
角色：failed run-level 主状态定义入口。
负责：在 failed 时构造 `partial_state`。
不负责：让 failed 继续看 `final_state`。
上下游：上游是 engine 失败路径；下游是 `WorkflowExecutionResult`。
何时阅读：当你需要确认 failed 的主状态到底是哪份 state 时阅读。

失败结果通过 `build_failed_execution_result(...)` 构造：

* `status="failed"`
* `final_state={}`
* `partial_state=dict(partial_state) if partial_state is not None else None`

这说明 failed 时 run 级主状态不是 `final_state`，而是失败前最后一次成功写回后的完整 working state 快照。也就是：failed 时只看 `partial_state`。

### 6.3 run 级失败摘要看 top-level `error_* / failure_stage`

文件路径：`api/workflow_run_service.py`
角色：run-level 失败摘要收口层。
负责：统一 run-level `error_type / error_message / error_detail / failure_stage`。
不负责：把 step-level error 升级成 run-level 摘要 owner。
上下游：上游是不同异常类型；下游是 `WorkflowExecutionResult` 与 `RunResult`。
何时阅读：当你需要确认 summary panel 应该看哪些字段时阅读。

当前 top-level run summary 字段是：

* `error_type`
* `error_message`
* `error_detail`
* `failure_stage`

其中 `failure_stage` 只允许：

* `request`
* `definition`
* `execution`

当前 direct run 主链里，service 会这样收敛：

* `WorkflowRunError` -> 多数是 `failure_stage="execution"`
* `WorkflowDefinitionError` -> `failure_stage="definition"`
* `AppError` -> 当前也折叠成 `definition`
* 未分类 `Exception` -> 当前统一折叠为 `definition + unexpected_error`

### 6.4 step 级错误只用于单步详情

文件路径：`api/run_http_schemas.py`
角色：run-level 摘要与 step-level error 的对外边界。
负责：明确 run 级 `error_* / failure_stage` 是失败摘要 owner，step 级错误信息只用于单步展示。
不负责：让前端 summary panel 直接依赖 step-level error。
上下游：上游是 `RunResult` schema；下游是前端 summary panel 与 step card。
何时阅读：当你需要确认前端顶层摘要和步骤详情该分别看什么时阅读。

因此：

* 做上方 summary panel，先看 run-level 字段
* 做某一步卡片详情，才看 step-level `error_message / error_detail`

---

## 7. prompt window 运行时语义

文件路径：`core/engine.py`
角色：prompt window 运行时机制 owner。
负责：在单次 run 内解释 `new_window / continue / branch` 并维护窗口运行时状态。
不负责：把 prompt window 写成持久化对象或 durable identity。
上下游：上游是 `contextLinks` 图关系；下游是 prompt 执行时的 runtime window 行为。
何时阅读：当你需要确认 prompt window 在运行期到底如何实现时阅读。

### 7.1 无 inbound context link = `new_window`

`_resolve_prompt_window_runtime(...)` 的第一种分支是：

* 如果当前 prompt 节点没有 inbound context link
* 则视为 `new_window`

返回：

* `window_mode = "new_window"`
* `window_id = f"window::{node.id}"`
* `window_parent_id = None`
* `base_messages = []`

这说明 `new_window` 不是保存态字段，而是运行时推导结果。

### 7.2 `continue`：复用来源窗口并沿当前历史继续

如果 inbound context link 是 `continue`，engine 会：

* 找到 source prompt 已解析出来的 `source_window_id`
* 读取 `window_histories[source_window_id]`
* 把它作为当前 prompt 的 `base_messages`
* 当前 prompt 继续使用同一个 `window_id`

因此 `continue` 的正式含义是：复用来源窗口 identity，并沿当前窗口历史继续向后追加。
这不是复制一份历史，而是继续在同一 run-local window 上推进。

### 7.3 `branch`：从 source prompt 提交完成时的固定快照分叉

如果 inbound context link 是 `branch`，engine 不会直接从 `window_histories[source_window_id]` 继续，而是读取：

`prompt_committed_history_by_node[source_node_id]`

这是一份 source prompt 自己提交完成时的固定历史快照。

然后 branch 会：

* 给当前节点创建新的 `window_id = window::<current_node_id>`
* `window_parent_id = source_window_id`
* `base_messages = source_snapshot`

因此 branch 的正式语义不是从当前来源窗口活历史分叉，而是从 source prompt 提交完成时的固定快照分叉。
原文明确指出，这正是代码里专门维护 `prompt_committed_history_by_node` 的原因：避免后续 continue 污染 branch 的基线。

### 7.4 `window_id` 是 run-local synthetic id

当前 `_build_window_id(node_id)` 直接生成：

`window::<node_id>`

再加上 engine 文档说明，当前 `window_id` 的正式口径是：

* 只在单次 run 内有意义
* 是 synthetic id
* 不是 durable identity
* 不进入持久化事实源

因此它只能拿来做单次 run 的 execution / display 关联，不能拿来做长期引用。

### 7.5 prompt 成功后才 commit window

`_commit_prompt_window(...)` 只有在 prompt 节点成功之后才会执行。它会把：

* `HumanMessage(rendered_prompt)`
* `AIMessage(output_text)`

追加到历史中，然后更新：

* `window_histories[window_id]`
* `prompt_window_id_by_node[node_id]`
* `prompt_committed_history_by_node[node_id]`

这说明：

* failed prompt 不会推进窗口历史
* failed prompt 不会污染后续 branch 的基线
* 只有成功 prompt 才算一次已提交窗口状态

---

## 8. multi-output prompt 规则

文件路径：`core/engine.py`
角色：prompt 输出解析规则 owner。
负责：定义单输出 prompt 与多输出 prompt 的运行时输出规则。
不负责：把 output name 与 stateKey 混成同一层。
上下游：上游是 LLM 输出文本；下游是 named outputs 与 published state。
何时阅读：当你需要确认 prompt 多输出到底要满足什么格式时阅读。

### 8.1 单输出：直接输出文本

如果 `config.outputs` 长度是 1，engine 会直接把 LLM 输出文本作为该 output 的值：

`named_outputs = { output_specs[0].name: output_text }`

因此单输出 prompt 的正式规则是：单输出 prompt 直接把模型返回文本视为该 output 的值。

### 8.2 多输出：必须返回 JSON object

如果 outputs 数量大于 1，engine 会：

* 先 `json.loads(output_text)`
* 要求结果必须是 `dict`
* 如果 parse 失败，抛 `StructuredOutputError`
* 如果 parse 后不是 object，也抛 `StructuredOutputError`

所以多输出 prompt 的正式规则是：多输出 prompt 必须返回合法 JSON object。

### 8.3 key 集合必须与 `outputs.name` 完全一致

engine 之后还会取：

* `expected_names = {spec.name for spec in output_specs}`
* `actual_names = set(parsed.keys())`

要求：

`actual_names == expected_names`

不允许：

* 少 key
* 多 key
* key 名不一致

所以多输出 prompt 的完整正式规则是：当 outputs 数量大于 1 时，模型输出必须是 JSON object，且 key 集合必须与 `outputs.name` 完全一致。

### 8.4 published state 仍由 `outputs[].stateKey` 决定

即便 prompt 产出的是命名输出 object，最终写回 workflow state 时，仍然要经过：

`_build_published_state(node, named_outputs)`

也就是：

* output 名是节点内部 contract
* `stateKey` 是 workflow blackboard 写回 key

这两层不能混。

---

## 9. run-level `finished_at`

### 9.1 internal execution result 已保留 `finished_at`

文件路径：`core/execution_types.py`
角色：run-level `finished_at` 的 internal owner。
负责：在 `WorkflowExecutionResult` 中保留 `finished_at: str`。
不负责：自动向 HTTP API 暴露。
上下游：上游是 service 统一写入；下游是 mapper 可能的对外投影。
何时阅读：当你需要确认 run-level 结束时间当前是否已存在于内部结果里时阅读。

这里的 `finished_at` 是 run-level 的 `finished_at`，不是 step-level `finished_at`。

### 9.2 当前由 service 统一生成

文件路径：`api/workflow_run_service.py`
角色：run-level `finished_at` 生成层。
负责：在 success、`WorkflowRunError`、`WorkflowDefinitionError`、`AppError`、未分类 `Exception` 这些路径里统一调用 `utc_now_iso()` 并写入 `WorkflowExecutionResult.finished_at`。
不负责：让 engine 直接返回 run-level `finished_at`。
上下游：上游是各条 run 结束路径；下游是 `WorkflowExecutionResult`。
何时阅读：当你需要确认 `finished_at` 是谁生成的时阅读。

也就是说，当前 run-level `finished_at` 是 service 统一生成的，而不是 engine 直接返回的。

### 9.3 当前 direct run HTTP API 未对外暴露

文件路径：`api/run_http_schemas.py` / `api/run_result_mapper.py`
角色：`finished_at` 对外暴露边界。
负责：当前保持 `RunResult` 不包含 run-level `finished_at`，且 mapper 也没有把它投影出去。
不负责：向外暴露 run-level `finished_at`。
上下游：上游是 `WorkflowExecutionResult.finished_at`；下游是 direct run HTTP API。
何时阅读：当你需要确认前端为什么在当前 API 里拿不到 run-level `finished_at` 时阅读。

因此当前的正式状态是：internal execution result 中保留了 run-level `finished_at`，但 direct run HTTP API 还没有对外暴露它。

### 9.4 若后续支持 run history，应从这里扩展

原文明确指出，如果未来要做：

* persisted run history
* run list
* run detail page
* run duration summary

最自然的扩展点就是：

* 保持 engine / service / execution result 这条内部链不变
* 扩展 mapper 和 HTTP schema，把 `finished_at` 正式向外暴露

---

## 10. 当前限制与债务

### 10.1 `primary_state_key` 是过渡性内部 projection 锚点

文件路径：`core/execution_types.py`
角色：过渡性 internal projection 字段。
负责：当前作为 internal projection 锚点存在。
不负责：升级成新的对外语义中心。
上下游：上游是 step internal facts；下游是 internal projection 使用点。
何时阅读：当你需要评估 `primary_state_key` 是否应继续外溢时阅读。

原文明确说明：它现在仍有用，但长期不应被升级成新的对外语义中心。

### 10.2 同层执行顺序依赖当前图构建顺序

文件路径：`core/engine.py`
角色：当前执行顺序的实现性限制。
负责：基于 `self.nodes` 初始化顺序、`_build_graph()` 往 adjacency 里 append 的顺序、queue 的出队顺序完成拓扑排序。
不负责：提供独立 canonical ordering。
上下游：上游是 graph 构建顺序；下游是同层节点执行顺序。
何时阅读：当你需要评估同层节点为何没有更强排序保证时阅读。

因此当前同层可执行节点如果没有更强约束，其执行顺序依赖当前图构建顺序，而不是独立 canonical ordering。

### 10.3 validator 与 engine 存在部分防御性重复

文件路径：`api/workflow_validator.py` / `core/engine.py`
角色：当前链路的防御性重复边界。
负责：通过 validator 的正式裁决与 engine 的防御性检查共同兜底。
不负责：把重复完全收口。
上下游：上游是合法性裁决；下游是执行期防御。
何时阅读：当你需要评估 validator 与 engine 为什么都在检查某些条件时阅读。

原文举出的重复例子包括：

* validator 会检查 DAG 无环，engine `_topological_sort` 仍会再防御性检查
* validator 会检查 context link source/target 合法性，engine `_build_graph` 仍会再检查
* validator 会检查 prompt 依赖绑定，engine `prompt_template.format(**bound_inputs)` 仍会捕获 `KeyError`
* validator 会检查 prompt template / model resource 依赖，engine 运行时仍会再防御性失败

原文也明确指出：这类重复不是 accidental bug，而是当前为了防止上游绕过校验后错误直接下沉到执行期的防御性实现；但长期看，它确实是需要持续审视和收口的债务。

### 10.4 service 当前把部分未分类异常折叠成 definition failure

文件路径：`api/workflow_run_service.py`
角色：当前失败收敛的实现性简化。
负责：把未分类 `Exception` 统一折叠成 `failure_stage="definition"`。
不负责：精确保留所有更细粒度失败来源。
上下游：上游是未分类异常；下游是 run-level 失败摘要。
何时阅读：当你需要评估为什么某些未知异常会落到 definition failure 时阅读。

原文指出：这让 run-level 语义更稳定，但可能掩盖更细粒度的真实失败来源。

### 10.5 direct run transport step shape 复用 projection model，但 owner 仍需持续明确

文件路径：`api/run_http_schemas.py` / `contracts/step_projections.py`
角色：projection reuse 的 owner 边界。
负责：复用 step projection shape。
不负责：让 `contracts/step_projections.py` 变成 execution facts owner 或 direct run HTTP transport owner。
上下游：上游是 projection reuse；下游是 direct run transport schema。
何时阅读：当你需要确认 projection reuse 不等于 owner 迁移时阅读。

原文明确指出：

* execution facts owner 不是这个文件
* HTTP transport owner 也不能被误认成 `contracts.step_projections.py`

这条边界需要持续守住，避免 projection reuse 再次演变成 contract owner 混淆。

---

## 11. 关键分层原则

### 11.1 canonical workflow contract 不等于 execution facts

`contracts/workflow_contracts.py` 定义的是 workflow 保存态 / 共享态 shape。
`core/execution_types.py` 定义的是 engine 与 service 之间交换的内部执行事实。
这两层不能混成同一层。

### 11.2 execution facts 不等于 direct run HTTP DTO

engine 产出的是 execution facts。
`api/run_http_schemas.py` 定义的是对外 direct run transport DTO。
这两层之间必须经过 mapper 投影。

### 11.3 success 与 failed 的主状态不是同一字段

success 时只看 `final_state`。
failed 时只看 `partial_state`。
不能把这两种主状态语义重新混成一个字段。

### 11.4 run 级失败摘要不等于 step 级错误详情

run-level 的 `error_type / error_message / error_detail / failure_stage` 是失败摘要 owner。
step-level 的 error 只负责单步详情。
前端顶层 summary panel 与步骤卡片详情不能混看。

### 11.5 prompt window 是 run 内内存态机制

无 inbound context link = `new_window`。
`continue` 复用来源窗口并沿当前历史继续。
`branch` 从 source prompt 提交完成时的固定快照分叉。
`window_id` 是 run-local synthetic id，不是 durable identity。
这套机制是运行时机制，不是持久化对象，也不是 durable identity。

---

## 结语

当前 backend direct run 链已经形成了一条相对清晰的正式主链：

* `contracts/workflow_contracts.py` 定义 canonical workflow contract
* `core/engine.py` 执行合法 canonical workflow，产出 execution facts
* `core/execution_types.py` 定义 internal execution facts owner
* `api/workflow_run_service.py` 统一收敛 success / failed 为 `WorkflowExecutionResult`
* `api/run_result_mapper.py` 再把 internal facts 投影为 `RunResult`
* `api/run_http_schemas.py` 定义 direct run HTTP transport DTO

其中最重要的正式语义包括：

* success 只看 `final_state`
* failed 只看 `partial_state`
* run 级错误摘要看 top-level `error_type / error_message / error_detail / failure_stage`
* step 级错误只负责单步详情
* prompt window 是 run 内内存态机制
* 多输出 prompt 必须返回 JSON object，且 key 集合必须与 `outputs.name` 完全一致
* run-level `finished_at` 已在 internal execution result 中保留，但当前 direct run API 尚未对外暴露

