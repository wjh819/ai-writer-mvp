import { useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import type { NodeProps } from 'reactflow'

import type { NodeOutputSpec } from '../workflow-editor/workflowEditorTypes'
import {
  CONTEXT_SOURCE_HANDLE_ID,
  CONTEXT_TARGET_HANDLE_ID,
  CREATE_BINDING_HANDLE_ID,
  type InboundBindingDisplayItem,
  type LiveRunDisplayStatus,
  type WorkflowNodeData,
} from '../workflow-editor/workflowEditorGraphTypes'

const TYPE_STYLES = {
  input: {
    background: '#e8f4ff',
    border: '1px solid #4da3ff',
    color: '#114a8b',
  },
  prompt: {
    background: '#f3e8ff',
    border: '1px solid #a855f7',
    color: '#5b21b6',
  },
  output: {
    background: '#ecfdf3',
    border: '1px solid #22c55e',
    color: '#166534',
  },
  default: {
    background: '#f5f5f5',
    border: '1px solid #ccc',
    color: '#333',
  },
} as const

function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  return String(value).trim()
}

function toPreviewText(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'undefined') {
    return '-'
  }

  if (typeof value === 'string') {
    return value || '-'
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

function getSinglePublishedStateEntry(value: unknown): {
  key: string
  value: unknown
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length !== 1) {
    return null
  }

  const [key, entryValue] = entries[0]
  const normalizedKey = trim(key)
  if (!normalizedKey) {
    return null
  }

  return {
    key: normalizedKey,
    value: entryValue,
  }
}

function getPublishedStateKeysText(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '-'
  }

  const keys = Object.keys(value as Record<string, unknown>)
    .map(trim)
    .filter(Boolean)

  return keys.length > 0 ? keys.join(', ') : '-'
}

function getPromptVariableHints(data: WorkflowNodeData): string[] {
  if (data.config.type !== 'prompt') {
    return []
  }

  return Array.isArray(data.promptVariableHints)
    ? data.promptVariableHints.map(trim).filter(Boolean)
    : []
}

function getNodeOutputs(data: WorkflowNodeData | undefined): NodeOutputSpec[] {
  const config = data?.config
  return Array.isArray(config?.outputs) ? config.outputs : []
}

function formatOutputs(outputs: NodeOutputSpec[]): string {
  if (!outputs.length) {
    return '-'
  }

  return outputs
    .map(
      output => `${trim(output.name) || '-'} → ${trim(output.stateKey) || '-'}`
    )
    .join(', ')
}

function getTargetInputHandles(data: WorkflowNodeData): string[] {
  if (data.config.type === 'input') {
    return []
  }

  return Array.isArray(data.derivedTargetInputs)
    ? data.derivedTargetInputs.map(trim).filter(Boolean)
    : []
}

function getInboundBindings(data: WorkflowNodeData): InboundBindingDisplayItem[] {
  if (data.config.type !== 'prompt' && data.config.type !== 'output') {
    return []
  }

  return Array.isArray(data.inboundBindings) ? data.inboundBindings : []
}

