import type {
    ModelResourceListItem,
    ModelResourceProvider,
} from '../../model-resources/modelResourceTypes'

interface EditResourceFormProps {
    resource: ModelResourceListItem
    draftEditProvider: ModelResourceProvider
    draftEditProviderModel: string
    draftEditApiKey: string
    draftEditBaseUrl: string
    editErrorMessage: string
    isUpdating: boolean
    onDraftEditProviderChange: (value: ModelResourceProvider) => void
    onDraftEditProviderModelChange: (value: string) => void
    onDraftEditApiKeyChange: (value: string) => void
    onDraftEditBaseUrlChange: (value: string) => void
    onSave: (resourceId: string) => void
    onCancel: () => void
}

export default function EditResourceForm({
                                             resource,
                                             draftEditProvider,
                                             draftEditProviderModel,
                                             draftEditApiKey,
                                             draftEditBaseUrl,
                                             editErrorMessage,
                                             isUpdating,
                                             onDraftEditProviderChange,
                                             onDraftEditProviderModelChange,
                                             onDraftEditApiKeyChange,
                                             onDraftEditBaseUrlChange,
                                             onSave,
                                             onCancel,
                                         }: EditResourceFormProps) {
    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    Provider
                </label>
                <select
                    value={draftEditProvider}
                    onChange={e =>
                        onDraftEditProviderChange(e.target.value as ModelResourceProvider)
                    }
                    style={{ width: '100%' }}
                    disabled={isUpdating}
                >
                    <option value='openai_compatible'>OpenAI Compatible</option>
                </select>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    Provider Model
                </label>
                <input
                    value={draftEditProviderModel}
                    onChange={e => onDraftEditProviderModelChange(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={isUpdating}
                />
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    Replace API Key
                </label>
                <input
                    type='password'
                    value={draftEditApiKey}
                    onChange={e => onDraftEditApiKeyChange(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={isUpdating}
                    placeholder='Leave empty to keep existing key'
                />
                <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                    Keep blank to preserve the current key.
                </div>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    Base URL
                </label>
                <input
                    value={draftEditBaseUrl}
                    onChange={e => onDraftEditBaseUrlChange(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={isUpdating}
                />
            </div>

            {editErrorMessage ? (
                <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>
                    {editErrorMessage}
                </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    type='button'
                    onClick={() => onSave(resource.id)}
                    disabled={isUpdating}
                >
                    {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button type='button' onClick={onCancel} disabled={isUpdating}>
                    Cancel
                </button>
            </div>
        </>
    )
}