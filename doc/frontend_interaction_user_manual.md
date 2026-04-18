# 项目使用手册（前端页面交互版）

## 1. 手册定位

本文面向“页面使用者/联调同学”，重点说明前端页面的交互与使用流程，而不是开发命令。

- 代码事实基线：当前本地仓库（2026-04-18）
- 前端主页面：`frontend-react/src/components/WorkflowEditor.tsx`
- 页面入口链路：`main.tsx -> App.tsx -> WorkflowEditor -> workflow-page/*`

启动与测试命令请看：`doc/project_operation_commands.md`。

---

## 2. 页面总览（你会看到什么）

页面是三栏结构，加两个浮层区域：

1. 左侧栏（WorkflowSidebar）
2. 中央画布区（ReactFlow）
3. 右侧节点配置与节点测试区（NodeConfigPanel）
4. 右侧抽屉浮层（模型资源面板，按需弹出）
5. 中央弹窗浮层（新建画布、创建绑定）

---

## 3. 核心概念（先理解再操作）

1. 画布（Canvas）
 - 一个画布就是一份工作流。
 - 默认画布 ID 是 `article`。
2. 正式画布 vs 临时空白画布
 - 临时空白画布：本地存在，首次保存成功后才变正式画布。
3. 节点（Node）
 - 支持三类：`Input`、`Prompt`、`Output`。
4. 数据连线（Binding）
 - 普通数据连线：`source.output -> target.input`。
 - 上下文连线（Context Link）：模式可切换 `continue` / `branch`。
5. 运行形态
 - 实时运行（Live Run）
 - 批处理运行（Batch Run）
 - 节点子图测试（Node Test）

---

## 4. 快速上手（推荐顺序）

1. 在左侧 `Canvas` 下拉中确认当前画布。
2. 点击 `+ Input Node / + Prompt Node / + Output Node` 添加节点。
3. 在中间画布拖拽连线，必要时创建上下文连线。
4. 选中节点，在右侧“节点配置”填写关键字段。
5. 在左侧 `Run Inputs` 填写输入值。
6. 点击 `Save` 保存画布。
7. 点击 `Run Draft` 或 `Run Batch` 执行。
8. 在底部 `Run Result` 面板查看状态、步骤和错误详情。

---

## 5. 详细交互说明

## 5.1 画布切换与状态

入口：左侧 `Canvas` 下拉框。

- `当前生效`：当前已加载并生效的画布。
- `目标切换`：你选了新画布，系统正在切换。
- `画布已就绪`：可正常编辑。
- `正在加载画布...`：切换中。
- `实时运行中，暂时无法切换画布。`：Live Run 锁定状态。

如果切换失败，会显示三段式错误：目标画布、当前仍停留画布、后端错误详情。

## 5.2 新建空白画布

入口：左侧 `Create Blank Canvas`。

弹窗支持：

1. 输入画布 ID
2. `Enter` 确认创建
3. `Esc` 或点击遮罩关闭

画布 ID 规则：

1. 不能为空
2. 必须以字母或数字开头
3. 仅允许字母、数字、下划线、连字符
4. 不能与现有/当前/请求中/临时画布重复

创建成功后会进入临时空白画布；首次 `Save` 成功后转为正式画布。

## 5.3 删除/丢弃画布

入口：左侧 `Delete Current Canvas` 或 `Discard Current Canvas`。

行为差异：

1. 临时画布：执行“丢弃”，不会调用正式删除接口。
2. 正式画布：执行删除并刷新列表。

硬限制：

1. 系统至少保留一个正式画布。
2. 若不满足会提示：`At least one formal saved canvas must remain`。

删除前会弹确认框，且明确“此操作无法撤销”。

## 5.4 节点与连线

新增节点：

1. `+ Input Node`
2. `+ Prompt Node`
3. `+ Output Node`

连线方式：

1. 普通连线：从源输出手柄连到目标输入手柄。
2. 创建绑定：连到目标节点的 `+ 绑定` 手柄后会弹“创建绑定”弹窗，填写目标输入名确认。

选中条工具条（画布上方）支持：

1. 删除普通连线（`Delete Edge`）
2. 上下文连线模式切换（`Set Continue` / `Set Branch`）
3. 删除上下文连线（`Delete Context Link`）

## 5.5 右侧节点配置区

未选中节点时显示：`未选择节点`。

通用字段：

1. 节点 ID（只读）
2. 节点类型（只读）
3. 输入键（仅 Input 节点）
4. 备注

类型配置：

1. Input 节点
 - `默认值`：仅当 direct run 的 `request.state` 未提供该 `inputKey` 时使用。
2. Prompt 节点
 - 提示词文本
 - 模型资源（从共享资源选择）
 - 窗口关系摘要（只读，来自 context links）
 - 派生目标输入（只读）
 - 入边绑定（权威展示）
 - Prompt 变量提示（仅提示，不代表真实绑定）
 - LLM 参数（温度、超时、最大重试）
3. Output 节点
 - 派生输入只读展示

## 5.6 左侧运行输入与批处理输入

`Run Inputs` 区：

