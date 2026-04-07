
# 07-frontend-model-resource-panel.md主链背景
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

这是前端消费侧背景文档，不反向裁决后端删除扫描规则
## 本篇回答的问题

* model resource 管理面板当前承担了什么职责？
* 它为什么是复合组件？
* 删除阻止 detail 在前端如何消费？
* 当前这条前端管理链有哪些明确限制和技术债？ 

## 先看结论

当前前端 model resource 管理面板的核心文件是 `WorkflowModelResourcePanel.tsx`。它不是纯展示组件，也不是拆分良好的 `controller + view` 组合，而是当前页面内嵌的、以本地单用户管理为假设的 model resource 管理复合面板。它之所以能工作，是因为链路当前仍然较短：上游由 `WorkflowEditor.tsx` 控制面板开关并传入资源列表，下游直接调用 `api.ts` 中的 model resource HTTP wrapper，中间通过 `modelResourceTypes.ts` 消费 transport / mirror types。

## 核心文件

**文件路径**：`WorkflowModelResourcePanel.tsx`
**文件角色**：当前前端页面内的 model resource 管理交互聚合落点。
**为什么要读它**：当问题落在 model resource 面板当前能做什么、怎么调 API、怎么展示 delete blocked detail、有哪些已知限制时，先读这个文件。

## 组件定位

**本组件是什么**：复合组件。
**本组件负责**：

* UI 渲染
* 局部表单状态
* 直接 API 调用
* 基础错误文本提取
* 删除阻止 detail 解析
* 资源列表刷新编排
* config health 展示

**本组件不负责**：

* model resource 前端正式 owner
* 正式类型 owner
* 错误协议 owner
* 数据流 owner

## 为什么它是复合组件

它同时承担展示、表单状态、网络请求、错误协议解析和刷新编排，因此已经不是“纯 UI 组件”或“单一责任组件”。它不是简单的 resource list view，也不是单纯的 form view，而是当前 model resource 管理功能在前端页面内的聚合实现。

## 上下游

**上游**：

* `WorkflowEditor.tsx` 控制面板开关
* `WorkflowEditor.tsx` 传入 `modelResources`

**下游**：

* 直接调用 `api.ts` 中的 model resource HTTP wrapper
* 通过 `modelResourceTypes.ts` 消费 transport / mirror types
* 通过上层传入的 `onResourcesChanged()` 触发资源列表刷新

## 负责的内容

### 1. UI 渲染

本组件直接渲染右侧抽屉式 side panel，包含：

* overlay
* 面板头部
* create 表单
* resource status 区
* 资源列表区
* edit / delete 按钮区
* 删除失败 detail 展示区 

### 2. 局部表单状态

本组件自己持有 create / edit / delete / status 相关本地状态，包括：
`draftResourceId`、`draftProvider`、`draftProviderModel`、`draftApiKey`、`draftBaseUrl`、`editingResourceId`、`draftEditProvider`、`draftEditProviderModel`、`draftEditApiKey`、`draftEditBaseUrl`、`isCreating`、`isUpdating`、`deletingResourceId`、`createErrorMessage`、`editErrorMessage`、`deleteErrorMessage`、`statusErrorMessage`。

### 3. 直接 API 调用

本组件内直接调用：

* `createModelResource`
* `updateModelResource`
* `deleteModelResource`
* `getModelResourcesStatus` 

### 4. 错误处理

本组件内部自己实现：

* `extractErrorMessage(error, fallback)`
* `extractDeleteBlockedDetail(error)`

### 5. 结果刷新编排

本组件并不拥有资源列表事实源。create / update / delete 成功后，不自己重拉列表，而是统一走 `refreshResources()`，内部再调用上层传入的 `onResourcesChanged()`。因此它只是通过页面层回调请求上层刷新资源列表。

### 6. config health 展示

本组件在 `useEffect` 中请求 `getModelResourcesStatus()`，持有 `modelResourceStatus`，再通过 `getStatusText(status)` 把状态码翻译成展示文本。当前支持的文件级状态包括：

