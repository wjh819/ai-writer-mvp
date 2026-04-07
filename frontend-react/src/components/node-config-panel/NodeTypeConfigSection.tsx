import type { ModelResourceListItem } from '../../model-resources/modelResourceTypes'
import type {
    GraphWindowMode,
    InboundBindingDisplayItem,
} from '../../workflow-editor/workflowEditorGraphTypes'
import type {
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
} from '../../workflow-editor/workflowEditorTypes'
import InputNodeConfigForm from '../node-config/InputNodeConfig'
import OutputNodeConfigForm from '../node-config/OutputNodeConfig'
import PromptNodeConfigForm from '../node-config/PromptNodeConfig'

interface NodeTypeConfigSectionProps {
    config: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
    prompts: string[]
    modelResources: ModelResourceListItem[]
    derivedTargetInputs: string[]
    inboundBindings: InboundBindingDisplayItem[]
    promptVariableHints: string[]
    graphWindowMode?: GraphWindowMode
    graphWindowSourceNodeId?: string | null
    graphWindowTargetNodeIds: string[]
    onConfigChange: (
        nextConfig: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
    ) => void
}

export default function NodeTypeConfigSection({
                                                  config,
                                                  prompts,
                                                  modelResources,
                                                  derivedTargetInputs,
                                                  inboundBindings,
                                                  promptVariableHints,
                                                  graphWindowMode,
                                                  graphWindowSourceNodeId,
                                                  graphWindowTargetNodeIds,
                                                  onConfigChange,
                                              }: NodeTypeConfigSectionProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            {config.type === 'input' ? (
                <InputNodeConfigForm
                    config={config}
                    onConfigChange={nextConfig => onConfigChange(nextConfig)}
                />
            ) : config.type === 'prompt' ? (
                <PromptNodeConfigForm
                    config={config}
                    prompts={prompts}
                    modelResources={modelResources}
                    derivedTargetInputs={derivedTargetInputs}
                    inboundBindings={inboundBindings}
                    promptVariableHints={promptVariableHints}
                    graphWindowMode={graphWindowMode}
                    graphWindowSourceNodeId={graphWindowSourceNodeId}
                    graphWindowTargetNodeIds={graphWindowTargetNodeIds}
                    onConfigChange={nextConfig => onConfigChange(nextConfig)}
                />
            ) : (
                <OutputNodeConfigForm derivedTargetInputs={derivedTargetInputs} />
            )}
        </div>
    )
}