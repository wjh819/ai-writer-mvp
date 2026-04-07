import type { ModelResourceDeleteBlockedDetail } from '../../model-resources/modelResourceTypes'

/**
 * model resource 面板错误提取辅助层。
 *
 * 本文件角色：
 * - 收口面板当前已知的错误文本提取与 delete blocked detail 提取
 *
 * 负责：
 * - 从 axios 风格错误对象中提取 detail:string
 * - 从删除失败响应中提取结构化 delete blocked detail
 *
 * 不负责：
 * - 统一错误协议 owner
 * - 完整 runtime validation
 * - 未知 detail shape 的严格解析
 */

export function extractErrorMessage(error: unknown, fallback: string) {
    const maybeMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { data?: unknown } }).response?.data &&
        typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data
            ?.detail === 'string'
            ? (error as { response?: { data?: { detail?: string } } }).response?.data
                ?.detail
            : null

    if (maybeMessage) {
        return maybeMessage
    }

    return error instanceof Error ? error.message : fallback
}

export function extractDeleteBlockedDetail(
    error: unknown
): ModelResourceDeleteBlockedDetail | null {
    const detail =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
            ? (error as { response?: { data?: { detail?: unknown } } }).response?.data
                ?.detail
            : null

    if (!detail || typeof detail !== 'object') {
        return null
    }

    const maybeDetail = detail as Record<string, unknown>
    const errorType = maybeDetail.error_type

    if (
        errorType === 'model_resource_in_use' ||
        errorType === 'model_resource_reference_scan_incomplete'
    ) {
        return {
            error_type: errorType as ModelResourceDeleteBlockedDetail['error_type'],
            message: typeof maybeDetail.message === 'string' ? maybeDetail.message : '',
            references: Array.isArray(maybeDetail.references)
                ? (maybeDetail.references as ModelResourceDeleteBlockedDetail['references'])
                : [],
            incomplete_workflows: Array.isArray(maybeDetail.incomplete_workflows)
                ? (maybeDetail.incomplete_workflows as ModelResourceDeleteBlockedDetail['incomplete_workflows'])
                : [],
        }
    }

    return null
}