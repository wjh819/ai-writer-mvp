export type ModelResourceProvider = 'openai_compatible'

export interface ModelResourceListItem {
  id: string
  provider: ModelResourceProvider
  model: string
  api_key: string
  base_url: string
}

export interface ModelResourceConfigHealth {
  status: string
  config_path: string
}

export interface CreateModelResourcePayload {
  id: string
  provider: ModelResourceProvider
  model: string
  api_key: string
  base_url: string
}

export interface UpdateModelResourcePayload {
  id: string
  provider: ModelResourceProvider
  model: string
  base_url: string

  /**
   * 缺省表示“保持现有 key 不变”。
   * 当前不使用 undefined 表达“清空 key”。
   */
  api_key?: string
}

export interface DeleteModelResourcePayload {
  id: string
}

export interface ModelResourceReferenceItem {
  /**
   * 兼容字段名。
   * 当前内部语义更接近 canvas_id。
   */
  workflow_name: string
  node_id: string
  model_resource_id: string
}

export interface IncompleteWorkflowReferenceScanItem {
  /**
   * 兼容字段名。
   * 当前内部语义更接近 canvas_id。
   */
  workflow_name: string
  error_message: string
}

export interface ModelResourceDeleteBlockedDetail {
  /**
   * 前端可稳定消费的机器字段。
   * message 只是展示文案，不替代 error_type。
   */
  error_type:
    | 'model_resource_in_use'
    | 'model_resource_reference_scan_incomplete'
  message: string
  references: ModelResourceReferenceItem[]
  incomplete_workflows: IncompleteWorkflowReferenceScanItem[]
}