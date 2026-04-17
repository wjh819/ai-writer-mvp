interface PrettyJsonProps {
  value: unknown
  collapsed?: boolean
  scrollable?: boolean
  maxHeight?: number | null
}

function getValueKind(value: unknown) {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  return typeof value
}

function getValueSummary(value: unknown) {
  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }

  if (value && typeof value === 'object') {
    return `Object(${Object.keys(value as Record<string, unknown>).length})`
  }

  if (typeof value === 'string') {
    return value.length > 80 ? `String(${value.length})` : 'String'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'undefined') {
    return 'undefined'
  }

  return String(value)
}

function safeJsonStringify(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2)
    return typeof text === 'string' ? text : String(value)
  } catch {
    return String(value)
  }
}

function buildPreStyle(params: {
  scrollable: boolean
  maxHeight: number | null
  margin: string | number
}) {
  const { scrollable, maxHeight, margin } = params

  return {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    margin,
    background: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 12,
    maxHeight: scrollable && typeof maxHeight === 'number' ? maxHeight : undefined,
    overflow: scrollable ? ('auto' as const) : ('visible' as const),
  }
}

export function PrettyJson({
  value,
  collapsed = false,
  scrollable = true,
  maxHeight = 240,
}: PrettyJsonProps) {
  const text = safeJsonStringify(value)

  if (collapsed) {
    return (
      <details>
        <summary style={{ cursor: 'pointer', color: '#334155', fontSize: 12 }}>
          {getValueSummary(value)}
        </summary>
        <pre
          style={buildPreStyle({
            scrollable,
            maxHeight,
            margin: '8px 0 0 0',
          })}
        >
          {text}
        </pre>
      </details>
    )
  }

  return (
    <pre
      style={buildPreStyle({
        scrollable,
        maxHeight,
        margin: 0,
      })}
    >
      {text}
    </pre>
  )
}

export function ValueBlock({
  title,
  value,
  collapsed = true,
}: {
  title: string
  value: unknown
  collapsed?: boolean
}) {
  const kind = getValueKind(value)

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 4,
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {kind} | {getValueSummary(value)}
        </div>
      </div>

      {typeof value === 'string' ? (
        <details open={!collapsed}>
          <summary style={{ cursor: 'pointer', color: '#334155', fontSize: 12 }}>
            {collapsed ? 'Expand text' : 'Collapse text'}
          </summary>
          <pre
            style={buildPreStyle({
              scrollable: true,
              maxHeight: 240,
              margin: '8px 0 0 0',
            })}
          >
            {value}
          </pre>
        </details>
      ) : (
        <PrettyJson value={value} collapsed={collapsed} />
      )}
    </div>
  )
}
