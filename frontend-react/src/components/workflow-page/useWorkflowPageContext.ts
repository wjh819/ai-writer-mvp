import { useCallback, useMemo, useState } from 'react'

import type { WorkflowLoadWarning } from '../../workflow-editor/workflowEditorUiTypes'

export function useWorkflowPageContext(defaultCanvasId: string) {
    const [requestedCanvasId, setRequestedCanvasId] = useState(defaultCanvasId)
    const [activeCanvasId, setActiveCanvasId] = useState(defaultCanvasId)
    const [activeWorkflowContextId, setActiveWorkflowContextId] = useState(1)
    const [temporaryCanvasId, setTemporaryCanvasId] = useState<string | null>(null)

    const [graphSemanticVersion, setGraphSemanticVersion] = useState(0)
    const [graphPersistedVersion, setGraphPersistedVersion] = useState(0)
    const [committedGraphPersistedVersion, setCommittedGraphPersistedVersion] =
        useState(0)

    const [workflowWarnings, setWorkflowWarnings] = useState<
        WorkflowLoadWarning[]
    >([])

    const [isModelResourcePanelOpen, setIsModelResourcePanelOpen] =
        useState(false)
    const [pageErrorMessage, setPageErrorMessage] = useState('')
    const [isSwitchingWorkflow, setIsSwitchingWorkflow] = useState(false)

    const clearPageError = useCallback(() => {
        setPageErrorMessage('')
    }, [])

    const handleGraphSemanticChanged = useCallback(() => {
        setGraphSemanticVersion(prev => prev + 1)
    }, [])

    const handleGraphPersistedChanged = useCallback(() => {
        setGraphPersistedVersion(prev => prev + 1)
    }, [])

    const isGraphDirty = useMemo(() => {
        return graphPersistedVersion !== committedGraphPersistedVersion
    }, [graphPersistedVersion, committedGraphPersistedVersion])

    return {
        canvasState: {
            requestedCanvasId,
            activeCanvasId,
            activeWorkflowContextId,
            temporaryCanvasId,
        },
        canvasActions: {
            setRequestedCanvasId,
            setActiveCanvasId,
            setActiveWorkflowContextId,
            setTemporaryCanvasId,
        },
        graphState: {
            graphSemanticVersion,
            graphPersistedVersion,
            committedGraphPersistedVersion,
            isGraphDirty,
        },
        graphActions: {
            setGraphSemanticVersion,
            setGraphPersistedVersion,
            setCommittedGraphPersistedVersion,
            handleGraphSemanticChanged,
            handleGraphPersistedChanged,
        },
        pageState: {
            workflowWarnings,
            pageErrorMessage,
            isSwitchingWorkflow,
            isModelResourcePanelOpen,
        },
        pageActions: {
            setWorkflowWarnings,
            setPageErrorMessage,
            clearPageError,
            setIsSwitchingWorkflow,
            setIsModelResourcePanelOpen,
        },
    }
}
