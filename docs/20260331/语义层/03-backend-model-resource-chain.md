
# 03-backend-model-resource-chain主链背景
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
## 本篇回答的问题

* model resource 从文件配置到运行时 resolve 的链路是什么？
* 删除保护如何工作？
* 哪些层是 owner？
* 当前这条链还有哪些明确限制和技术债？

## 先看结论

当前 model resource 链可以明确分成五层：

1. `config/model_resources.json` 是配置事实源。
2. `shared/model_resource_config_shared.py` 是共享配置规则层，负责路径常量、provider 支持集、单条配置项最小归一化。
3. `storage/model_resource_store.py` 是文件 IO owner，负责 strict parse、`ModelResourceRecord` map 构建、health 与整表写回。
4. `core/model_resource_registry.py` 是 runtime registry 投影层，负责把 record map 投影成运行时 registry，并提供 `resolve_model_resource`。
5. `api/model_resource_reference_service.py` 是删除保护扫描层，负责复用正式 workflow 列表规则，对 raw `workflow.yaml` 做最小引用扫描，并在不可安全删除时返回结构化 detail。

`api/workflows.py` 与 `api/model_resource_http_schemas.py` 位于 route / DTO 层，只负责 HTTP 编排和 transport shape，不拥有文件 IO、runtime registry 或删除扫描逻辑。

---

## 1. 配置文件事实源

### 文件

`config/model_resources.json`

### 角色

当前 model resource 的正式配置事实源。

### 形状

它的顶层必须是一个 JSON object。
顶层 key 是 `resource_id`，value 是单条资源配置。
当前单条配置项包含四个核心字段：

* `provider`
* `model`
* `api_key`
* `base_url`

### 负责

* 作为持久化事实源保存 model resource 配置。

### 不负责

* HTTP DTO
* runtime registry

### 边界

运行时真正消费的对象，要先经过 shared 规则层和 storage 层收口，再投影到 core registry。

### 当前样本形状

```json
{
  "1": {
    "provider": "openai_compatible",
    "model": "deepseek-chat",
    "api_key": "...",
    "base_url": "https://api.deepseek.com/v1"
  },
  "1111": {
    "provider": "openai_compatible",
    "model": "1111111111",
    "api_key": "...",
    "base_url": "https://api.deepseek.com/v1"
  }
}
```

### 文档要求

示例里的 `api_key` 必须脱敏，不能把真实值写进文档。

---

## 2. shared 配置规则层

### 文件

`shared/model_resource_config_shared.py`

### 角色

共享配置规则层。

### 负责

只负责三件事：

1. 定义配置文件路径常量
   `MODEL_RESOURCE_CONFIG_PATH = config/model_resources.json`
2. 定义 provider 支持集
   当前只有：`openai_compatible`
3. 定义单条原始配置项的最小归一化规则
   `normalize_model_resource_item(value)`

### 当前规则

这层的正式口径不是“严格 schema validator”，而是“单条配置项最小收敛器”。

当前规则是：

* `value` 必须是 `dict`
* `provider / model / api_key / base_url` 都通过 `str(...).strip()` 收敛
* `provider` 必须属于 `SUPPORTED_MODEL_RESOURCE_PROVIDERS`
* `model / api_key / base_url` 必须非空
* 合法则返回最小归一化 dict
* 非法则返回 `None`

### 不负责

* 文件读取
* `resource_id` 读取
* `ModelResourceRecord` 实例化
* runtime registry 投影
* 删除保护扫描
* HTTP DTO

### 边界

shared 层只是“配置规则层”，不是“配置事实源 owner”，也不是“正式 record map owner”。

---

## 3. storage 层

### 文件

`storage/model_resource_store.py`

### 角色

文件 IO owner，也是正式 record map 的读取 / 写回入口。

### 负责

* strict parse
* `ModelResourceRecord` map 构建
* health
* 整表写回

### 3.1 读取链

正式读取链是：

* `_load_raw_model_resource_config_file_or_raise()`
* `normalize_model_resource_item(...)`
* `ModelResourceRecord(...)`
* `load_model_resource_record_map_or_raise()`

`_load_raw_model_resource_config_file_or_raise()` 的职责是严格读取原始 JSON：

* 文件不存在 -> `ModelResourceConfigError`
* JSON 非法 -> `ModelResourceConfigError`
* 顶层不是 object -> `ModelResourceConfigError`

`load_model_resource_record_map_or_raise()` 做整表解析：

* 遍历顶层每个 `(key, value)`
* 用 `_trim(key)` 得到 `resource_id`
* 用 shared 层的 `normalize_model_resource_item(value)` 收敛单条 `value`
* 任何一条 record 非法，都把整个文件视为非法
* 不接受“部分成功、部分跳过”

