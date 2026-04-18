import type { DisplayRun } from '../runDisplayModels'
import { ValueBlock } from '../RunValueBlock'

interface RunFailureSummaryProps {
    displayRun: DisplayRun
}

function getFailureSummaryTitle(displayRun: DisplayRun): string {
    return displayRun.runScope === 'subgraph'
        ? '节点测试失败摘要'
        : '运行失败摘要'
}

export default function RunFailureSummary({
                                              displayRun,
                                          }: RunFailureSummaryProps) {
    if (!displayRun.failureInfo) {
        return null
    }

    return (
        <div
            style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: 12,
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {getFailureSummaryTitle(displayRun)}
            </div>

            <div style={{ marginBottom: 4 }}>
                <strong>类型：</strong> {displayRun.failureInfo.typeLabel}
            </div>

            {displayRun.failureInfo.failedNode ? (
                <div style={{ marginBottom: 4 }}>
                    <strong>失败步骤：</strong> {displayRun.failureInfo.failedNode}
                </div>
            ) : null}

            <div style={{ marginBottom: 8 }}>{displayRun.failureInfo.summary}</div>

            {displayRun.failureInfo.detail ? (
                <ValueBlock
                    title='错误详情'
                    value={displayRun.failureInfo.detail}
                    collapsed={false}
                />
            ) : null}
        </div>
    )
}
