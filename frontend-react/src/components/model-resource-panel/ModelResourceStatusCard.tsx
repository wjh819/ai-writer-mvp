import type { ModelResourceConfigHealth } from '../../model-resources/modelResourceTypes'

interface ModelResourceStatusCardProps {
    modelResourceStatus: ModelResourceConfigHealth | null
    statusErrorMessage: string
}

function getStatusText(status: ModelResourceConfigHealth['status']) {
    switch (status) {
        case 'file_missing':
            return '配置文件缺失'
        case 'file_invalid':
            return '配置文件无效'
        case 'file_empty':
            return '配置文件为空'
        case 'file_active':
            return '配置文件已启用'
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
                资源状态
            </div>

            {statusErrorMessage ? (
                <div style={{ fontSize: 12, color: '#b91c1c' }}>{statusErrorMessage}</div>
            ) : modelResourceStatus ? (
                <>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <strong>状态：</strong> {getStatusText(modelResourceStatus.status)}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
                        <strong>配置路径：</strong> {modelResourceStatus.config_path}
                    </div>
                </>
            ) : (
                <div style={{ fontSize: 12, color: '#666' }}>
                    正在加载资源状态...
                </div>
            )}
        </div>
    )
}
