import { useCallback, useEffect, useState } from 'react'

import { getModelResourcesStatus } from '../../api'
import type { ModelResourceConfigHealth } from '../../model-resources/modelResourceTypes'

export function useModelResourcePanelStatus() {
  const [modelResourceStatus, setModelResourceStatus] =
    useState<ModelResourceConfigHealth | null>(null)
  const [statusErrorMessage, setStatusErrorMessage] = useState('')

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await getModelResourcesStatus()
      setModelResourceStatus(nextStatus)
      setStatusErrorMessage('')
    } catch {
      setModelResourceStatus(null)
      setStatusErrorMessage('加载模型资源状态失败')
    }
  }, [])

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
        setStatusErrorMessage('加载模型资源状态失败')
      }
    }

    void loadStatus()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    modelResourceStatus,
    statusErrorMessage,
    refreshStatus,
  }
}
