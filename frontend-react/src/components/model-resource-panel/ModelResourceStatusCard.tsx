import type { ModelResourceConfigHealth } from '../../model-resources/modelResourceTypes'

interface ModelResourceStatusCardProps {
    modelResourceStatus: ModelResourceConfigHealth | null
    statusErrorMessage: string
}

function getStatusText(status: ModelResourceConfigHealth['status']) {
    switch (status) {
        case 'file_missing':
            return 'Config file is missing'
        case 'file_invalid':
            return 'Config file is invalid'
        case 'file_empty':
            return 'Config file is empty'
        case 'file_active':
            return 'Config file is active'
        default:
            return status
    }
}

export default function ModelResourceStatusCard({
                                                    modelResourceStatus,
                                                    statusErrorMessage,
                                                }: ModelResourceStatusCardProps) {
    return (
        <div
            style={{
                marginBottom: 16,
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Resource Status
            </div>

            {statusErrorMessage ? (
                <div style={{ fontSize: 12, color: '#b91c1c' }}>{statusErrorMessage}</div>
            ) : modelResourceStatus ? (
                <>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <strong>Status:</strong> {getStatusText(modelResourceStatus.status)}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
                        <strong>Config Path:</strong> {modelResourceStatus.config_path}
                    </div>
                </>
            ) : (
                <div style={{ fontSize: 12, color: '#666' }}>
                    Loading resource status...
                </div>
            )}
        </div>
    )
}