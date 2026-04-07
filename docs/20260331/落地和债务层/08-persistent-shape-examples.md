
# 08-persistent-shape-examples.md样例/误解澄清
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

不要把当前持久化 shape 误读成以下含义：

* 不要把 `workflow.yaml`、`metadata.yaml`、`model_resources.json` 的职责混在一起
* 不要把 `metadata.yaml` 当成 workflow 是否存在的事实源
* 不要把 `nodes` 误读成数组；它是字典
* 不要把 `edges` 和 `contextLinks` 当成同一种关系
* 不要把 `edges` 解释成 prompt window 关系；它只表达数据绑定
* 不要把 `contextLinks` 解释成结构化输入绑定；它只表达 prompt window 关系
* 不要把 `new_window` 当成保存态字段；它不进保存态
* 不要把 `contextLinks: []` 解释成没有窗口语义
* 不要把 `inputKey` 和 `stateKey` 当成同一个概念
* 不要把 `modelResourceId` 当成内联模型连接配置
* 不要在文档示例里保留真实 `api_key`
* 不要把当前 `output` 节点的真实使用方式忽略成“单纯终点输出”；样本里它已经在做聚合 

## 本篇回答的问题

* 当前正式持久化文件长什么样？
* 一个真实 workflow 样本如何映射到 contract 与运行语义？
* `metadata.yaml` 和 `model_resources.json` 分别扮演什么角色？
* 这些持久化 shape 容易被误解的点有哪些？ 

## 先看结论

当前正式持久化链里，需要一起看的文件有三类：

* `workflows/<canvas_id>/workflow.yaml`：正式 workflow 保存态事实源
* `workflows/<canvas_id>/metadata.yaml`：canvas 展示壳，只承载最小展示信息
* `config/model_resources.json`：model resource 配置事实源

三者职责不能混淆：

* `workflow.yaml` 决定当前 workflow 的正式保存态内容
* `metadata.yaml` 不决定 workflow 是否存在，只决定页面展示 label 等外壳信息
* `model_resources.json` 决定 prompt 节点通过 `modelResourceId` 引用到的共享模型资源配置 

## 文件一：workflow.yaml

**文件路径**：`workflows/<canvas_id>/workflow.yaml`
**文件角色**：正式 workflow 保存态事实源。
**为什么要读**：当问题落在 workflow 保存态 shape、节点如何持久化、数据绑定如何表达、prompt window 关系如何表达时，先读这个文件。

### 正式顶层结构

当前正式持久化 shape 顶层有三块：

* `nodes`
* `edges`
* `contextLinks`

其中：

* `nodes` 顶层是字典，不是数组；key 是 node id，value 是该节点持久化内容
* `edges` 和 `contextLinks` 是两种不同关系，不能混写，也不能相互替代
* `position` 放在节点顶层，其余业务字段放在节点自身配置里 

### 顶层示例

```yaml
nodes:
  input_node_1:
    type: input
    position:
      x: -807.53
      y: -226.20
    outputs:
      - name: result
        stateKey: state_topic
    comment: 测试主题输入
    inputKey: topic
    defaultValue: ''

  prompt_node_1:
    type: prompt
    position:
      x: -1520.72
      y: -31.43
    outputs:
      - name: title
        stateKey: state_title
      - name: outline
        stateKey: state_outline
      - name: keywords
        stateKey: state_keywords
    comment: 单节点多输出测试
    promptMode: inline
    prompt: ''
    inlinePrompt: '<脱敏后的 inline prompt>'
    modelResourceId: '1111'
    llm:
      temperature: 0.2
      timeout: 120
      max_retries: 2

  output_node_1:
    type: output
    position:
      x: 163.09
      y: 1048.78
    outputs:
      - name: result
        stateKey: final_payload
    comment: 聚合多输出结果

  prompt_node_2:
    type: prompt
    position:
      x: -997.5
      y: -67.5
    outputs:
      - name: result
        stateKey: out_prompt_node_2
    promptMode: inline
    prompt: ''
    inlinePrompt: '{a1}'
    modelResourceId: '1111'
    llm:
      temperature: 0.2
      timeout: 120
      max_retries: 2

edges:
  - source: prompt_node_1
    sourceOutput: title
    target: output_node_1
    targetInput: title
  - source: prompt_node_1
    sourceOutput: outline
    target: output_node_1
    targetInput: outline
  - source: prompt_node_1
    sourceOutput: keywords
    target: output_node_1
    targetInput: keywords
  - source: input_node_1
    sourceOutput: result
    target: prompt_node_1
    targetInput: topic_text
  - source: input_node_1
    sourceOutput: result
    target: prompt_node_2
    targetInput: a1

contextLinks:
  - id: ctx-1774859409967-gpu6aj
    source: prompt_node_1
    target: prompt_node_2
    mode: continue
```



