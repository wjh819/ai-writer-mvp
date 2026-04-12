import 'reactflow/dist/style.css'

import WorkflowEditorPageShell from './workflow-page/WorkflowEditorPageShell'
import { useWorkflowEditorPageAssembler } from './workflow-page/useWorkflowEditorPageAssembler'
import { useWorkflowPageContext } from './workflow-page/useWorkflowPageContext'

const DEFAULT_CANVAS_ID = 'article'

export default function WorkflowEditor() {
  const pageContext = useWorkflowPageContext(DEFAULT_CANVAS_ID)
  const { pageShellProps } = useWorkflowEditorPageAssembler({
    pageContext,
  })

  return <WorkflowEditorPageShell {...pageShellProps} />
}