function renderTargetHandles(handleIds: string[], isLocked: boolean) {
  if (!handleIds.length) {
    return null
  }

  return handleIds.map((handleId, index) => {
    const left = `${((index + 1) / (handleIds.length + 1)) * 100}%`

    return (
      <div
        key={`target-${handleId}-${index}`}
        style={{
          position: 'absolute',
          top: -24,
          left,
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontSize: 10,
            lineHeight: 1,
            marginBottom: 4,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          {handleId}
        </div>

        <Handle
          id={handleId}
          type='target'
          position={Position.Top}
          isConnectable={!isLocked}
          style={{
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            background: '#ffffff',
            border: '2px solid #64748b',
            boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? 'not-allowed' : 'crosshair',
          }}
        />
      </div>
    )
  })
}

function renderCreateBindingHandle(isLocked: boolean) {
  return (
    <div
      key='target-create-binding'
      style={{
        position: 'absolute',
        top: -24,
        right: 8,
        zIndex: 5,
      }}
    >
      <div
        style={{
          fontSize: 10,
          lineHeight: 1,
          marginBottom: 4,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      >
        + 绑定
      </div>

      <Handle
        id={CREATE_BINDING_HANDLE_ID}
        type='target'
        position={Position.Top}
        isConnectable={!isLocked}
        style={{
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          width: 12,
          height: 12,
          background: '#ffffff',
          border: '2px dashed #64748b',
          boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair',
        }}
      />
    </div>
  )
}

function renderInboundBindingsBlock(
  inboundBindings: InboundBindingDisplayItem[]
) {
  return (
    <>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
        入边绑定（权威）：
      </div>

      <div
        style={{
          fontSize: 12,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: 6,
          padding: 6,
          marginBottom: 6,
          wordBreak: 'break-word',
        }}
      >
        {inboundBindings.length === 0 ? (
          '-'
        ) : (
          inboundBindings.map(binding => (
            <div
              key={`${binding.sourceNodeId}.${binding.sourceOutput}->${binding.targetInput}`}
              style={{ marginBottom: 4 }}
            >
              {binding.sourceNodeId}.{binding.sourceOutput} {'->'}{' '}
              {binding.targetInput}
            </div>
          ))
        )}
      </div>
    </>
  )
}

function renderSourceHandles(outputs: NodeOutputSpec[], isLocked: boolean) {
  if (!outputs.length) {
    return (
      <Handle
        type='source'
        position={Position.Bottom}
        isConnectable={!isLocked}
        style={{
          width: 12,
          height: 12,
          background: '#ffffff',
          border: '2px solid #64748b',
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair',
        }}
      />
    )
  }

  return outputs.map((output, index) => {
    const handleId = trim(output.name) || `output_${index + 1}`
    const left = `${((index + 1) / (outputs.length + 1)) * 100}%`

    return (
      <div
        key={`source-${handleId}-${index}`}
        style={{
          position: 'absolute',
          bottom: -24,
          left,
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}
      >
        <Handle
          id={handleId}
          type='source'
          position={Position.Bottom}
          isConnectable={!isLocked}
          style={{
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            background: '#ffffff',
            border: '2px solid #64748b',
            boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? 'not-allowed' : 'crosshair',
          }}
        />

        <div
          style={{
            fontSize: 10,
            lineHeight: 1,
            marginTop: 4,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          {handleId}
        </div>
      </div>
    )
  })
}

function renderPromptWindowSummary(data: WorkflowNodeData) {
  if (data.config.type !== 'prompt') {
    return null
  }

  const mode = data.graphWindowMode || 'new_window'
  const sourceNodeId = trim(data.graphWindowSourceNodeId)
  const targets = Array.isArray(data.graphWindowTargetNodeIds)
    ? data.graphWindowTargetNodeIds.map(trim).filter(Boolean)
    : []

  let summaryText = '窗口：新窗口'
  if (mode === 'continue') {
    summaryText = `窗口：继续 <- ${sourceNodeId || '-'}`
  } else if (mode === 'branch') {
    summaryText = `窗口：分支 <- ${sourceNodeId || '-'}`
  }

  return (
    <>
      <div
        style={{
          fontSize: 12,
          marginBottom: 4,
          color: '#6d28d9',
          fontWeight: 700,
        }}
      >
        {summaryText}
      </div>

      <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.88 }}>
        上下文输出：{targets.length ? targets.join(', ') : '-'}
      </div>
    </>
  )
}

function renderContextTargetHandle(isLocked: boolean) {
  return (
    <div
      style={{
        position: 'absolute',
        left: -28,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          lineHeight: 1,
          marginBottom: 4,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          color: '#6d28d9',
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        上下文入
      </div>

      <Handle
        id={CONTEXT_TARGET_HANDLE_ID}
        type='target'
        position={Position.Left}
        isConnectable={!isLocked}
        style={{
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: '#8b5cf6',
          border: '2px solid #5b21b6',
          boxShadow: '0 0 0 2px rgba(139,92,246,0.18)',
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair',
        }}
      />
    </div>
  )
}

function renderContextSourceHandle(isLocked: boolean) {
  return (
    <div
      style={{
        position: 'absolute',
        right: -30,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          lineHeight: 1,
          marginBottom: 4,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          color: '#6d28d9',
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        上下文出
      </div>

      <Handle
        id={CONTEXT_SOURCE_HANDLE_ID}
        type='source'
        position={Position.Right}
        isConnectable={!isLocked}
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: '#8b5cf6',
          border: '2px solid #5b21b6',
          boxShadow: '0 0 0 2px rgba(139,92,246,0.18)',
          opacity: isLocked ? 0.5 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair',
        }}
      />
    </div>
  )
}

function renderPreviewBlock(title: string, value: unknown) {
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: 6,
          padding: 6,
          marginBottom: 6,
          wordBreak: 'break-word',
        }}
      >
        {toPreviewText(value)}
      </div>
    </>
  )
}

export default function WorkflowNode({
  id,
  data,
  selected,
}: NodeProps<WorkflowNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals()

  const config = data?.config
  const nodeType = config?.type || 'prompt'
  const style = TYPE_STYLES[nodeType] || TYPE_STYLES.default

  const isExecuted = Boolean(data?.isExecuted)
  const stepIndex = data?.stepIndex
  const outputs = getNodeOutputs(data)
  const targetInputHandles = getTargetInputHandles(data)
  const promptVariableHints = getPromptVariableHints(data)
  const inboundBindings = getInboundBindings(data)

  const canRequestSubgraphTest =
    typeof data.onRequestSubgraphTest === 'function'
  const isSubgraphTestRunning = Boolean(data.isSubgraphTestRunning)

  const isRunActive = Boolean(data?.isRunActive || data?.isRunRunning)
  const isRunFailed = Boolean(data?.isRunFailed)
  const isNodeInteractionLocked = Boolean(data?.isNodeInteractionLocked)
  const liveStatus: LiveRunDisplayStatus =
    data?.liveStatus ??
    (isRunActive
      ? 'running'
      : isRunFailed
        ? 'failed'
        : isExecuted
          ? 'success'
          : 'idle')
  const liveErrorMessage = trim(data?.liveErrorMessage)

  const inputPublishedStateEntry =
    nodeType === 'input'
      ? getSinglePublishedStateEntry(data.runtimePublishedState)
      : null

  const outputPublishedStateEntry =
    nodeType === 'output'
      ? getSinglePublishedStateEntry(data.runtimePublishedState)
      : null

  useEffect(() => {
    updateNodeInternals(id)
  }, [
    id,
    updateNodeInternals,
    targetInputHandles.join('|'),
    outputs.map(output => trim(output.name)).join('|'),
    trim(data.graphWindowMode),
    trim(data.graphWindowSourceNodeId),
    (data.graphWindowTargetNodeIds || []).map(trim).filter(Boolean).join('|'),
  ])

  const cardBorder = isRunFailed
    ? '1px solid #ef4444'
    : isRunActive
      ? '1px solid #3b82f6'
      : style.border

  const cardBoxShadow = isRunActive
    ? '0 0 0 3px rgba(59, 130, 246, 0.30), 0 4px 14px rgba(0,0,0,0.12)'
    : isRunFailed
      ? '0 0 0 3px rgba(239, 68, 68, 0.22), 0 4px 14px rgba(0,0,0,0.12)'
      : isExecuted
        ? '0 0 0 3px rgba(251, 191, 36, 0.35), 0 4px 14px rgba(0,0,0,0.12)'
        : selected
          ? '0 0 0 2px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0,0,0,0.08)'
          : '0 2px 8px rgba(0,0,0,0.08)'

  const liveStatusChip =
    liveStatus === 'running'
      ? { label: 'RUNNING', background: '#dbeafe', color: '#1d4ed8' }
      : liveStatus === 'failed'
        ? { label: 'FAILED', background: '#fee2e2', color: '#991b1b' }
        : liveStatus === 'success'
          ? { label: 'EXECUTED', background: '#fef3c7', color: '#92400e' }
          : null

  const topRightBadge = isRunActive
    ? { text: 'RUN', background: '#2563eb' }
    : isRunFailed
      ? { text: '!', background: '#dc2626' }
      : isExecuted
        ? {
            text: typeof stepIndex === 'number' ? String(stepIndex + 1) : '✓',
            background: '#f59e0b',
          }
        : null

  return (
    <div
      style={{
        ...style,
        minWidth: 240,
        maxWidth: 360,
        borderRadius: 10,
        padding: 12,
        position: 'relative',
        marginTop: nodeType === 'input' ? 4 : 24,
        marginBottom: 28,
        border: cardBorder,
        boxShadow: cardBoxShadow,
      }}
    >
      {nodeType !== 'input' && (
        <>
          {renderTargetHandles(targetInputHandles, isNodeInteractionLocked)}
          {renderCreateBindingHandle(isNodeInteractionLocked)}
        </>
      )}

      {nodeType === 'prompt' && (
        <>
          {renderContextTargetHandle(isNodeInteractionLocked)}
          {renderContextSourceHandle(isNodeInteractionLocked)}
        </>
      )}

      {topRightBadge && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            background: topRightBadge.background,
            color: '#fff',
            borderRadius: 999,
            minWidth: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            padding: '0 8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        >
          {topRightBadge.text}
        </div>
      )}

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        {nodeType.toUpperCase()}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700 }}>{id || '未命名节点'}</div>

          {liveStatusChip ? (
            <span
              style={{
                fontSize: 10,
                lineHeight: 1,
                padding: '4px 6px',
                borderRadius: 999,
                background: liveStatusChip.background,
                color: liveStatusChip.color,
                fontWeight: 700,
              }}
            >
              {liveStatusChip.label}
            </span>
          ) : null}
        </div>

        {canRequestSubgraphTest && (
          <button
            type='button'
            className='nodrag nopan'
            onMouseDown={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onPointerDown={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onDoubleClick={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              data.onRequestSubgraphTest?.(id)
            }}
            disabled={isSubgraphTestRunning || isNodeInteractionLocked}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background:
                isSubgraphTestRunning || isNodeInteractionLocked
                  ? '#e2e8f0'
                  : '#ffffff',
              cursor:
                isSubgraphTestRunning || isNodeInteractionLocked
                  ? 'default'
                  : 'pointer',
            }}
          >
            {isSubgraphTestRunning
              ? '运行中...'
              : isNodeInteractionLocked
                ? '已锁定'
                : '测试'}
          </button>
        )}
      </div>

      {isRunActive ? (
        <div
          style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 8,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          当前节点正在实时运行中执行。
        </div>
      ) : null}

      {isRunFailed && liveErrorMessage ? (
        <div
          style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 8,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 12,
          }}
        >
          实时运行失败：{liveErrorMessage.split('\n')[0]}
        </div>
      ) : null}

      {nodeType === 'input' && config.type === 'input' && (
        <>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            inputKey: {config.inputKey || '-'}
          </div>

          <div style={{ fontSize: 12, marginBottom: 4 }}>
            outputs: {formatOutputs(outputs)}
          </div>

          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
            default: {config.defaultValue || '-'}
          </div>

          {isExecuted && (
            <>
              {renderPreviewBlock('最近输出', data.runtimeOutput)}

              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                已写入状态键
              </div>
              <div
                style={{
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: 6,
                  padding: 6,
                  wordBreak: 'break-word',
                }}
              >
                {inputPublishedStateEntry?.key ||
                  getPublishedStateKeysText(data.runtimePublishedState)}
              </div>
            </>
          )}
        </>
      )}