### input 节点示例

```yaml
input_node_1:
  type: input
  position:
    x: -807.53
    y: -226.20
  outputs:
    - name: result
      stateKey: state_topic
  comment: 测试主题输入
  inputKey: topic
  defaultValue: ''
```

**关键点**：

* `inputKey` 表示 direct run 请求里的输入 key
* `outputs[0].stateKey` 表示该 input 节点把值发布到 workflow state 时使用的 key
* 这两个字段已经正式分层，不能再视为同一个概念

对应语义是：

* `inputKey = topic`：请求输入从 `request.state.topic` 读取
* `stateKey = state_topic`：输入节点成功执行后，把结果发布到 `state_topic` 

### 多输出 prompt 节点示例

```yaml
prompt_node_1:
  type: prompt
  position:
    x: -1520.72
    y: -31.43
  outputs:
    - name: title
      stateKey: state_title
    - name: outline
      stateKey: state_outline
    - name: keywords
      stateKey: state_keywords
  comment: 单节点多输出测试
  promptMode: inline
  prompt: ''
  inlinePrompt: '<脱敏后的 inline prompt>'
  modelResourceId: '1111'
  llm:
    temperature: 0.2
    timeout: 120
    max_retries: 2
```

**关键点**：

* 模型选择只由 `modelResourceId` 显式表达
* `llm` 只承载运行参数，不承载模型身份
* 在这个样本里，`promptMode = inline`，所以 `inlinePrompt` 有内容，`prompt` 为空字符串
* 这是一个多输出 prompt 节点，声明了 `title`、`outline`、`keywords` 三个 outputs

这意味着运行时输出 contract 不是“任意文本都行”，而是必须产出一个 key 集合与 `outputs.name` 完全一致的 JSON object。也就是说，这个节点的多输出保存态 shape，直接约束了运行时 structured output 的要求。

### output 节点示例

```yaml
output_node_1:
  type: output
  position:
    x: 163.09
    y: 1048.78
  outputs:
    - name: result
      stateKey: final_payload
  comment: 聚合多输出结果
```

**关键点**：

* 从持久化命名上它仍然叫 `output`
* 从当前用法上看，它的行为已经非常接近 `aggregate`
* 它通过多条 inbound data edges 接收多个 `targetInput`
* 当前样本里接了 `title`、`outline`、`keywords`
* 然后把这些结构化输入聚合为一个对象输出

因此文档里需要明确提醒：当前 Output 节点的使用方式已经接近 `aggregate`，只是 canonical type 命名仍保留 `output`。

### edges：只表达数据绑定

示例：

```yaml
- source: prompt_node_1
  sourceOutput: title
  target: output_node_1
  targetInput: title
```

**正式口径**：

* `edges` 只表达结构化数据绑定
* 不表达 prompt window 继承关系
* 不表达 `continue / branch`

它表达的是：`prompt_node_1` 的 output port `title`，绑定到 `output_node_1` 的 runtime input `title`。

### contextLinks：只表达窗口关系

示例：

```yaml
- id: ctx-1774859409967-gpu6aj
  source: prompt_node_1
  target: prompt_node_2
  mode: continue
```

**正式口径**：

* `contextLinks` 只表达 prompt window 继承 / 分支关系
* 不参与结构化输入绑定
* `mode` 只有 `continue` 和 `branch`
* `new_window` 不作为保存态字段存在；它只在运行时或展示时，由“没有 inbound context link”推导出来

这个样本表达的是：`prompt_node_2` 的 prompt window 关系来自 `prompt_node_1`，模式是 `continue`。

## 文件二：metadata.yaml

**文件路径**：`workflows/<canvas_id>/metadata.yaml`
**文件角色**：canvas 展示壳，只承载最小展示信息。
**为什么要读**：当问题落在 label、页面展示名、workflow 是否存在由什么决定时，读这个文件。

### 最小样本

```yaml
label: article
```



### 当前角色

`metadata.yaml` 的作用非常克制：

* 只承载展示壳信息
* 最典型字段就是 `label`

例如：

```yaml
label: article
```

它的语义是：页面在 canvas list 或相关 UI 中展示这个 workflow 时，可以使用 `article` 作为展示名。

### 为什么它不是 workflow 存在性事实源

