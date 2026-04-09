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
    disabled?: boolean
}

export default function NodeTypeConfigSection({
    config,
    modelResources,
    derivedTargetInputs,
    inboundBindings,
    promptVariableHints,
    graphWindowMode,
    graphWindowSourceNodeId,
    graphWindowTargetNodeIds,
    onConfigChange,
    disabled = false,
}: NodeTypeConfigSectionProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            {config.type === 'input' ? (
                <InputNodeConfigForm
                    config={config}
                    onConfigChange={nextConfig => onConfigChange(nextConfig)}
                    disabled={disabled}
                />
            ) : config.type === 'prompt' ? (
                <PromptNodeConfigForm
                    config={config}
                    modelResources={modelResources}
                    derivedTargetInputs={derivedTargetInputs}
                    inboundBindings={inboundBindings}
                    promptVariableHints={promptVariableHints}
                    graphWindowMode={graphWindowMode}
                    graphWindowSourceNodeId={graphWindowSourceNodeId}
                    graphWindowTargetNodeIds={graphWindowTargetNodeIds}
                    onConfigChange={nextConfig => onConfigChange(nextConfig)}
                    disabled={disabled}
                />
            ) : (
                <OutputNodeConfigForm
                    derivedTargetInputs={derivedTargetInputs}
                    disabled={disabled}
                />
            )}
        </div>
    )
}