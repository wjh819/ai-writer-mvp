import type { WorkflowEditorNode } from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowState } from '../../shared/workflowSharedTypes'

interface RunInputsSectionProps {
    inputNodes: WorkflowEditorNode[]
    runInputs: WorkflowState
    onRunInputChange: (key: string, value: string) => void
    getRunInputKey: (node: WorkflowEditorNode) => string
    isGraphEditingLocked: boolean
}

export default function RunInputsSection({
    inputNodes,
    runInputs,
    onRunInputChange,
    getRunInputKey,
    isGraphEditingLocked,
}: RunInputsSectionProps) {
    return (
        <>
            <h4 style={{ marginTop: 0 }}>Run Inputs</h4>

            {isGraphEditingLocked ? (
                <div
                    style={{
                        marginBottom: 12,
                        fontSize: 12,
                        color: '#92400e',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    Live run in progress. Run inputs are temporarily locked.
                </div>
            ) : null}

            {inputNodes.length === 0 ? (
                <div style={{ color: '#666', fontSize: 13 }}>No input nodes found</div>
            ) : (
                inputNodes.map(node => {
                    const key = getRunInputKey(node)

                    return (
                        <div key={node.id} style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', marginBottom: 4 }}>{key}</label>
                            <input
                                value={String(runInputs[key] ?? '')}
                                onChange={e => onRunInputChange(key, e.target.value)}
                                style={{ width: '100%' }}
                                disabled={isGraphEditingLocked}
                            />
                        </div>
                    )
                })
            )}
        </>
    )
}