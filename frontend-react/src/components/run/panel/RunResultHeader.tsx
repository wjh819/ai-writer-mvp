import type { DisplayRun } from '../runDisplayModels'

interface RunResultHeaderProps {
    displayRun: DisplayRun | null
}

function getPanelTitle(displayRun: DisplayRun | null): string {
    if (!displayRun) {
        return 'Run Result'
    }

    return displayRun.runScope === 'subgraph' ? 'Node Test Result' : 'Run Result'
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

            {displayRun?.isStale ? (
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
        </>
    )
}