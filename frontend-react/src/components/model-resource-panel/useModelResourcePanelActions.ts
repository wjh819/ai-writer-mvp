import { useMemo, useState } from 'react'

import {
  createModelResource,
  deleteModelResource,
  updateModelResource,
} from '../../api'
import type {
  ModelResourceDeleteBlockedDetail,
  ModelResourceListItem,
  ModelResourceProvider,
} from '../../model-resources/modelResourceTypes'
import {
  extractDeleteBlockedDetail,
  extractErrorMessage,
} from './modelResourcePanelErrors'

const DEFAULT_PROVIDER: ModelResourceProvider = 'openai_compatible'
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'

interface UseModelResourcePanelActionsOptions {
  modelResources: ModelResourceListItem[]
  onResourcesChanged: () => Promise<void> | void
  refreshStatus: () => Promise<void>
}

export function useModelResourcePanelActions({
  modelResources,
  onResourcesChanged,
  refreshStatus,
}: UseModelResourcePanelActionsOptions) {
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
      setCreateErrorMessage('资源 ID 为必填项')
      return
    }
    if (!nextModel) {
      setCreateErrorMessage('提供方模型为必填项')
      return
    }
    if (!nextApiKey) {
      setCreateErrorMessage('API Key 为必填项')
      return
    }
    if (!nextBaseUrl) {
      setCreateErrorMessage('基础 URL 为必填项')
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
      await refreshStatus()
      setDraftResourceId('')
      setDraftProvider(DEFAULT_PROVIDER)
      setDraftProviderModel('')
      setDraftApiKey('')
      setDraftBaseUrl(DEFAULT_BASE_URL)
    } catch (error) {
      setCreateErrorMessage(
        extractErrorMessage(error, '创建模型资源失败')
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
      setEditErrorMessage('提供方模型为必填项')
      return
    }
    if (!nextBaseUrl) {
      setEditErrorMessage('基础 URL 为必填项')
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
      await refreshStatus()
      setEditingResourceId('')
      setDraftEditProvider(DEFAULT_PROVIDER)
      setDraftEditProviderModel('')
      setDraftEditApiKey('')
      setDraftEditBaseUrl('')
    } catch (error) {
      setEditErrorMessage(
        extractErrorMessage(error, '更新模型资源失败')
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
      await refreshStatus()

      if (editingResourceId === resourceId) {
        handleCancelEdit()
      }
    } catch (error) {
      setDeleteErrorResourceId(resourceId)
      setDeleteBlockedDetail(extractDeleteBlockedDetail(error))
      setDeleteErrorMessage(
        extractErrorMessage(error, '删除模型资源失败')
      )
    } finally {
      setDeletingResourceId('')
    }
  }

  return {
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
  }
}
