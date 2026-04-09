import { buildNextPromptOutputSpec } from '../../workflow-editor/domain/workflowEditorHelpers'
import type {
    InputNodeConfig,
    NodeOutputSpec,
    OutputNodeConfig,
    PromptNodeConfig,
} from '../../workflow-editor/workflowEditorTypes'

interface NodeOutputsEditorProps {
    nodeId: string
    config: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
    onConfigChange: (
        nextConfig: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
    ) => void
    disabled?: boolean
}

function buildNextOutputSpec(
    nodeId: string,
    config: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
): NodeOutputSpec {
    if (config.type === 'prompt') {
        return buildNextPromptOutputSpec(nodeId, config.outputs)
    }

    const nextIndex = (config.outputs || []).length + 1

    return {
        name: nextIndex === 1 ? 'result' : `result_${nextIndex}`,
        stateKey: `out_${nodeId}_${nextIndex}`,
    }
}

export default function NodeOutputsEditor({
    nodeId,
    config,
    onConfigChange,
    disabled = false,
}: NodeOutputsEditorProps) {
    function updateOutput(index: number, patch: Partial<NodeOutputSpec>) {
        if (disabled) {
            return
        }

        const nextOutputs = (config.outputs || []).map((output, outputIndex) =>
            outputIndex === index
                ? {
                      ...output,
                      ...patch,
                  }
                : output
        )

        onConfigChange({
            ...config,
            outputs: nextOutputs,
        })
    }

    function addOutput() {
        if (disabled) {
            return
        }

        const nextOutput = buildNextOutputSpec(nodeId, config)

        onConfigChange({
            ...config,
            outputs: [...(config.outputs || []), nextOutput],
        })
    }

    function removeOutput(index: number) {
        if (disabled) {
            return
        }

        if ((config.outputs || []).length <= 1) {
            return
        }

        onConfigChange({
            ...config,
            outputs: (config.outputs || []).filter(
                (_, outputIndex) => outputIndex !== index
            ),
        })
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>Outputs</label>

            {(config.outputs || []).map((output, index) => (
                <div
                    key={`${nodeId}-output-${index}`}
                    style={{
                        marginBottom: 8,
                        padding: 10,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: disabled ? '#f8fafc' : '#fff',
                    }}
                >
                    <div style={{ marginBottom: 8 }}>
                        <label
                            style={{ display: 'block', marginBottom: 4, fontSize: 12 }}
                        >
                            Output Name
                        </label>
                        <input
                            value={output.name}
                            onChange={e => updateOutput(index, { name: e.target.value })}
                            style={{ width: '100%' }}
                            disabled={disabled}
                        />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                        <label
                            style={{ display: 'block', marginBottom: 4, fontSize: 12 }}
                        >
                            State Key
                        </label>
                        <input
                            value={output.stateKey}
                            onChange={e =>
                                updateOutput(index, { stateKey: e.target.value })
                            }
                            style={{ width: '100%' }}
                            disabled={disabled}
                        />
                    </div>

                    <button
                        type='button'
                        onClick={() => removeOutput(index)}
                        disabled={disabled || (config.outputs || []).length <= 1}
                    >
                        Remove Output
                    </button>
                </div>
            ))}

            <button type='button' onClick={addOutput} disabled={disabled}>
                Add Output
            </button>
        </div>
    )
}