* `file_missing`
* `file_invalid`
* `file_empty`
* `file_active`

当前会展示 `Status` 和 `Config Path`。这里展示的是配置文件级 health，不是 provider 连通性或 API key 可用性诊断。

## 列表展示规则

### 1. resource list

资源列表不是面板自己拉取，而是由上层 `WorkflowEditor.tsx` 传入 `modelResources`。组件内部先通过 `sortedResources = [...modelResources].sort(...)` 按 id 做本地排序，再逐项渲染资源卡片。每个 resource 卡片当前展示：

* id
* provider label
* model
* base URL
* masked API key

### 2. provider label

provider 原始值来自 `resource.provider`。当前面板通过 `getProviderLabel(provider)` 转成展示文案。目前只支持：

* `openai_compatible -> OpenAI Compatible`

这说明 provider label 映射仍然是前端手写展示逻辑，不是统一 schema 驱动结果。

### 3. masked API key

面板不会直接原样显示 `api_key`，而是通过 `maskApiKey(value)` 做轻量 mask。当前规则是：

* 空值 -> `(empty)`
* 长度 `<= 8` -> `••••••••`
* 否则 -> 前 4 位 + `••••` + 后 4 位

这只是展示层 mask，不是安全边界，因为 transport item 本身仍携带明文 `api_key`，只是 UI 没有完整显示。

## 动作链

### 1. create

**动作入口**：`handleCreateResource()`
**当前行为**：

* 读取并 trim：`draftResourceId`、`draftProviderModel`、`draftApiKey`、`draftBaseUrl`
* 做本地最小非空校验：`Resource ID` 必填、`Provider model` 必填、`API key` 必填、`Base URL` 必填
* 调 `createModelResource({...})`
* 成功后调用 `refreshResources()`，并清空 create draft 表单状态
* 失败后用 `extractErrorMessage(...)` 提取文本错误并展示

**边界**：create 前端校验只服务 UX，最终以后端为准；它不做严格 ID 合法性校验、provider 深校验、URL 合法性校验、配置文件冲突裁决。

### 2. update

**动作入口**：`handleUpdateResource(resourceId)`
**当前行为**：

* 从 edit draft 中读取 `provider`、`model`、`api_key`、`base_url`
* 做本地最小校验：`provider model` 必填、`base URL` 必填
* 若 `draftEditApiKey.trim()` 为空，则不发送 `api_key`
* 调 `updateModelResource({...})`
* 成功后刷新资源列表并清理 editing 状态
* 失败后用 `extractErrorMessage(...)` 提取错误文本

**关键对齐点**：前端“留空不传 `api_key`”对齐后端“保持现有 key 不变”的语义。

### 3. delete

**动作入口**：`handleDeleteResource(resourceId)`
**当前行为**：

* 设置 `deletingResourceId`
* 清理旧的 delete 错误状态：`deleteErrorMessage`、`deleteBlockedDetail`、`deleteErrorResourceId`
* 调 `deleteModelResource({ id: resourceId })`
* 成功后刷新资源列表；若当前正在编辑该资源，则取消编辑态
* 失败后保存 `deleteErrorResourceId`
* 用 `extractDeleteBlockedDetail(error)` 解析结构化 detail
* 用 `extractErrorMessage(...)` 提取文本错误

这说明 delete 动作不只是“删失败就显示字符串”，而是已经能消费结构化删除阻止 detail。

## 删除阻止 detail

### 1. 当前能解析什么

当前只识别两类已知 `error_type`：

* `model_resource_in_use`
* `model_resource_reference_scan_incomplete`

如果命中其中之一，就把后端返回的 detail 收敛为前端镜像结构 `ModelResourceDeleteBlockedDetail`，包含：

* `error_type`
* `message`
* `references`
* `incomplete_workflows`

如果不是已知结构，就返回 `null`。也就是说，前端当前把删除失败分成两层：有结构化 delete blocked detail 的失败，以及只有普通文本错误的失败。

### 2. model_resource_in_use

当后端返回 `error_type = model_resource_in_use`，前端会展示：

