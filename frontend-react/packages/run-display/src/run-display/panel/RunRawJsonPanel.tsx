import { PrettyJson } from '../RunValueBlock'

interface RunRawJsonPanelProps {
    value: unknown
}

export default function RunRawJsonPanel({
                                            value,
                                        }: RunRawJsonPanelProps) {
    return (
        <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Raw JSON</summary>
            <div style={{ marginTop: 8 }}>
                <PrettyJson value={value} />
            </div>
        </details>
    )
}