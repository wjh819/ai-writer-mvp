import type { LLMConfig, NodeOutputSpec } from '../workflowEditorTypes'

/**
 * workflow editor 轻量公共辅助层。
 *
 * 本文件角色：
 * - 为 editor domain 提供可复用的小型辅助规则
 * - 承载 UI 初始值、输出命名等局部公共语义
 *
 * 负责：
 * - prompt 节点 UI 初始 llm 配置
 * - 默认 output / stateKey 命名辅助
 * - 新增 prompt output 时的名称与 stateKey 生成
 *
 * 不负责：
 * - 后端正式默认值
 * - 全图唯一性裁决
 * - 保存前合法性检查
 * - graph 同步
 *
 * 上下游：
 * - 上游由 config / node factory / NodeConfigPanel 等调用
 * - 下游输出局部建议值，供 editor 编辑态使用
 *
 * 当前限制 / 待收口点：
 * - 默认输出命名只保证当前局部追加时可用，不表达全图级唯一性
 * - llm 默认值仅属于前端 UI 初始建议，不应被视为正式运行默认值
 */

/**
 * 获取“新建 prompt 节点 UI 初始态”使用的 llm 默认值。
 *
 * 只负责：
 * - 给前端新建 prompt 节点提供可编辑起点
 *
 * 不负责：
 * - 作为更新链 normalize
 * - 作为后端正式默认值来源
 * - 作为缺失 llm 字段时的兜底修复
 */
export function getDefaultLLMConfig(): LLMConfig {
  return {
    temperature: 0.2,
    timeout: 120,
    max_retries: 2,
  }
}

/**
 * 生成节点首个默认 stateKey 建议值。
 *
 * 注意：
 * - 这是 UI 命名建议，不保证全图唯一性
 * - 最终唯一性以后端 validator 与前端保存前预检为准
 */
export function buildDefaultOutput(nodeId: string): string {
  return `out_${nodeId}`
}

/**
 * 为 prompt 节点追加一个新的 output spec 建议值。
 *
 * 当前策略：
 * - 第一个 output 使用 result / out_<nodeId>
 * - 后续按当前 outputs 长度顺序追加 result_2 / out_<nodeId>_2 ...
 *
 * 不负责：
 * - 填补已删除 output 的编号空洞
 * - 检查全图 stateKey 冲突
 *
 * 当前限制：
 * - 命名策略依赖当前 outputs 顺序与长度，是局部 UI 策略，不是正式唯一命名规则
 * - 当前使用“长度 + 1”的局部命名策略；若中间 output 被删除，不尝试回填编号空洞
 */
export function buildNextPromptOutputSpec(
  nodeId: string,
  outputs: NodeOutputSpec[]
): NodeOutputSpec {
  const nextIndex = (outputs || []).length + 1

  const outputName = nextIndex === 1 ? 'result' : `result_${nextIndex}`
  const stateKey =
    nextIndex === 1
      ? buildDefaultOutput(nodeId)
      : `${buildDefaultOutput(nodeId)}_${nextIndex}`

  return {
    name: outputName,
    stateKey,
  }
}