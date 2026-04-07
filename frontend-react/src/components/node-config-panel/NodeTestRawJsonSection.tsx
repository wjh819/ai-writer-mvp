import type { DisplayRun } from '../run/runDisplayModels'
import { PrettyJson } from '../run/RunValueBlock'

interface NodeTestRawJsonSectionProps {
    displayRun: DisplayRun | null
}

export default function NodeTestRawJsonSection({
                                                   displayRun,
                                               }: NodeTestRawJsonSectionProps) {
    if (!displayRun) {
        return null
    }

    return (
        <details>
            <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                Raw Test Result
            </summary>
            <div style={{ marginTop: 8 }}>
                <PrettyJson value={displayRun.raw} collapsed />
            </div>
        </details>
    )
}