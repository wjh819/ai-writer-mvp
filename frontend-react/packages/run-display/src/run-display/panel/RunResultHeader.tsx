import type { DisplayRun } from '../runDisplayModels'

interface RunResultHeaderProps {
  displayRun: DisplayRun | null
}

function getPanelTitle(displayRun: DisplayRun | null): string {
  if (!displayRun) {
    return 'Run Result'
  }

  if (displayRun.runScope === 'subgraph') {
    return 'Node Test Result'
  }

  if (displayRun.isLive) {
    return 'Live Run'
  }

  return 'Run Result'
}

function getLiveMessage(displayRun: DisplayRun): string {
  const lines = ['Live run is still in progress.']

  if (displayRun.activeNodeId) {
    lines.push(`Current active node: ${displayRun.activeNodeId}`)
  }

  if (displayRun.runId) {
    lines.push(`Run ID: ${displayRun.runId}`)
  }

  return lines.join('\n')
}

function getStaleMessage(displayRun: DisplayRun): string {
  if (displayRun.runScope === 'subgraph') {
    return 'This node test result belongs to an older semantic version of the current workflow graph. It is kept for reference only.'
  }

  return 'This run result belongs to an older semantic version of the current workflow graph. It is kept for reference only.'
}

export default function RunResultHeader({
  displayRun,
}: RunResultHeaderProps) {
  return (
    <>
      <h4 style={{ marginTop: 0 }}>{getPanelTitle(displayRun)}</h4>

      {displayRun?.isLive && displayRun.status === 'running' ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #93c5fd',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {getLiveMessage(displayRun)}
        </div>
      ) : null}

      {displayRun?.isStale && !displayRun.isLive ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            color: '#92400e',
            fontSize: 12,
          }}
        >
          {getStaleMessage(displayRun)}
        </div>
      ) : null}

      {displayRun ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {displayRun.status || '-'}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Scope:</strong> {displayRun.runScope || '-'}
          </div>
        </>
      ) : null}

      {displayRun?.runId ? (
        <div style={{ marginBottom: 8 }}>
          <strong>Run ID:</strong> {displayRun.runId}
        </div>
      ) : null}

      {displayRun?.isLive && displayRun.activeNodeId ? (
        <div style={{ marginBottom: 8 }}>
          <strong>Active Node:</strong> {displayRun.activeNodeId}
        </div>
      ) : null}
    </>
  )
}