这一点必须明确：

* 当前 workflow loader 的规则是：只有目录 `workflows/<canvas_id>/` 下存在 `workflow.yaml`，这个 canvas 才算正式存在
* `metadata.yaml` 可以不存在
* 即使不存在，也不会否定 workflow 的存在
* 若缺失，系统可以回退用 `canvas_id` 作为 label

所以，`metadata.yaml` 当前只是展示壳，不是 workflow 是否存在的事实源。

### 为什么这个最小样本有代表性

这个样本只有一行，但它恰好说明：

* `metadata.yaml` 还没有承担复杂职责
* 它不是 workflow contract 的一部分
* 它不是运行链的一部分
* 它只是一个最小 YAML 壳，用来提供 `label` 等展示辅助信息 

## 文件三：model_resources.json

**文件路径**：`config/model_resources.json`
**文件角色**：共享 model resource 配置事实源。
**为什么要读**：当问题落在 `modelResourceId` 引用到哪里、共享模型资源配置长什么样、哪些字段属于连接配置时，读这个文件。

### 样本

```json
{
  "1": {
    "provider": "openai_compatible",
    "model": "deepseek-chat",
    "api_key": "<脱敏后的 key>",
    "base_url": "https://api.deepseek.com/v1"
  },
  "1111": {
    "provider": "openai_compatible",
    "model": "1111111111",
    "api_key": "<脱敏后的 key>",
    "base_url": "https://api.deepseek.com/v1"
  }
}
```



### 顶层与字段

当前顶层必须是 JSON object，其中每个 key 都是一个 `resource_id`，例如：

* `"1"`
* `"1111"`

这些 id 会被 prompt 节点的 `modelResourceId` 引用。

当前每条资源配置包含：

* `provider`
* `model`
* `api_key`
* `base_url`

这些字段共同定义一个共享 model resource record。

### 文档示例必须脱敏

`api_key` 当前属于管理链和配置事实源的一部分，但文档示例必须脱敏。示例中应统一写成：

* `"<脱敏后的 key>"`
* 或 `sk-****`

不能直接放真实值。

## 重点解释块

### 1. inputKey 和 stateKey 不要混淆

以 input 节点为例：

* `inputKey = topic`
* `outputs[0].stateKey = state_topic`

这两个字段是两层不同语义：

* `inputKey` 面向 direct run request input
* `stateKey` 面向 workflow blackboard / published state 

### 2. prompt 多输出会约束运行时输出 contract

多输出 prompt 节点的 `outputs` 不是纯展示字段。它会直接约束运行时 structured output contract。

例如样本中的：

* `title`
* `outline`
* `keywords`

意味着运行时返回值必须是对象，并且 key 集合必须与这些 `output names` 完全一致。

### 3. output 节点当前使用方式已接近 aggregate

虽然保存态里节点 `type` 仍写作 `output`，但从当前真实样本看，它已经在做：

* 多输入聚合
* 输出对象化结果

因此文档里要明确提醒维护者：当前 Output 节点的行为语义已经接近 `aggregate`，只是持久化命名和 canonical type 迁移还未完全完成。

### 4. contextLinks: [] 不代表没有窗口语义

如果某个 workflow 的 `contextLinks` 是空列表，不能解释成“这个 workflow 没有 prompt window 语义”。正确解释是：

* 这些 prompt 节点没有显式 inbound context link
* 因此在运行时 / 展示时，它们会被视为 `new_window`

也就是说：

* `contextLinks: []` 不等于“没有窗口语义”
* 它等于“窗口语义通过缺失 inbound link 推导为 `new_window`” 

### 5. modelResourceId 只是引用，不是内联连接配置

在 `workflow.yaml` 里，prompt 节点只保存：

```yaml
modelResourceId: '1111'
```

它不保存：

* `provider`
* `model`
* `api_key`
* `base_url`

这些连接信息来自共享配置文件 `config/model_resources.json`。也就是说，workflow 保存态只保存对共享模型资源的引用，不内联完整连接配置。


## 一句话总结

当前正式持久化文件可以概括成三类：`workflow.yaml` 是正式 workflow 保存态事实源，`metadata.yaml` 是最小展示壳，`model_resources.json` 是共享 model resource 配置事实源；其中最重要的理解点是，`nodes / edges / contextLinks` 是 workflow 保存态正式顶层 shape，`edges` 只表达数据绑定，`contextLinks` 只表达 prompt window 关系，`new_window` 不进保存态，`modelResourceId` 只是共享资源引用。
