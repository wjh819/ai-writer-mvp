import type { DisplayRun } from '../runDisplayModels'

interface RunResultHeaderProps {
  displayRun: DisplayRun | null
}

function getPanelTitle(displayRun: DisplayRun | null): string {
  if (!displayRun) {
    return '运行结果'
  }

  if (displayRun.runScope === 'subgraph') {
    return '节点测试结果'
  }

  if (displayRun.isLive) {
    return '实时运行'
  }

  return '运行结果'
}

function getLiveMessage(displayRun: DisplayRun): string {
  const lines = ['实时运行仍在进行中。']

  if (displayRun.activeNodeId) {
    lines.push(`当前活动节点：${displayRun.activeNodeId}`)
  }

  if (displayRun.runId) {
    lines.push(`运行 ID：${displayRun.runId}`)
  }

  return lines.join('\n')
}

function getStaleMessage(displayRun: DisplayRun): string {
  if (displayRun.runScope === 'subgraph') {
    return '该节点测试结果属于当前工作流图的较旧语义版本，仅供参考。'
  }

  return '该运行结果属于当前工作流图的较旧语义版本，仅供参考。'
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
            <strong>状态：</strong> {displayRun.status || '-'}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>范围：</strong> {displayRun.runScope || '-'}
          </div>
        </>
      ) : null}

      {displayRun?.runId ? (
        <div style={{ marginBottom: 8 }}>
          <strong>运行 ID：</strong> {displayRun.runId}
        </div>
      ) : null}

      {displayRun?.isLive && displayRun.activeNodeId ? (
        <div style={{ marginBottom: 8 }}>
          <strong>活动节点：</strong> {displayRun.activeNodeId}
        </div>
      ) : null}
    </>
  )
}
