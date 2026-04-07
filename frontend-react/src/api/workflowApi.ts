import axios from 'axios'

import {
    API_BASE,
    DEFAULT_CANVAS_ID,
    type CanvasSummary,
    type LoadWorkflowResponse,
    type SaveWorkflowOptions,
    type SaveWorkflowRequestPayload,
} from './core'

export async function listWorkflows(): Promise<CanvasSummary[]> {
    const res = await axios.get<CanvasSummary[]>(`${API_BASE}/workflows`)
    return res.data
}

export async function loadWorkflow(
    canvasId: string
): Promise<LoadWorkflowResponse> {
    const res = await axios.get<LoadWorkflowResponse>(
        `${API_BASE}/workflows/${canvasId}`
    )
    return res.data
}

export async function saveWorkflow(
    payload: SaveWorkflowRequestPayload,
    canvasId: string = DEFAULT_CANVAS_ID,
    options: SaveWorkflowOptions = {}
): Promise<{ status: string }> {
    const res = await axios.post<{ status: string }>(
        `${API_BASE}/workflows/${canvasId}`,
        payload,
        {
            params: {
                reject_if_exists: options.rejectIfExists || undefined,
            },
        }
    )
    return res.data
}

export async function deleteWorkflow(
    canvasId: string = DEFAULT_CANVAS_ID
): Promise<{ status: string }> {
    const res = await axios.delete<{ status: string }>(
        `${API_BASE}/workflows/${canvasId}`
    )
    return res.data
}