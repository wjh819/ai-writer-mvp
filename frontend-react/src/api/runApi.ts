import axios from 'axios'

import type {
  BatchItemDetailResponse,
  BatchRunRequestPayload,
  BatchSummaryResponse,
  LiveRunSnapshot,
  LiveRunStartResponse,
  RunDraftWorkflowPayload,
  RunResult,
  SubgraphTestRequestPayload,
} from '../run/runTypes'
import { API_BASE, DEFAULT_CANVAS_ID } from './core'

export async function runDraftWorkflow(
  payload: RunDraftWorkflowPayload,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<RunResult> {
  const res = await axios.post<RunResult>(
    `${API_BASE}/workflows/${canvasId}/run-draft`,
    payload
  )
  return res.data
}

export async function runSubgraphTestWorkflow(
  payload: SubgraphTestRequestPayload,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<RunResult> {
  const res = await axios.post<RunResult>(
    `${API_BASE}/workflows/${canvasId}/test-subgraph`,
    payload
  )
  return res.data
}

export async function startLiveRun(
  payload: RunDraftWorkflowPayload,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<LiveRunStartResponse> {
  const res = await axios.post<LiveRunStartResponse>(
    `${API_BASE}/workflows/${canvasId}/run-live`,
    payload
  )
  return res.data
}

export async function getActiveLiveRun(): Promise<LiveRunSnapshot> {
  const res = await axios.get<LiveRunSnapshot>(`${API_BASE}/runs/active`)
  return res.data
}

export async function startBatchRun(
  payload: BatchRunRequestPayload,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<BatchSummaryResponse> {
  const res = await axios.post<BatchSummaryResponse>(
    `${API_BASE}/workflows/${canvasId}/run-batch`,
    payload
  )
  return res.data
}

export async function getBatchSummary(
  batchId: string
): Promise<BatchSummaryResponse> {
  const res = await axios.get<BatchSummaryResponse>(
    `${API_BASE}/run-batches/${encodeURIComponent(batchId)}`
  )
  return res.data
}

export async function getBatchItemDetail(
  batchId: string,
  itemId: string
): Promise<BatchItemDetailResponse> {
  const res = await axios.get<BatchItemDetailResponse>(
    `${API_BASE}/run-batches/${encodeURIComponent(
      batchId
    )}/items/${encodeURIComponent(itemId)}`
  )
  return res.data
}

export async function cancelBatchRun(
  batchId: string
): Promise<BatchSummaryResponse> {
  const res = await axios.post<BatchSummaryResponse>(
    `${API_BASE}/run-batches/${encodeURIComponent(batchId)}/cancel`
  )
  return res.data
}