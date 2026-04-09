import axios from 'axios'

import type {
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
    const res = await axios.get<LiveRunSnapshot>(
        `${API_BASE}/runs/active`
    )
    return res.data
}