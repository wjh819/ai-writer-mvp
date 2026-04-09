import type { ModelResourceListItem } from '../model-resources/modelResourceTypes'
import type {
    GraphWindowMode,
    InboundBindingDisplayItem,
    WorkflowEditorNode,
} from '../workflow-editor/workflowEditorGraphTypes'
import type {
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
} from '../workflow-editor/workflowEditorTypes'
import type { DisplayRun } from './run/runDisplayModels'
import type { EffectiveSubgraphTestInputItem } from '../workflow-editor/state/workflowEditorSubgraphTestInputs'

import NodeConfigSection from './node-config-panel/NodeConfigSection'
import NodeOutputsEditor from './node-config-panel/NodeOutputsEditor'
import NodeTypeConfigSection from './node-config-panel/NodeTypeConfigSection'
import NodeTestInputSection from './node-config-panel/NodeTestInputSection'
import NodeTestResultSection from './node-config-panel/NodeTestResultSection'
import NodeTestRawJsonSection from './node-config-panel/NodeTestRawJsonSection'

interface NodeConfigPanelProps {
    node: WorkflowEditorNode | null
    derivedTargetInputs: string[]
    inboundBindings: InboundBindingDisplayItem[]
    promptVariableHints: string[]
    graphWindowMode?: GraphWindowMode
    graphWindowSourceNodeId?: string | null
    graphWindowTargetNodeIds: string[]
    isSubgraphTestRunning: boolean

    isGraphEditingLocked: boolean
    isNodeTestLocked: boolean

    onChange: (node: WorkflowEditorNode) => void
    onDelete: (nodeId: string) => void
    prompts: string[]
    modelResources: ModelResourceListItem[]

    pinnedInputDraftTexts: Record<string, string>
    onPinnedInputDraftChange: (
        nodeId: string,
        targetInput: string,
        nextValue: string
    ) => void

    isSubgraphTestExpanded: boolean
    onSetSubgraphTestExpanded: (nextValue: boolean) => void

    effectiveSubgraphTestInputItems: EffectiveSubgraphTestInputItem[]
    onRunSubgraphTest: () => void
    onClearSubgraphTestResult: () => void
    onResetSubgraphTestContext: () => void

    selectedSubgraphTestDisplayRun: DisplayRun | null
    subgraphTestErrorMessage: string
    subgraphTestInfoMessage: string
}

export default function NodeConfigPanel({
    node,
    derivedTargetInputs,
    inboundBindings,
    promptVariableHints,
    graphWindowMode,
    graphWindowSourceNodeId,
    graphWindowTargetNodeIds,
    isSubgraphTestRunning,

    isGraphEditingLocked,
    isNodeTestLocked,

    onChange,
    onDelete,
    prompts,
    modelResources,

    pinnedInputDraftTexts,
    onPinnedInputDraftChange,

    isSubgraphTestExpanded,
    onSetSubgraphTestExpanded,

    effectiveSubgraphTestInputItems,
    onRunSubgraphTest,
    onClearSubgraphTestResult,
    onResetSubgraphTestContext,

    selectedSubgraphTestDisplayRun,
    subgraphTestErrorMessage,
    subgraphTestInfoMessage,
}: NodeConfigPanelProps) {
    if (!node) {
        return (
            <div style={{ padding: 16, color: '#666', fontSize: 13 }}>
                No node selected
            </div>
        )
    }

    const selectedNode = node
    const config = selectedNode.data.config

    function updateNode(
        nextConfig: InputNodeConfig | PromptNodeConfig | OutputNodeConfig
    ) {
        if (isGraphEditingLocked) {
            return
        }

        onChange({
            ...selectedNode,
            data: {
                ...selectedNode.data,
                config: nextConfig,
            },
        })
    }

    function handleCommentChange(value: string) {
        updateNode({
            ...config,
            comment: value,
        })
    }

    function handleInputKeyChange(value: string) {
        if (config.type !== 'input') {
            return
        }

        updateNode({
            ...config,
            inputKey: value,
        })
    }

    return (
        <div style={{ padding: 16 }}>
            <div
                style={{
                    marginBottom: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    background: '#fff',
                    padding: 12,
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Node Config</div>

                {isGraphEditingLocked ? (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: 10,
                            borderRadius: 8,
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: 12,
                        }}
                    >
                        Live run is active. Node config editing is locked.
                    </div>
                ) : null}

                <NodeConfigSection
                    nodeId={selectedNode.id}
                    configType={config.type}
                    inputKey={config.type === 'input' ? config.inputKey : undefined}
                    comment={config.comment || ''}
                    onInputKeyChange={
                        config.type === 'input' ? handleInputKeyChange : undefined
                    }
                    onCommentChange={handleCommentChange}
                    onDelete={onDelete}
                    disabled={isGraphEditingLocked}
                />

                <NodeOutputsEditor
                    nodeId={selectedNode.id}
                    config={config}
                    onConfigChange={updateNode}
                    disabled={isGraphEditingLocked}
                />

                <NodeTypeConfigSection
                    config={config}
                    prompts={prompts}
                    modelResources={modelResources}
                    derivedTargetInputs={derivedTargetInputs}
                    inboundBindings={inboundBindings}
                    promptVariableHints={promptVariableHints}
                    graphWindowMode={graphWindowMode}
                    graphWindowSourceNodeId={graphWindowSourceNodeId}
                    graphWindowTargetNodeIds={graphWindowTargetNodeIds}
                    onConfigChange={updateNode}
                    disabled={isGraphEditingLocked}
                />
            </div>

            <div
                style={{
                    marginBottom: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    background: '#fff',
                }}
            >
                <button
                    type='button'
                    onClick={() => onSetSubgraphTestExpanded(!isSubgraphTestExpanded)}
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 700,
                    }}
                >
                    Node Test
                    {isSubgraphTestExpanded ? ' ▲' : ' ▼'}
                </button>

                {isSubgraphTestExpanded ? (
                    <div style={{ padding: '0 12px 12px 12px' }}>
                        {isNodeTestLocked ? (
                            <div
                                style={{
                                    marginBottom: 12,
                                    padding: 10,
                                    borderRadius: 8,
                                    border: '1px solid #fde68a',
                                    background: '#fffbeb',
                                    color: '#92400e',
                                    fontSize: 12,
                                }}
                            >
                                Node test is disabled while a full live run is active.
                            </div>
                        ) : (
                            <>
                                <NodeTestInputSection
                                    nodeId={selectedNode.id}
                                    effectiveSubgraphTestInputItems={
                                        effectiveSubgraphTestInputItems
                                    }
                                    pinnedInputDraftTexts={pinnedInputDraftTexts}
                                    onPinnedInputDraftChange={onPinnedInputDraftChange}
                                />

                                <NodeTestResultSection
                                    isSubgraphTestRunning={isSubgraphTestRunning}
                                    selectedSubgraphTestDisplayRun={
                                        selectedSubgraphTestDisplayRun
                                    }
                                    subgraphTestErrorMessage={subgraphTestErrorMessage}
                                    subgraphTestInfoMessage={subgraphTestInfoMessage}
                                    onRunSubgraphTest={onRunSubgraphTest}
                                    onClearSubgraphTestResult={
                                        onClearSubgraphTestResult
                                    }
                                    onResetSubgraphTestContext={
                                        onResetSubgraphTestContext
                                    }
                                />
                            </>
                        )}

                        {selectedSubgraphTestDisplayRun ? (
                            <NodeTestRawJsonSection
                                displayRun={selectedSubgraphTestDisplayRun}
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    )
}