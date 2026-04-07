import axios from 'axios'

import { API_BASE } from './core'

export async function getPrompts(): Promise<string[]> {
    const res = await axios.get<string[]>(`${API_BASE}/prompts`)
    return res.data
}