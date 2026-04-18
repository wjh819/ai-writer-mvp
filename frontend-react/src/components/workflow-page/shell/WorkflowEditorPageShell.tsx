import WorkflowModelResourcePanel from '../../WorkflowModelResourcePanel'
import WorkflowSidebar from '../../WorkflowSidebar'
import WorkflowDialogs from './WorkflowDialogs'
import WorkflowEditorCanvasPane from './WorkflowEditorCanvasPane'
import WorkflowEditorSubgraphTestPanelSection from './WorkflowEditorSubgraphTestPanelSection'
import type { WorkflowDialogsState } from '../orchestration/useWorkflowDialogsState'
import type { WorkflowPanelsState } from '../orchestration/useWorkflowPanels'

interface WorkflowEditorPageShellProps {
  panels: WorkflowPanelsState
  dialogs: WorkflowDialogsState
}

export default function WorkflowEditorPageShell({
  panels,
  dialogs,
}: WorkflowEditorPageShellProps) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <WorkflowSidebar {...panels.sidebarProps} />
      <WorkflowEditorCanvasPane {...panels.canvasPaneProps} />
      <WorkflowEditorSubgraphTestPanelSection {...panels.subgraphTestPanelProps} />
      {panels.modelResourcePanelProps ? (
        <WorkflowModelResourcePanel {...panels.modelResourcePanelProps} />
      ) : null}
      <WorkflowDialogs {...dialogs.workflowDialogsProps} />
    </div>
  )
}

