export const CANVAS_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

export function buildCanvasSwitchErrorMessage(params: {
  targetCanvasId: string
  activeCanvasId: string
  errorMessage: string
}): string {
  const { targetCanvasId, activeCanvasId, errorMessage } = params

  return [
    `Failed to switch canvas to "${targetCanvasId}".`,
    `Active canvas remains "${activeCanvasId}".`,
    errorMessage,
  ].join('\n')
}

export function normalizeCanvasId(value: string): string {
  return value.trim()
}

export function validateCanvasId(value: string): string {
  const normalized = normalizeCanvasId(value)

  if (!normalized) {
    return 'Canvas id is required'
  }

  if (!CANVAS_ID_RE.test(normalized)) {
    return 'Canvas id must start with a letter or number, and contain only letters, numbers, underscores, and hyphens'
  }

  return ''
}

export function getLiveRunLockedMessage(): string {
  return 'Canvas actions are disabled while a full live run is active.'
}

export function buildWorkflowStatusMessage(
  requestedCanvasId: string,
  activeCanvasId: string
): string {
  if (!requestedCanvasId || !activeCanvasId) {
    return ''
  }

  if (requestedCanvasId === activeCanvasId) {
    return ''
  }

  return `Switching canvas from "${activeCanvasId}" to "${requestedCanvasId}"...`
}

export function buildTemporaryCanvasStatusMessage(
  isActiveCanvasTemporary: boolean,
  activeCanvasId: string
): string {
  if (!isActiveCanvasTemporary) {
    return ''
  }

  return [
    `Editing unsaved blank canvas "${activeCanvasId}".`,
    'This canvas only exists locally until the first successful save.',
  ].join('\n')
}

export function buildDiscardTemporaryCanvasConfirmationMessage(params: {
  activeCanvasId: string
  nextCanvasId?: string
}): string {
  const { activeCanvasId, nextCanvasId } = params
  const nextTargetText = nextCanvasId
    ? `switch to "${nextCanvasId}"`
    : 'continue'

  return [
    `Canvas "${activeCanvasId}" has not been saved yet.`,
    `If you ${nextTargetText}, this temporary blank canvas will be discarded.`,
    'Do you want to proceed?',
  ].join('\n')
}

export function buildDeleteConfirmationMessage(params: {
  isActiveCanvasTemporary: boolean
  activeCanvasId: string
  isGraphDirty: boolean
}): string {
  const { isActiveCanvasTemporary, activeCanvasId, isGraphDirty } = params

  if (isActiveCanvasTemporary) {
    const messageLines = [
      `Discard temporary canvas "${activeCanvasId}"?`,
      'This blank canvas only exists locally and has not been saved yet.',
    ]

    if (isGraphDirty) {
      messageLines.push(
        'Current unsaved edits on this temporary canvas will be lost.'
      )
    }

    messageLines.push('This action cannot be undone.')
    return messageLines.join('\n')
  }

  const messageLines = [
    `Delete formal canvas "${activeCanvasId}"?`,
    'This will permanently delete the current canvas files.',
  ]

  if (isGraphDirty) {
    messageLines.push(
      'Current unsaved draft changes on this canvas will also be lost.'
    )
  }

  messageLines.push('This action cannot be undone.')
  return messageLines.join('\n')
}
