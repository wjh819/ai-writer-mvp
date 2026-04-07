import type {
  InputNodeConfig,
  NodeOutputSpec,
  OutputNodeConfig,
  PromptNodeConfig,
  WorkflowNodeConfig,
} from '../workflowEditorTypes'

function isSameOutputs(
// outputs 顺序当前计入 semantic equality。
// 若未来决定“同集合不同顺序不算语义变化”，这里是 owner 改点。
  previousOutputs: NodeOutputSpec[],
  nextOutputs: NodeOutputSpec[]
): boolean {
  if (previousOutputs.length !== nextOutputs.length) {
    return false
  }

  return previousOutputs.every((output, index) => {
    const nextOutput = nextOutputs[index]
    return (
      output.name === nextOutput?.name &&
      output.stateKey === nextOutput?.stateKey
    )
  })
}

function isSameInputSemantic(
  previousConfig: InputNodeConfig,
  nextConfig: InputNodeConfig
): boolean {
  return (
    previousConfig.inputKey === nextConfig.inputKey &&
    previousConfig.defaultValue === nextConfig.defaultValue &&
    isSameOutputs(previousConfig.outputs, nextConfig.outputs)
  )
}

function isSamePromptSemantic(
  previousConfig: PromptNodeConfig,
  nextConfig: PromptNodeConfig
): boolean {
  return (
    previousConfig.promptMode === nextConfig.promptMode &&
    previousConfig.prompt === nextConfig.prompt &&
    previousConfig.inlinePrompt === nextConfig.inlinePrompt &&
    previousConfig.modelResourceId === nextConfig.modelResourceId &&
    previousConfig.llm.temperature === nextConfig.llm.temperature &&
    previousConfig.llm.timeout === nextConfig.llm.timeout &&
    previousConfig.llm.max_retries === nextConfig.llm.max_retries &&
    isSameOutputs(previousConfig.outputs, nextConfig.outputs)
  )
}

function isSameOutputSemantic(
  previousConfig: OutputNodeConfig,
  nextConfig: OutputNodeConfig
): boolean {
  return isSameOutputs(previousConfig.outputs, nextConfig.outputs)
}

/**
 * 比较两个节点 config 是否语义等价。
 *
 * 正式规则：
 * - comment 不计入 semantic version
 * - input.inputKey 计入 semantic version
 * - input.defaultValue 计入 semantic version
 * - outputs[] 计入 semantic version
 * - 节点类型不同，必定视为语义变化
 */
export function isSameSemanticNodeConfig(
  previousConfig: WorkflowNodeConfig,
  nextConfig: WorkflowNodeConfig
): boolean {
  if (previousConfig.type !== nextConfig.type) {
    return false
  }

  if (previousConfig.type === 'input' && nextConfig.type === 'input') {
    return isSameInputSemantic(previousConfig, nextConfig)
  }

  if (previousConfig.type === 'prompt' && nextConfig.type === 'prompt') {
    return isSamePromptSemantic(previousConfig, nextConfig)
  }

  if (previousConfig.type === 'output' && nextConfig.type === 'output') {
    return isSameOutputSemantic(previousConfig, nextConfig)
  }

  return false
}