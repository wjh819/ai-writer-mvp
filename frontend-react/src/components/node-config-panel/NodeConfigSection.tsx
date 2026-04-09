interface NodeConfigSectionProps {
    nodeId: string
    configType: 'input' | 'prompt' | 'output'
    inputKey?: string
    comment?: string
    onInputKeyChange?: (value: string) => void
    onCommentChange: (value: string) => void
    onDelete: (nodeId: string) => void
    disabled?: boolean
}

export default function NodeConfigSection({
    nodeId,
    configType,
    inputKey = '',
    comment = '',
    onInputKeyChange,
    onCommentChange,
    onDelete,
    disabled = false,
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
                        background: '#f8fafc',
                        fontSize: 13,
                        wordBreak: 'break-all',
                        color: '#475569',
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
                        background: '#f8fafc',
                        fontSize: 13,
                        color: '#475569',
                    }}
                >
                    {configType}
                </div>
            </div>

            {configType === 'input' && onInputKeyChange ? (
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>
                        Input Key
                    </label>
                    <input
                        value={inputKey}
                        onChange={e => onInputKeyChange(e.target.value)}
                        style={{ width: '100%' }}
                        disabled={disabled}
                    />
                </div>
            ) : null}

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>
                    Comment
                </label>
                <textarea
                    value={comment}
                    onChange={e => onCommentChange(e.target.value)}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                    disabled={disabled}
                />
            </div>

            <button
                type='button'
                onClick={() => onDelete(nodeId)}
                style={{ color: '#b91c1c' }}
                disabled={disabled}
            >
                Delete Node
            </button>
        </>
    )
}