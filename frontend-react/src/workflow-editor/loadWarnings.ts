export interface WorkflowLoadWarning {
    code: string
    level: 'warning'
    message: string
    nodeId?: string
    resourceId?: string
    promptName?: string
}