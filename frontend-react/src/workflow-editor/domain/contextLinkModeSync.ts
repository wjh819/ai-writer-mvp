import type { WorkflowContextLink } from '../workflowEditorTypes'
import { validateContextSourceOutboundRules } from './workflowEditorValidationRules'
import { trim } from './graphHelpers'

export function updateContextLinkModeInGraph(
    contextLinks: WorkflowContextLink[],
    contextLinkId: string,
    nextMode: 'continue' | 'branch'
) {
    const normalizedId = trim(contextLinkId)

    if (!normalizedId) {
        return {
            nextContextLinks: contextLinks || [],
            updatedContextLink: null,
            rejectReason: 'Context link id cannot be empty',
        }
    }

    if (nextMode !== 'continue' && nextMode !== 'branch') {
        return {
            nextContextLinks: contextLinks || [],
            updatedContextLink: null,
            rejectReason: `Invalid context link mode: ${String(nextMode)}`,
        }
    }

    const hit = (contextLinks || []).find(link => trim(link.id) === normalizedId)
    if (!hit) {
        return {
            nextContextLinks: contextLinks || [],
            updatedContextLink: null,
            rejectReason: `Context link not found: ${normalizedId}`,
        }
    }

    if (hit.mode === nextMode) {
        return {
            nextContextLinks: contextLinks || [],
            updatedContextLink: hit,
            rejectReason: undefined,
        }
    }

    const updatedContextLink: WorkflowContextLink = {
        ...hit,
        mode: nextMode,
    }

    const nextContextLinks = (contextLinks || []).map(link =>
        trim(link.id) === normalizedId ? updatedContextLink : link
    )

    const sourceOutboundRuleError =
        validateContextSourceOutboundRules(nextContextLinks)
    if (sourceOutboundRuleError) {
        return {
            nextContextLinks: contextLinks || [],
            updatedContextLink: null,
            rejectReason: sourceOutboundRuleError,
        }
    }

    return {
        nextContextLinks,
        updatedContextLink,
        rejectReason: undefined,
    }
}