* `message`
* `references`

其中 `references` 当前按列表展示为：

* `workflow_name · node node_id`

这意味着前端已经能展示“这个 resource 正在被哪些 workflow / node 引用”。

### 3. model_resource_reference_scan_incomplete

当后端返回 `error_type = model_resource_reference_scan_incomplete`，前端会展示：

* `message`
* `incomplete_workflows`

其中每个 incomplete item 当前展示：

* `workflow_name`
* `error_message`

这意味着前端也能展示“哪些 workflow 文件无法可靠扫描，因此删除被保守阻止”。

### 4. 当前展示策略

删除失败展示当前有两层逻辑：

* 若存在 `deleteBlockedDetail`，优先显示 `deleteBlockedDetail.message`，再展示 `references / incomplete_workflows`
* 若没有结构化 detail，回退显示普通 `deleteErrorMessage`

当前消费策略是：结构化 detail 优先，普通文本错误兜底。

### 5. 当前协议知识放在哪里

`extractDeleteBlockedDetail(...)` 和 `extractErrorMessage(...)` 都还定义在 `WorkflowModelResourcePanel.tsx` 内部。这说明删除错误协议知识还没有下沉到 `request helper`、`operations`、`controller` 或专门的 error translator；当前能力已经有，但仍是组件内嵌式实现。

## 当前限制与技术债

### 1. API 调用与错误协议知识仍在组件内

组件内部直接知道如何调 create / update / delete / status API，如何解析 axios 风格错误，如何识别 delete blocked detail 的结构。这意味着 UI 层和 request / protocol 层还没有彻底分开，组件承担了过多链路知识。

### 2. status 刷新与 resources 刷新不是统一数据流

当前 resource list 来自上层 `modelResources + onResourcesChanged`，config health 来自 panel 自己在 `useEffect` 中调用 `getModelResourcesStatus()`。因此 create / update / delete 成功后只刷新 resource list，不自动刷新 status；当前 panel 的 status 与 resources 不是统一刷新链。

### 3. provider / base URL 默认值硬编码

当前组件内部仍硬编码：

* `DEFAULT_PROVIDER = 'openai_compatible'`
* `DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'`

这意味着 provider / default base URL 仍是 UI 假设，不是统一配置驱动结果。

### 4. mask 只是展示层，不是安全边界

虽然面板展示时做了 `maskApiKey(...)`，但 transport item 仍包含 `api_key`，组件仍能拿到完整值，前端只是选择不完整显示，因此这不是安全设计。

### 5. 删除错误状态建模仍是单一活跃删除项

当前删除相关状态是：

* `deletingResourceId`
* `deleteErrorResourceId`
* `deleteErrorMessage`
* `deleteBlockedDetail`

这说明当前假定同一时间只有一个活跃删除动作。

### 6. panel 仍不是正式 owner

虽然 panel 当前很重，但它没有拥有：

* model resource transport contract
* delete blocked detail contract
* 数据事实源
* 统一错误协议翻译

它只是当前页面内聚合了 model resource 管理交互的实现落点。

## 排除区

不要把当前 `WorkflowModelResourcePanel.tsx` 误读为以下角色：

* 不是纯展示组件
* 不是已经拆分完成的 `controller + view`
* 不是全局状态 owner
* 不是统一错误协议翻译层
* 不是缓存 / 重试 / 并发请求管理层
* 不是 provider 连通性诊断层
* 不是后端 delete blocked detail contract owner
* 不是 model resource 前端正式 owner
* 不是资源列表正式事实源 owner
* 当前展示的 config health 不是 provider 连通性或 API key 可用性诊断
* create 前端校验不是最终合法性裁决
* API key mask 不是安全边界

## 一句话总结

当前 `WorkflowModelResourcePanel.tsx` 已经具备完整的 model resource 管理功能，能展示 resource list、展示 config health、执行 create / update / delete、通过上层回调刷新资源列表，并消费结构化 delete blocked detail；但它仍然是页面层的复合实现，而不是已经收口良好的前端管理链架构终态。

