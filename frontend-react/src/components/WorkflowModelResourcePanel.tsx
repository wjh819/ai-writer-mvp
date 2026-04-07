import { useEffect, useMemo, useState } from 'react'

import {
    createModelResource,
    deleteModelResource,
    getModelResourcesStatus,
    updateModelResource,
} from '../api'

import type {
    ModelResourceConfigHealth,
    ModelResourceDeleteBlockedDetail,
    ModelResourceListItem,
    ModelResourceProvider,
} from '../model-resources/modelResourceTypes'

import CreateResourceForm from './model-resource-panel/CreateResourceForm'
import ModelResourceList from './model-resource-panel/ModelResourceList'
import ModelResourcePanelShell from './model-resource-panel/ModelResourcePanelShell'
import ModelResourceStatusCard from './model-resource-panel/ModelResourceStatusCard'
import {
    extractDeleteBlockedDetail,
    extractErrorMessage,
} from './model-resource-panel/modelResourcePanelErrors'

interface WorkflowModelResourcePanelProps {
    modelResources: ModelResourceListItem[]
    onClose: () => void
    onResourcesChanged: () => Promise<void> | void
}

const DEFAULT_PROVIDER: ModelResourceProvider = 'openai_compatible'
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'

export default function WorkflowModelResourcePanel({
                                                       modelResources,
                                                       onClose,
                                                       onResourcesChanged,
                                                   }: WorkflowModelResourcePanelProps) {
    const [modelResourceStatus, setModelResourceStatus] =
        useState<ModelResourceConfigHealth | null>(null)
    const [statusErrorMessage, setStatusErrorMessage] = useState('')

    const [createErrorMessage, setCreateErrorMessage] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [draftResourceId, setDraftResourceId] = useState('')
    const [draftProvider, setDraftProvider] =
        useState<ModelResourceProvider>(DEFAULT_PROVIDER)
    const [draftProviderModel, setDraftProviderModel] = useState('')
    const [draftApiKey, setDraftApiKey] = useState('')
    const [draftBaseUrl, setDraftBaseUrl] = useState(DEFAULT_BASE_URL)

    const [editingResourceId, setEditingResourceId] = useState('')
    const [draftEditProvider, setDraftEditProvider] =
        useState<ModelResourceProvider>(DEFAULT_PROVIDER)
    const [draftEditProviderModel, setDraftEditProviderModel] = useState('')
    const [draftEditApiKey, setDraftEditApiKey] = useState('')
    const [draftEditBaseUrl, setDraftEditBaseUrl] = useState('')
    const [editErrorMessage, setEditErrorMessage] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
    const [deleteBlockedDetail, setDeleteBlockedDetail] =
        useState<ModelResourceDeleteBlockedDetail | null>(null)
    const [deletingResourceId, setDeletingResourceId] = useState('')
    const [deleteErrorResourceId, setDeleteErrorResourceId] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadStatus() {
            try {
                const nextStatus = await getModelResourcesStatus()
                if (!isMounted) {
                    return
                }

                setModelResourceStatus(nextStatus)
                setStatusErrorMessage('')
            } catch {
                if (!isMounted) {
                    return
                }

                setModelResourceStatus(null)
                setStatusErrorMessage('Failed to load model resource status')
            }
        }

        void loadStatus()

        return () => {
            isMounted = false
        }
    }, [])

    const sortedResources = useMemo(() => {
        return [...modelResources].sort((a, b) => a.id.localeCompare(b.id))
    }, [modelResources])

    async function refreshResources() {
        if (typeof onResourcesChanged !== 'function') {
            throw new Error('onResourcesChanged is not defined')
        }

        await onResourcesChanged()
    }

    async function handleCreateResource() {
        const nextId = draftResourceId.trim()
        const nextModel = draftProviderModel.trim()
        const nextApiKey = draftApiKey.trim()
        const nextBaseUrl = draftBaseUrl.trim()

        if (!nextId) {
            setCreateErrorMessage('Resource ID is required')
            return
        }
        if (!nextModel) {
            setCreateErrorMessage('Provider model is required')
            return
        }
        if (!nextApiKey) {
            setCreateErrorMessage('API key is required')
            return
        }
        if (!nextBaseUrl) {
            setCreateErrorMessage('Base URL is required')
            return
        }

        setIsCreating(true)
        setCreateErrorMessage('')

        try {
            await createModelResource({
                id: nextId,
                provider: draftProvider,
                model: nextModel,
                api_key: nextApiKey,
                base_url: nextBaseUrl,
            })

            await refreshResources()
            setDraftResourceId('')
            setDraftProvider(DEFAULT_PROVIDER)
            setDraftProviderModel('')
            setDraftApiKey('')
            setDraftBaseUrl(DEFAULT_BASE_URL)
        } catch (error) {
            setCreateErrorMessage(
                extractErrorMessage(error, 'Failed to create model resource')
            )
        } finally {
            setIsCreating(false)
        }
    }

    function handleStartEdit(resource: ModelResourceListItem) {
        setEditingResourceId(resource.id)
        setDraftEditProvider(resource.provider)
        setDraftEditProviderModel(resource.model)
        setDraftEditApiKey('')
        setDraftEditBaseUrl(resource.base_url)
        setEditErrorMessage('')
    }

    function handleCancelEdit() {
        setEditingResourceId('')
        setDraftEditProvider(DEFAULT_PROVIDER)
        setDraftEditProviderModel('')
        setDraftEditApiKey('')
        setDraftEditBaseUrl('')
        setEditErrorMessage('')
    }

    async function handleUpdateResource(resourceId: string) {
        const nextModel = draftEditProviderModel.trim()
        const nextApiKey = draftEditApiKey.trim()
        const nextBaseUrl = draftEditBaseUrl.trim()

        if (!nextModel) {
            setEditErrorMessage('Provider model is required')
            return
        }
        if (!nextBaseUrl) {
            setEditErrorMessage('Base URL is required')
            return
        }

        setIsUpdating(true)
        setEditErrorMessage('')

        try {
            await updateModelResource({
                id: resourceId,
                provider: draftEditProvider,
                model: nextModel,
                base_url: nextBaseUrl,
                ...(nextApiKey ? { api_key: nextApiKey } : {}),
            })

            await refreshResources()
            setEditingResourceId('')
            setDraftEditProvider(DEFAULT_PROVIDER)
            setDraftEditProviderModel('')
            setDraftEditApiKey('')
            setDraftEditBaseUrl('')
        } catch (error) {
            setEditErrorMessage(
                extractErrorMessage(error, 'Failed to update model resource')
            )
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleDeleteResource(resourceId: string) {
        setDeletingResourceId(resourceId)
        setDeleteErrorResourceId('')
        setDeleteErrorMessage('')
        setDeleteBlockedDetail(null)

        try {
            await deleteModelResource({ id: resourceId })
            await refreshResources()

            if (editingResourceId === resourceId) {
                handleCancelEdit()
            }
        } catch (error) {
            setDeleteErrorResourceId(resourceId)
            setDeleteBlockedDetail(extractDeleteBlockedDetail(error))
            setDeleteErrorMessage(
                extractErrorMessage(error, 'Failed to delete model resource')
            )
        } finally {
            setDeletingResourceId('')
        }
    }

    return (
        <ModelResourcePanelShell
            title='Model Resources'
            subtitle='File-managed shared model resources.'
            onClose={onClose}
        >
            <CreateResourceForm
                draftResourceId={draftResourceId}
                draftProvider={draftProvider}
                draftProviderModel={draftProviderModel}
                draftApiKey={draftApiKey}
                draftBaseUrl={draftBaseUrl}
                isCreating={isCreating}
                createErrorMessage={createErrorMessage}
                onDraftResourceIdChange={setDraftResourceId}
                onDraftProviderChange={setDraftProvider}
                onDraftProviderModelChange={setDraftProviderModel}
                onDraftApiKeyChange={setDraftApiKey}
                onDraftBaseUrlChange={setDraftBaseUrl}
                onCreate={handleCreateResource}
            />

            <ModelResourceStatusCard
                modelResourceStatus={modelResourceStatus}
                statusErrorMessage={statusErrorMessage}
            />

            <ModelResourceList
                resources={sortedResources}
                editingResourceId={editingResourceId}
                draftEditProvider={draftEditProvider}
                draftEditProviderModel={draftEditProviderModel}
                draftEditApiKey={draftEditApiKey}
                draftEditBaseUrl={draftEditBaseUrl}
                editErrorMessage={editErrorMessage}
                isUpdating={isUpdating}
                isCreating={isCreating}
                deletingResourceId={deletingResourceId}
                deleteErrorResourceId={deleteErrorResourceId}
                deleteErrorMessage={deleteErrorMessage}
                deleteBlockedDetail={deleteBlockedDetail}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onDraftEditProviderChange={setDraftEditProvider}
                onDraftEditProviderModelChange={setDraftEditProviderModel}
                onDraftEditApiKeyChange={setDraftEditApiKey}
                onDraftEditBaseUrlChange={setDraftEditBaseUrl}
                onUpdateResource={handleUpdateResource}
                onDeleteResource={handleDeleteResource}
            />
        </ModelResourcePanelShell>
    )
}