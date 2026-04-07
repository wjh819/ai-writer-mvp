import { useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import type { NodeProps } from 'reactflow'

import type { NodeOutputSpec } from '../workflow-editor/workflowEditorTypes'
import {
  CONTEXT_SOURCE_HANDLE_ID,
  CONTEXT_TARGET_HANDLE_ID,
  CREATE_BINDING_HANDLE_ID,
  type InboundBindingDisplayItem,
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
}

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

function renderTargetHandles(handleIds: string[]) {
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
          isConnectable={true}
          style={{
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            background: '#ffffff',
            border: '2px solid #64748b',
            boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
            cursor: 'crosshair',
          }}
        />
      </div>
    )
  })
}

function renderCreateBindingHandle() {
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
        + binding
      </div>

      <Handle
        id={CREATE_BINDING_HANDLE_ID}
        type='target'
        position={Position.Top}
        isConnectable={true}
        style={{
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          width: 12,
          height: 12,
          background: '#ffffff',
          border: '2px dashed #64748b',
          boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

function renderInboundBindingsBlock(inboundBindings: InboundBindingDisplayItem[]) {
  return (
    <>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
        inbound bindings (authoritative):
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

function renderSourceHandles(outputs: NodeOutputSpec[]) {
  if (!outputs.length) {
    return (
      <Handle
        type='source'
        position={Position.Bottom}
        isConnectable={true}
        style={{
          width: 12,
          height: 12,
          background: '#ffffff',
          border: '2px solid #64748b',
          cursor: 'crosshair',
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
          isConnectable={true}
          style={{
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            background: '#ffffff',
            border: '2px solid #64748b',
            boxShadow: '0 0 0 2px rgba(100,116,139,0.14)',
            cursor: 'crosshair',
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

  let summaryText = 'window: new_window'
  if (mode === 'continue') {
    summaryText = `window: continue ← ${sourceNodeId || '-'}`
  } else if (mode === 'branch') {
    summaryText = `window: branch ← ${sourceNodeId || '-'}`
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
        context out: {targets.length ? targets.join(', ') : '-'}
      </div>
    </>
  )
}

function renderContextTargetHandle() {
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
        ctx in
      </div>

      <Handle
        id={CONTEXT_TARGET_HANDLE_ID}
        type='target'
        position={Position.Left}
        isConnectable={true}
        style={{
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: '#8b5cf6',
          border: '2px solid #5b21b6',
          boxShadow: '0 0 0 2px rgba(139,92,246,0.18)',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

function renderContextSourceHandle() {
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
        ctx out
      </div>

      <Handle
        id={CONTEXT_SOURCE_HANDLE_ID}
        type='source'
        position={Position.Right}
        isConnectable={true}
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: '#8b5cf6',
          border: '2px solid #5b21b6',
          boxShadow: '0 0 0 2px rgba(139,92,246,0.18)',
          cursor: 'crosshair',
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
    (data.graphWindowTargetNodeIds || []).join('|'),
  ])

  return (
    <div
      style={{
        minWidth: 240,
        maxWidth: 360,
        borderRadius: 10,
        padding: 12,
        boxShadow: isExecuted
          ? '0 0 0 3px rgba(251, 191, 36, 0.35), 0 4px 14px rgba(0,0,0,0.12)'
          : selected
            ? '0 0 0 2px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
        marginTop: nodeType === 'input' ? 4 : 24,
        marginBottom: 28,
        ...style,
      }}
    >
      {nodeType !== 'input' && (
        <>
          {renderTargetHandles(targetInputHandles)}
          {renderCreateBindingHandle()}
        </>
      )}

      {nodeType === 'prompt' && (
        <>
          {renderContextTargetHandle()}
          {renderContextSourceHandle()}
        </>
      )}

      {isExecuted && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            background: '#f59e0b',
            color: '#fff',
            borderRadius: 999,
            minWidth: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        >
          {typeof stepIndex === 'number' ? stepIndex + 1 : '✓'}
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
          <div style={{ fontWeight: 700 }}>{id || 'Unnamed Node'}</div>
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
            disabled={isSubgraphTestRunning}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: isSubgraphTestRunning ? '#e2e8f0' : '#ffffff',
              cursor: isSubgraphTestRunning ? 'default' : 'pointer',
            }}
          >
            {isSubgraphTestRunning ? 'Running...' : 'Test'}
          </button>
        )}
      </div>

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
              {renderPreviewBlock('last output', data.runtimeOutput)}

              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                published to state key
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
            mode: {config.promptMode}
          </div>

          <div style={{ fontSize: 12, marginBottom: 4 }}>
            prompt:{' '}
            {config.promptMode === 'inline' ? '(inline)' : config.prompt || '-'}
          </div>

          <div style={{ fontSize: 12, marginBottom: 4 }}>
            model resource: {config.modelResourceId || '-'}
          </div>

          <div style={{ fontSize: 12, marginBottom: 4 }}>
            outputs: {formatOutputs(outputs)}
          </div>

          {renderPromptWindowSummary(data)}
          {renderInboundBindingsBlock(inboundBindings)}

          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
            prompt variable hints (text-derived, not authoritative):
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
            {config.promptMode === 'inline'
              ? promptVariableHints.join(', ') || '-'
              : 'unavailable in template mode'}
          </div>

          {isExecuted && (
            <>
              {renderPreviewBlock('last inputs', data.runtimeInputs)}
              {renderPreviewBlock('last raw output', data.runtimeOutput)}
              {renderPreviewBlock(
                'last published state',
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
              {renderPreviewBlock('last inputs', data.runtimeInputs)}
              {renderPreviewBlock('last aggregated output', data.runtimeOutput)}

              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                published to state key
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

      {renderSourceHandles(outputs)}
    </div>
  )
}