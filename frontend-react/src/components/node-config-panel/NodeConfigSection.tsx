interface NodeConfigSectionProps {
    nodeId: string
    configType: 'input' | 'prompt' | 'output'
    inputKey?: string
    comment?: string
    onInputKeyChange?: (value: string) => void
    onCommentChange: (value: string) => void
    onDelete: (nodeId: string) => void
}

export default function NodeConfigSection({
                                              nodeId,
                                              configType,
                                              inputKey = '',
                                              comment = '',
                                              onInputKeyChange,
                                              onCommentChange,
                                              onDelete,
                                          }: NodeConfigSectionProps) {
    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    Node ID
                </div>
                <div
                    style={{
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        background: '#fff',
                        fontSize: 13,
                        wordBreak: 'break-all',
                    }}
                >
                    {nodeId}
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    Node Type
                </div>
                <div
                    style={{
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        background: '#fff',
                        fontSize: 13,
                    }}
                >
                    {configType}
                </div>
            </div>

            {configType === 'input' && onInputKeyChange ? (
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>Input Key</label>
                    <input
                        value={inputKey}
                        onChange={e => onInputKeyChange(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
            ) : null}

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Comment</label>
                <textarea
                    value={comment}
                    onChange={e => onCommentChange(e.target.value)}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>

            <button
                type='button'
                onClick={() => onDelete(nodeId)}
                style={{ color: '#b91c1c' }}
            >
                Delete Node
            </button>
        </>
    )
}