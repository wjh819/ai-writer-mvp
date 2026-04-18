import type { ModelResourceProvider } from '../../model-resources/modelResourceTypes'

interface CreateResourceFormProps {
    draftResourceId: string
    draftProvider: ModelResourceProvider
    draftProviderModel: string
    draftApiKey: string
    draftBaseUrl: string
    isCreating: boolean
    createErrorMessage: string
    onDraftResourceIdChange: (value: string) => void
    onDraftProviderChange: (value: ModelResourceProvider) => void
    onDraftProviderModelChange: (value: string) => void
    onDraftApiKeyChange: (value: string) => void
    onDraftBaseUrlChange: (value: string) => void
    onCreate: () => void
}

export default function CreateResourceForm({
                                               draftResourceId,
                                               draftProvider,
                                               draftProviderModel,
                                               draftApiKey,
                                               draftBaseUrl,
                                               isCreating,
                                               createErrorMessage,
                                               onDraftResourceIdChange,
                                               onDraftProviderChange,
                                               onDraftProviderModelChange,
                                               onDraftApiKeyChange,
                                               onDraftBaseUrlChange,
                                               onCreate,
                                           }: CreateResourceFormProps) {
    return (
        <div
            style={{
                marginBottom: 16,
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                新建模型资源
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    资源 ID
                </label>
                <input
                    value={draftResourceId}
                    onChange={e => onDraftResourceIdChange(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder='例如：writer-fast'
                    disabled={isCreating}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    提供方
                </label>
                <select
                    value={draftProvider}
                    onChange={e =>
                        onDraftProviderChange(e.target.value as ModelResourceProvider)
                    }
                    style={{ width: '100%' }}
                    disabled={isCreating}
                >
                    <option value='openai_compatible'>OpenAI 兼容</option>
                </select>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    提供方模型
                </label>
                <input
                    value={draftProviderModel}
                    onChange={e => onDraftProviderModelChange(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder='例如：deepseek-chat'
                    disabled={isCreating}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    API Key
                </label>
                <input
                    type='password'
                    value={draftApiKey}
                    onChange={e => onDraftApiKeyChange(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder='例如：sk-xxxx'
                    disabled={isCreating}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    基础 URL
                </label>
                <input
                    value={draftBaseUrl}
                    onChange={e => onDraftBaseUrlChange(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder='例如：https://api.deepseek.com/v1'
                    disabled={isCreating}
                />
            </div>

            {createErrorMessage ? (
                <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>
                    {createErrorMessage}
                </div>
            ) : null}

            <button type='button' onClick={onCreate} disabled={isCreating}>
                {isCreating ? '创建中...' : '创建资源'}
            </button>
        </div>
    )
}
