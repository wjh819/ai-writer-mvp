import axios from 'axios'

import type {
    CreateModelResourcePayload,
    DeleteModelResourcePayload,
    ModelResourceConfigHealth,
    ModelResourceListItem,
    UpdateModelResourcePayload,
} from '../model-resources/modelResourceTypes'
import { API_BASE } from './core'

export async function getModelResources(): Promise<ModelResourceListItem[]> {
    const res = await axios.get<ModelResourceListItem[]>(
        `${API_BASE}/model-resources`
    )
    return res.data
}

export async function getModelResourcesStatus(): Promise<ModelResourceConfigHealth> {
    const res = await axios.get<ModelResourceConfigHealth>(
        `${API_BASE}/model-resources/status`
    )
    return res.data
}

export async function createModelResource(
    payload: CreateModelResourcePayload
): Promise<{ status: string }> {
    const res = await axios.post<{ status: string }>(
        `${API_BASE}/model-resources`,
        payload
    )
    return res.data
}

export async function updateModelResource(
    payload: UpdateModelResourcePayload
): Promise<{ status: string }> {
    const res = await axios.put<{ status: string }>(
        `${API_BASE}/model-resources`,
        payload
    )
    return res.data
}

export async function deleteModelResource(
    payload: DeleteModelResourcePayload
): Promise<{ status: string }> {
    const res = await axios.delete<{ status: string }>(
        `${API_BASE}/model-resources`,
        {
            data: payload,
        }
    )
    return res.data
}