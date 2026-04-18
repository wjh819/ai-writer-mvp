import 'reactflow/dist/style.css'

import WorkflowEditorPageShell from './workflow-page/shell/WorkflowEditorPageShell'
import { useWorkflowEditorPageAssembler } from './workflow-page/orchestration/useWorkflowEditorPageAssembler'
import { useWorkflowPageContext } from './workflow-page/orchestration/useWorkflowPageContext'

const DEFAULT_CANVAS_ID = 'article'

export default function WorkflowEditor() {
  const pageContext = useWorkflowPageContext(DEFAULT_CANVAS_ID)
  const { pageShellProps } = useWorkflowEditorPageAssembler({
    pageContext,
  })

  return <WorkflowEditorPageShell {...pageShellProps} />
}