{nodeType === 'prompt' && config.type === 'prompt' && (
  <>
    <div style={{ fontSize: 12, marginBottom: 4 }}>
      提示词：{config.promptText ? '（已配置）' : '-'}
    </div>

    <div style={{ fontSize: 12, marginBottom: 4 }}>
      模型资源：{config.modelResourceId || '-'}
    </div>

    <div style={{ fontSize: 12, marginBottom: 4 }}>
      outputs: {formatOutputs(outputs)}
    </div>

    {renderPromptWindowSummary(data)}
    {renderInboundBindingsBlock(inboundBindings)}

    <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
      Prompt 变量提示（文本推导，非权威）：
    </div>
    <div
      style={{
        fontSize: 12,
        background: 'rgba(255,255,255,0.55)',
        borderRadius: 6,
        padding: 6,
        marginBottom: 6,
        wordBreak: 'break-word',
      }}
    >
      {promptVariableHints.join(', ') || '-'}
    </div>

    {isExecuted && (
      <>
        {renderPreviewBlock('最近输入', data.runtimeInputs)}
        {renderPreviewBlock('最近原始输出', data.runtimeOutput)}
        {renderPreviewBlock(
          '最近写入状态',
          data.runtimePublishedState
        )}
      </>
    )}
  </>
)}

      {nodeType === 'output' && config.type === 'output' && (
        <>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            outputs: {formatOutputs(outputs)}
          </div>

          {renderInboundBindingsBlock(inboundBindings)}

          {isExecuted && (
            <>
              {renderPreviewBlock('最近输入', data.runtimeInputs)}
              {renderPreviewBlock('最近聚合输出', data.runtimeOutput)}

              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                已写入状态键
              </div>
              <div
                style={{
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: 6,
                  padding: 6,
                  wordBreak: 'break-word',
                }}
              >
                {outputPublishedStateEntry?.key ||
                  getPublishedStateKeysText(data.runtimePublishedState)}
              </div>
            </>
          )}
        </>
      )}

      {isNodeInteractionLocked ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: '#475569',
            opacity: 0.9,
          }}
        >
          实时运行中，图编辑已锁定。
        </div>
      ) : null}

      {renderSourceHandles(outputs, isNodeInteractionLocked)}
    </div>
  )
}
