import type {
    ModelResourceDeleteBlockedDetail,
    ModelResourceListItem,
    ModelResourceProvider,
} from '../../model-resources/modelResourceTypes'
import DeleteBlockedDetail from './DeleteBlockedDetail'
import EditResourceForm from './EditResourceForm'

interface ModelResourceListProps {
    resources: ModelResourceListItem[]
    editingResourceId: string
    draftEditProvider: ModelResourceProvider
    draftEditProviderModel: string
    draftEditApiKey: string
    draftEditBaseUrl: string
    editErrorMessage: string
    isUpdating: boolean
    isCreating: boolean
    deletingResourceId: string
    deleteErrorResourceId: string
    deleteErrorMessage: string
    deleteBlockedDetail: ModelResourceDeleteBlockedDetail | null
    onStartEdit: (resource: ModelResourceListItem) => void
    onCancelEdit: () => void
    onDraftEditProviderChange: (value: ModelResourceProvider) => void
    onDraftEditProviderModelChange: (value: string) => void
    onDraftEditApiKeyChange: (value: string) => void
    onDraftEditBaseUrlChange: (value: string) => void
    onUpdateResource: (resourceId: string) => void
    onDeleteResource: (resourceId: string) => void
}

function maskApiKey(value: string) {
    if (!value) {
        return '(empty)'
    }
    if (value.length <= 8) {
        return '••••••••'
    }
    return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function getProviderLabel(provider: ModelResourceProvider) {
    switch (provider) {
        case 'openai_compatible':
            return 'OpenAI Compatible'
        default:
            return provider
    }
}

export default function ModelResourceList({
                                              resources,
                                              editingResourceId,
                                              draftEditProvider,
                                              draftEditProviderModel,
                                              draftEditApiKey,
                                              draftEditBaseUrl,
                                              editErrorMessage,
                                              isUpdating,
                                              isCreating,
                                              deletingResourceId,
                                              deleteErrorResourceId,
                                              deleteErrorMessage,
                                              deleteBlockedDetail,
                                              onStartEdit,
                                              onCancelEdit,
                                              onDraftEditProviderChange,
                                              onDraftEditProviderModelChange,
                                              onDraftEditApiKeyChange,
                                              onDraftEditBaseUrlChange,
                                              onUpdateResource,
                                              onDeleteResource,
                                          }: ModelResourceListProps) {
    if (resources.length === 0) {
        return <div style={{ color: '#666', fontSize: 13 }}>No model resources found</div>
    }

    return (
        <>
            {resources.map(resource => {
                const isEditing = editingResourceId === resource.id
                const showDeleteError = deleteErrorResourceId === resource.id

                return (
                    <div
                        key={resource.id}
                        style={{
                            marginBottom: 12,
                            padding: 16,
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            background: '#fff',
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                            {resource.id}
                        </div>

                        {isEditing ? (
                            <EditResourceForm
                                resource={resource}
                                draftEditProvider={draftEditProvider}
                                draftEditProviderModel={draftEditProviderModel}
                                draftEditApiKey={draftEditApiKey}
                                draftEditBaseUrl={draftEditBaseUrl}
                                editErrorMessage={editErrorMessage}
                                isUpdating={isUpdating}
                                onDraftEditProviderChange={onDraftEditProviderChange}
                                onDraftEditProviderModelChange={onDraftEditProviderModelChange}
                                onDraftEditApiKeyChange={onDraftEditApiKeyChange}
                                onDraftEditBaseUrlChange={onDraftEditBaseUrlChange}
                                onSave={onUpdateResource}
                                onCancel={onCancelEdit}
                            />
                        ) : (
                            <>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#475569',
                                        wordBreak: 'break-all',
                                        marginBottom: 6,
                                    }}
                                >
                                    <strong>Provider:</strong> {getProviderLabel(resource.provider)}
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#475569',
                                        wordBreak: 'break-all',
                                        marginBottom: 6,
                                    }}
                                >
                                    <strong>Model:</strong> {resource.model}
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#475569',
                                        wordBreak: 'break-all',
                                        marginBottom: 6,
                                    }}
                                >
                                    <strong>Base URL:</strong> {resource.base_url}
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#475569',
                                        wordBreak: 'break-all',
                                        marginBottom: 10,
                                    }}
                                >
                                    <strong>API Key:</strong> {maskApiKey(resource.api_key)}
                                </div>

                                {showDeleteError ? (
                                    <DeleteBlockedDetail
                                        deleteErrorMessage={deleteErrorMessage}
                                        deleteBlockedDetail={deleteBlockedDetail}
                                    />
                                ) : null}

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type='button'
                                        onClick={() => onStartEdit(resource)}
                                        disabled={isUpdating || isCreating || !!deletingResourceId}
                                    >
                                        Edit Resource
                                    </button>

                                    <button
                                        type='button'
                                        onClick={() => onDeleteResource(resource.id)}
                                        disabled={isUpdating || isCreating || !!deletingResourceId}
                                    >
                                        {deletingResourceId === resource.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )
            })}
        </>
    )
}