import type { ModelResourceDeleteBlockedDetail } from '../../model-resources/modelResourceTypes'

interface DeleteBlockedDetailProps {
    deleteErrorMessage: string
    deleteBlockedDetail: ModelResourceDeleteBlockedDetail | null
}

export default function DeleteBlockedDetail({
                                                deleteErrorMessage,
                                                deleteBlockedDetail,
                                            }: DeleteBlockedDetailProps) {
    if (!deleteErrorMessage) {
        return null
    }

    return (
        <div
            style={{
                fontSize: 12,
                color: '#991b1b',
                marginBottom: 10,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fef2f2',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {deleteBlockedDetail?.message || deleteErrorMessage}
            </div>

            {!deleteBlockedDetail ? <div>{deleteErrorMessage}</div> : null}

            {deleteBlockedDetail?.references?.length ? (
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        被以下工作流引用
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {deleteBlockedDetail.references.map((item, index) => (
                            <li key={`${item.workflow_name}-${item.node_id}-${index}`}>
                                工作流 {item.workflow_name} 的节点 {item.node_id}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {deleteBlockedDetail?.incomplete_workflows?.length ? (
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        以下工作流未能可靠扫描
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {deleteBlockedDetail.incomplete_workflows.map((item, index) => (
                            <li key={`${item.workflow_name}-${index}`}>
                                <div>{item.workflow_name}</div>
                                <div style={{ color: '#7f1d1d' }}>{item.error_message}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}
