export const CANVAS_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

export function buildCanvasSwitchErrorMessage(params: {
  targetCanvasId: string
  activeCanvasId: string
  errorMessage: string
}): string {
  const { targetCanvasId, activeCanvasId, errorMessage } = params

  return [
    `切换画布到 "${targetCanvasId}" 失败。`,
    `当前仍停留在画布 "${activeCanvasId}"。`,
    errorMessage,
  ].join('\n')
}

export function normalizeCanvasId(value: string): string {
  return value.trim()
}

export function validateCanvasId(value: string): string {
  const normalized = normalizeCanvasId(value)

  if (!normalized) {
    return '画布 ID 不能为空'
  }

  if (!CANVAS_ID_RE.test(normalized)) {
    return '画布 ID 必须以字母或数字开头，且仅能包含字母、数字、下划线和连字符'
  }

  return ''
}

export function getLiveRunLockedMessage(): string {
  return '完整 Live Run 进行中，画布相关操作已暂时禁用。'
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

  return `正在从画布 "${activeCanvasId}" 切换到 "${requestedCanvasId}"...`
}

export function buildTemporaryCanvasStatusMessage(
  isActiveCanvasTemporary: boolean,
  activeCanvasId: string
): string {
  if (!isActiveCanvasTemporary) {
    return ''
  }

  return [
    `正在编辑未保存的空白画布 "${activeCanvasId}"。`,
    '该画布仅在本地存在，首次保存成功后才会成为正式画布。',
  ].join('\n')
}

export function buildDiscardTemporaryCanvasConfirmationMessage(params: {
  activeCanvasId: string
  nextCanvasId?: string
}): string {
  const { activeCanvasId, nextCanvasId } = params
  const nextTargetText = nextCanvasId
    ? `切换到 "${nextCanvasId}"`
    : '继续当前操作'

  return [
    `画布 "${activeCanvasId}" 尚未保存。`,
    `如果你选择${nextTargetText}，该临时空白画布将被丢弃。`,
    '是否继续？',
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
      `要丢弃临时画布 "${activeCanvasId}" 吗？`,
      '该空白画布仅在本地存在，且尚未保存。',
    ]

    if (isGraphDirty) {
      messageLines.push(
        '该临时画布上的未保存修改将会丢失。'
      )
    }

    messageLines.push('此操作无法撤销。')
    return messageLines.join('\n')
  }

  const messageLines = [
    `要删除正式画布 "${activeCanvasId}" 吗？`,
    '这会永久删除当前画布对应的文件。',
  ]

  if (isGraphDirty) {
    messageLines.push(
      '该画布当前未保存的草稿改动也会丢失。'
    )
  }

  messageLines.push('此操作无法撤销。')
  return messageLines.join('\n')
}
