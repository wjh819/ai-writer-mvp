import { useState } from 'react'

import type {
    ModelResourceListItem,
} from '../model-resources/modelResourceTypes'

import CreateResourceForm from './model-resource-panel/CreateResourceForm'
import ModelResourceList from './model-resource-panel/ModelResourceList'
import ModelResourcePanelShell from './model-resource-panel/ModelResourcePanelShell'
import ModelResourceStatusCard from './model-resource-panel/ModelResourceStatusCard'
import { useModelResourcePanelActions } from './model-resource-panel/useModelResourcePanelActions'
import { useModelResourcePanelStatus } from './model-resource-panel/useModelResourcePanelStatus'

interface WorkflowModelResourcePanelProps {
    modelResources: ModelResourceListItem[]
    onClose: () => void
    onResourcesChanged: () => Promise<void> | void
}

export default function WorkflowModelResourcePanel({
                                                       modelResources,
                                                       onClose,
                                                       onResourcesChanged,
                                                   }: WorkflowModelResourcePanelProps) {
    const {
        modelResourceStatus,
        statusErrorMessage,
        refreshStatus,
    } = useModelResourcePanelStatus()

    const {
        sortedResources,
        createErrorMessage,
        isCreating,
        draftResourceId,
        draftProvider,
        draftProviderModel,
        draftApiKey,
        draftBaseUrl,
        editingResourceId,
        draftEditProvider,
        draftEditProviderModel,
        draftEditApiKey,
        draftEditBaseUrl,
        editErrorMessage,
        isUpdating,
        deleteErrorMessage,
        deleteBlockedDetail,
        deletingResourceId,
        deleteErrorResourceId,
        setDraftResourceId,
        setDraftProvider,
        setDraftProviderModel,
        setDraftApiKey,
        setDraftBaseUrl,
        setDraftEditProvider,
        setDraftEditProviderModel,
        setDraftEditApiKey,
        setDraftEditBaseUrl,
        handleCreateResource,
        handleStartEdit,
        handleCancelEdit,
        handleUpdateResource,
        handleDeleteResource,
    } = useModelResourcePanelActions({
        modelResources,
        onResourcesChanged,
        refreshStatus,
    })

    return (
        <ModelResourcePanelShell
            title='模型资源'
            subtitle='由文件管理的共享模型资源。'
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