最终输出：

```python
{resource_id: ModelResourceRecord}
```

这意味着 storage 层的正式口径是：

* strict parse
* 全表一致性优先
* 不做容错跳过

### 3.2 ModelResourceRecord 是什么

storage 层最终构建的共享记录结构是 `contracts/model_resource_contracts.py` 里的：

`ModelResourceRecord`

字段包括：

* `id`
* `provider`
* `model`
* `api_key`
* `base_url`

这说明“正式 record”是共享 contract，不是 storage 私有 dict。

### 3.3 空文件与非法文件的区别

`load_model_resource_record_map_or_empty()` 保留了一个重要区分：

* 配置文件不存在 -> 返回 `{}`
* 配置文件存在但非法 -> 仍然抛错

这里的设计点是：
“没有配置”与“配置损坏”是两种不同状态。

### 3.4 health owner

health 语义的 owner 也在 storage 层：

`get_model_resource_config_health()`

当前只有最小文件级状态：

* `file_missing`
* `file_invalid`
* `file_empty`
* `file_active`

它不表达：

* provider 连通性
* API key 是否有效
* 实际模型是否可调用

所以这里的 health 是“配置文件健康”，不是“运行时连通性健康”。

### 3.5 写回链

写回入口是：

`write_model_resource_record_map(records)`

它的职责是：

* 对 `records` 按 `resource_id` 排序
* 整表回写 `config/model_resources.json`

### 不负责

* 局部 patch
* 并发冲突处理
* 原子写保障

### 边界

storage 层是 model resource 配置文件的唯一文件 IO owner，也是 `ModelResourceRecord` map 的正式读取 / 整表写回 owner。

---

## 4. runtime registry 层

### 文件

`core/model_resource_registry.py`

### 角色

runtime registry 投影层。

### 负责

* 把 storage 层 record map 投影成运行时 registry
* 提供 `resolve_model_resource`

### 不负责

* 文件 IO
* 原始 JSON 解析
* health 语义 owner

### 4.1 投影链

正式投影链是：

* `load_model_resource_record_map_or_empty()`
* `_build_runtime_registry_from_records(records)`
* `load_model_resource_registry()`

当前投影后的 runtime registry 形状仍然是：

```python
{
  resource_id: {
    "provider": ...,
    "model": ...,
    "api_key": ...,
    "base_url": ...
  }
}
```

也就是说，core 层当前还没有强类型 runtime resource model，而是 `dict[str, dict]`。

### 4.2 resolve 入口

运行时 resolve 入口是：

`resolve_model_resource(model_resource_id, registry=None)`

它的正式语义是：

* prompt 节点的模型选择只由 `modelResourceId` 决定
* 若未传 `registry`，则实时加载当前活动 registry
* `model_resource_id` 为空 -> `ValueError`
* `registry` 为空 -> `ValueError`
* `model_resource_id` 不存在 -> `ValueError`
* 成功则返回完整运行时资源对象

这说明 core 层在这里做的是“运行时资源解析”，不是“配置管理”。

### 4.3 health 透传

`get_model_resource_registry_health()` 只是把 storage 的 health 透传出来。

### 边界

core registry 层只负责把存储层 record map 投影为运行时 registry，并提供 resolve 入口；它不是文件 IO owner，也不是 health 语义 owner。

---

## 5. 删除保护扫描链

### 文件

`api/model_resource_reference_service.py`

### 角色

删除保护扫描层。

### 关键点

这条链的关键点不是 canonical workflow load，而是“保守的 raw YAML 最小扫描”。

### 5.1 扫描目标从哪里来

扫描范围不是自己遍历目录，而是复用正式 workflow 列表规则：

* `list_canvas_summaries()`
* `get_canvas_workflow_path(canvas_id)`
* `load_yaml_workflow(workflow_path)`

也就是说，扫描目标只来自当前正式 workflow 存储链中的 canvas：

* 必须是 `workflows/<canvas_id>/workflow.yaml`
* 必须能被 `list_canvas_summaries()` 识别成正式 canvas

删除保护没有自己重新发明一套 workflow 列表规则，而是复用了 loader 已经收口的正式规则。

### 5.2 扫描的不是 canonical workflow

删除保护并不要求 workflow 能 canonical load。它只做 raw YAML 最小引用扫描。

核心函数是：

* `scan_model_resource_references(resource_id)`
* `_scan_raw_workflow_for_resource_references(canvas_id, raw_data, resource_id)`

扫描规则是：

