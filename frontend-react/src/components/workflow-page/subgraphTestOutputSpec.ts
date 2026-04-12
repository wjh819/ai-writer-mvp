import { buildNextPromptOutputSpec } from '../../workflow-editor/domain/workflowEditorHelpers'
import type { WorkflowEditorNode } from '../../workflow-editor/workflowEditorGraphTypes'

export function buildNextOutputSpec(
  nodeId: string,
  config: WorkflowEditorNode['data']['config']
) {
  if (config.type === 'prompt') {
    return buildNextPromptOutputSpec(nodeId, config.outputs)
  }

  const nextIndex = (config.outputs || []).length + 1
  return {
    name: nextIndex === 1 ? 'result' : `result_${nextIndex}`,
    stateKey: `out_${nodeId}_${nextIndex}`,
  }
}