1. 按输入节点生成输入项。
2. 无输入节点时显示 `未找到输入节点`。
3. Live Run 期间输入会锁定。

`Batch Inputs` 区：

1. 要求且仅允许一个输入节点。
2. 文本按“每行一个值”拆分。
3. `Max Parallel` 支持 1-4。
4. 批处理中可发起取消请求（运行中条目会自然完成）。

## 5.7 保存与运行按钮（左侧底部）

按钮包括：

1. `Save`
2. `Run Draft`
3. `Run Batch`
4. `Cancel Batch`
5. `Clear Run State`

常见锁定：

1. 无节点时，保存/运行前会提示先添加节点。
2. Live Run 时，保存/运行/批处理/清空被锁定。
3. Batch Run 时，保存/运行与图编辑会锁定。

批处理启动前置失败会直接提示：

1. 输入节点数量不等于 1
2. 唯一输入节点 `inputKey` 为空
3. 批处理输入文本为空

## 5.8 顶部横幅与页面状态

中间区顶部会按需显示横幅：

1. `实时运行`：当前 live 进度
2. `画布状态`：切换进度
3. `新建画布`：临时画布提示
4. `工作流错误`：页面级错误
5. `工作流警告`：加载警告
6. `草稿状态`：有未保存改动时显示，可点 `Revert to Saved`

`Revert to Saved` 在以下场景禁用：

1. 保存中
2. 画布切换中
3. 删除中
4. 当前为临时画布
5. Live/Batch 正在运行

## 5.9 运行结果面板（底部）

`Run Result` 面板包含：

1. 结果头部（状态、范围、运行 ID、活动节点）
2. 失败摘要（类型、失败步骤、错误详情）
3. 运行状态总览（输入状态 vs 结果状态，新增/更新字段摘要）
4. 执行步骤时间线
5. 原始 JSON 折叠区

无结果时会显示：`暂无运行结果`。

## 5.10 节点测试（右侧“节点测试”折叠区）

支持动作：

1. `运行测试`
2. `清除缓存结果`
3. `重置可复用上下文`

输入来源标签：

1. `可复用`
2. `已固定`
3. `缺失`

说明：

1. 完整 Live Run 进行中时，节点测试被禁用。
2. 图语义变化会使缓存结果标记过期；必要时自动清空可复用上下文。

## 5.11 模型资源侧栏

入口：左侧 `Model Resources`。

面板形态：

1. 右侧抽屉
2. 点击遮罩或 `Close` 可关闭

功能：

1. 新建资源（资源 ID、提供方、模型、API Key、Base URL）
2. 查看配置文件状态（缺失/无效/为空/已启用）
3. 编辑资源（可留空 API Key 以保留旧值）
4. 删除资源（若被工作流引用，会显示阻塞明细）

当前 provider 类型：`openai_compatible`（界面显示为 `OpenAI 兼容`）。

---

## 6. 锁定与互斥规则（高频问题）

1. Live Run 优先级最高：会锁图编辑、画布操作、部分运行操作。
2. Batch Run 期间：图编辑与部分运行动作锁定；支持请求取消。
3. 画布切换/删除/保存过程中：相应操作按钮会禁用，避免并发冲突。
4. 临时画布未保存前：会持续显示“临时画布”提示，且行为与正式画布不同。

---

## 7. 常见提示语怎么理解

1. `当前批处理运行要求且仅允许一个输入节点。`
 - 含义：Batch 模式只能有 1 个 Input 节点。
2. `该唯一输入节点必须声明非空的 inputKey。`
 - 含义：Input 节点配置里的 `输入键` 不能为空。
3. `批处理输入值不能为空。`
 - 含义：Batch 文本框至少一行有效值。
4. `完整 Live Run 进行中，画布相关操作已暂时禁用。`
 - 含义：请等待 Live Run 结束后再切换/新建/删除/保存。
5. `由于上游图语义发生变化，已清空可复用的子图测试状态...`
 - 含义：图结构变化触发子图测试上下文失效保护。

---

## 8. 与后端联动说明（使用者视角）

1. 前端 API 基址固定为 `http://127.0.0.1:8000/api`。
2. 页面交互（加载画布、保存、运行、模型资源操作）都依赖后端可用。
3. 若后端不可达，通常会在“工作流错误”或面板错误区看到失败信息。

---

## 9. 相关文档

1. 架构基线：`doc/current_architecture_baseline.md`
2. workflow-page 职责地图：`doc/frontend_workflow_page_responsibility_map.md`
3. 命令清单：`doc/project_operation_commands.md`
4. 边界与守卫测试：`doc/boundary_contract_tests_guide.md`

---

## 10. 维护约定

当以下路径发生交互行为变化时，应同步更新本文：

1. `frontend-react/src/components/workflow-page/*`
2. `frontend-react/src/components/WorkflowSidebar.tsx`
3. `frontend-react/src/components/NodeConfigPanel.tsx`
4. `frontend-react/src/components/WorkflowModelResourcePanel.tsx`
5. `frontend-react/packages/run-display/src/run-display/*`