* 顶层必须是 `dict`
* `nodes` 必须是 `dict`
* 只扫描 `nodes`
* 只关心 `type == "prompt"` 的节点
* 只关心该节点的 `modelResourceId`
* 若其值等于待删 `resource_id`，则记为一条引用

它不做：

* converter
* normalize
* validator
* dependency check
* `contextLinks / edges` 解析

这条链的正式口径是：
删除保护扫描关心的是“当前 raw workflow YAML 中是否能确认存在对该 resource 的引用”，而不是“workflow 是否整体合法”。

### 5.3 为什么坏文件也会阻止删除

这条链采取的是保守阻止策略。

如果某个 workflow 文件无法可靠扫描，会被记入：

`incomplete_workflows`

触发条件包括：

* `workflow.yaml` 无法读取
* YAML parse 失败
* 顶层不是 object
* `nodes` 不是 object
* 某个 node 不是 object
* 其他导致无法继续可靠扫描的情况

只要存在这种“不完整扫描”，即使当前没有确认到真实引用，也不会放行删除。

正式策略是：
删除保护的目标不是“尽量删”，而是“只有在可证明安全时才删”。

### 5.4 结合 workflow 样本

你给的 workflow 样本里，有两个 prompt 节点都声明了：

`modelResourceId: '1111'`

分别是：

* `prompt_node_1`
* `prompt_node_2`

如果这个样本属于正式 canvas 列表中的某个 `workflow.yaml`，那么删除 `resource_id = "1111"` 时，扫描器会在 raw nodes 下确认到两条真实引用，因此删除会被阻止，错误类型会优先落到：

`model_resource_in_use`

---

## 6. delete blocked detail

### 文件

`contracts/model_resource_contracts.py`

### 角色

删除阻止时的共享 detail contract 所在位置。

### 核心结构

`ModelResourceDeleteBlockedDetail`

字段包括：

* `error_type`
* `message`
* `references`
* `incomplete_workflows`

其中 `error_type` 当前有两个稳定机器值：

* `model_resource_in_use`
* `model_resource_reference_scan_incomplete`

### 6.1 references

真实引用项使用：

`ModelResourceReference`

字段包括：

* `workflow_name`
* `node_id`
* `model_resource_id`

兼容说明：

* `workflow_name` 当前是兼容旧字段名
* 真实内部语义已经更接近 `canvas_id`

### 6.2 incomplete_workflows

扫描不完整项使用：

`IncompleteWorkflowReferenceScanItem`

字段包括：

* `workflow_name`
* `error_message`

这表示哪个 workflow 无法被可靠扫描，以及原因是什么。

### 6.3 优先级规则

`build_model_resource_delete_blocked_detail(resource_id)` 的优先级是：

* 若存在真实引用，返回 `model_resource_in_use`
* 否则若存在扫描不完整项，返回 `model_resource_reference_scan_incomplete`
* 两者都没有，返回 `None`

但有一个细节：

即使已经有真实引用，detail 里仍可能同时带出 `incomplete_workflows`。

也就是说，当前 detail 是“优先按主要阻止原因分类，但尽量保留完整背景信息”。

### 6.4 抛错边界

最终由：

`assert_model_resource_deletable(resource_id)`

执行断言。若不允许删除，则抛：

`ModelResourceDeleteBlockedError(detail)`

这里的 `detail` 是结构化对象，而不是普通错误字符串。

---

## 7. route / DTO 层

### 文件

* `api/model_resource_http_schemas.py`
* `api/workflows.py`

### 角色

route / DTO 层。

### 7.1 HTTP DTO owner

`api/model_resource_http_schemas.py` 是 transport DTO owner，定义了：

* `ModelResourceListItem`
* `CreateModelResourceRequest`
* `UpdateModelResourceRequest`
* `DeleteModelResourceRequest`
* `ModelResourceConfigHealth`

### 不负责

* 配置文件原始 shape
* runtime registry shape
* 删除保护扫描逻辑
* 文件 IO

### 7.2 路由编排职责

`api/workflows.py` 承接了 model resource 的几个接口：

* `GET /model-resources`
* `GET /model-resources/status`
* `POST /model-resources`
* `PUT /model-resources`
* `DELETE /model-resources`

它的角色是 route 编排，而不是 owner。

#### list

`GET /model-resources`

* 读取 storage record map
* 投影成 `ModelResourceListItem`
* 排序后返回

它返回的是管理面板 DTO，不是 runtime registry。

#### status

`GET /model-resources/status`

* 调用 core 的 `get_model_resource_registry_health()`
* 再包装为 `ModelResourceConfigHealth`

这里 route 不拥有 health 语义。

#### create

`POST /model-resources`

* route 先做最小空值检查
* 读取当前 record map
* 检查 id 是否重复
* 构造 `ModelResourceRecord`
* 调用 storage 整表写回

#### update

`PUT /model-resources`

* 严格读取现有 record map
* id 不可变
* `api_key=None` 表示保持旧 key 不变
* 显式提供 `api_key` 时，当前不允许空字符串
* 合成新 record 后整表写回

#### delete

`DELETE /model-resources`

* 参数检查
* 严格读取 record map
* 调用 `assert_model_resource_deletable`
* 通过后删除并整表写回

### 边界

route 层只负责编排与 `AppError -> HTTPException` 翻译，不拥有文件 IO、删除扫描或 runtime resolve 逻辑。

### 7.3 错误翻译边界

结构化删除阻止错误通过：

* `app_errors.ModelResourceDeleteBlockedError`
* `api.error_translator.to_http_exception(...)`

被映射成：

* HTTP 400
* `detail` 原样返回结构化对象

这说明：

* 结构化 delete blocked detail 的 owner 在 contract / reference service
* route / translator 只负责把它原样带出到 HTTP

---

## 8. 当前限制与技术债

### 8.1 api_key 仍在管理 DTO 中返回

当前：

* `ModelResourceRecord` 包含明文 `api_key`
* `ModelResourceListItem` 也直接返回 `api_key`
* 前端 mask 只是展示层行为，不是安全边界

因此现在的 model resource 管理链，本质上仍是假定“本地单用户管理面板”的信任模型，而不是正式的 secret-safe 管理边界。

### 8.2 写回非原子、无并发保护

`write_model_resource_record_map()` 当前是直接覆盖目标文件：

* 没有临时文件 + rename
* 没有并发锁
* 没有版本冲突控制

所以这条链当前只适合低并发、本地化管理场景。

### 8.3 provider 支持集双份维护

当前 provider 支持集同时存在于两处：

* `shared/model_resource_config_shared.py` 里的 `SUPPORTED_MODEL_RESOURCE_PROVIDERS`
* `contracts/model_resource_contracts.py` 里的 `ModelResourceProvider = Literal[...]`

这意味着扩展 provider 时必须同步修改两侧，否则 shared 规则层和 contract 层会发生漂移。

### 8.4 shared normalize 仍是宽松文本收敛

当前 shared 层使用的是：

`str(...).strip()`

storage 里 `_trim()` 也是类似策略。

这不是严格 typed normalize，只是便于当前配置链工作的宽松文本收敛。它更像“管理链输入收口”，不是高强度 schema validator。

### 8.5 runtime registry 仍是弱类型 dict

当前 core registry 返回的还是：

`dict[str, dict]`

而不是强类型 runtime resource model。
这让 resolve 链可以工作，但也意味着 runtime 侧 contract 仍然偏弱。

### 8.6 resolve 失败仍抛 ValueError

`resolve_model_resource()` 当前在以下情况下抛的是通用 `ValueError`：

* id 为空
* registry 为空
* id 未命中

这说明 runtime resolve 的内部失败语义还没有完全进入统一的 `AppError` 分类体系，上层仍要解释它。

### 8.7 删除扫描绑定当前 persistent YAML shape

删除保护扫描直接假定当前 workflow 持久化形状是：

* 顶层 `nodes` 为 `dict`
* prompt 节点上直接有 `type` 与 `modelResourceId`

如果未来 workflow 持久化 shape 变更，这条扫描链必须同步修改；否则删除保护会失真。

### 8.8 workflow_name 仍是兼容字段名

删除阻止 detail 里仍保留：

`workflow_name`

但内部真实语义更接近：

`canvas_id`

这是当前错误 detail contract 的历史残影之一。

---

## 最后总结

当前 model resource 链已经具备比较清晰的分层：

* `config/model_resources.json` 是事实源
* shared 层定义配置规则
* storage 层拥有 strict parse、record map 与文件 IO
* core 层拥有 runtime registry 投影与 resolve
* reference service 拥有删除保护扫描与结构化阻止 detail
* route / DTO 层只做 HTTP 编排与 transport shape

这条链最核心的设计原则有两条：

第一，配置管理和运行时解析分层。文件配置先被收敛为 `ModelResourceRecord`，再投影到 runtime registry；route 不直接对 raw JSON 做运行时决策。

第二，删除保护采用保守阻止策略。只要存在真实引用，或存在无法可靠扫描的 workflow，就不允许删除；目标是“可证明安全才删除”，不是“尽量删除”。

