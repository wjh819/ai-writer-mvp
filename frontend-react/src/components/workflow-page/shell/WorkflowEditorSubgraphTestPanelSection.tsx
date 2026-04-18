import type { ModelResourceListItem } from '../../../model-resources/modelResourceTypes'
import type {
  WorkflowEditorNode,
} from '../../../workflow-editor/workflowEditorGraphTypes'
import NodeConfigPanel from '../../NodeConfigPanel'
import type { WorkflowEditorSubgraphTestSectionBindings } from '../subgraph/useWorkflowEditorSubgraphTestSection'

interface WorkflowEditorSubgraphTestPanelSectionProps {
  selectedNode: WorkflowEditorNode | null
  selectedDisplayNode: WorkflowEditorNode | null
  isGraphEditingLocked: boolean
  onChange: (node: WorkflowEditorNode) => void
  onDelete: (nodeId: string) => void
  modelResources: ModelResourceListItem[]
  subgraphTestSection: WorkflowEditorSubgraphTestSectionBindings
}

export default function WorkflowEditorSubgraphTestPanelSection({
  selectedNode,
  selectedDisplayNode,
  isGraphEditingLocked,
  onChange,
  onDelete,
  modelResources,
  subgraphTestSection,
}: WorkflowEditorSubgraphTestPanelSectionProps) {
  return (
    <div
      style={{
        width: 360,
        borderLeft: '1px solid #ddd',
        background: '#fafafa',
        overflow: 'auto',
      }}
    >
      <NodeConfigPanel
        node={selectedNode}
        derivedTargetInputs={
          selectedDisplayNode?.data.derivedTargetInputs ?? []
        }
        inboundBindings={selectedDisplayNode?.data.inboundBindings ?? []}
        promptVariableHints={
          selectedDisplayNode?.data.promptVariableHints ?? []
        }
        graphWindowMode={selectedDisplayNode?.data.graphWindowMode}
        graphWindowSourceNodeId={
          selectedDisplayNode?.data.graphWindowSourceNodeId
        }
        graphWindowTargetNodeIds={
          selectedDisplayNode?.data.graphWindowTargetNodeIds ?? []
        }
        isSubgraphTestRunning={Boolean(
          selectedDisplayNode?.data.isSubgraphTestRunning
        )}
        isGraphEditingLocked={isGraphEditingLocked}
        isNodeTestLocked={subgraphTestSection.isNodeTestLocked}
        onChange={onChange}
        onDelete={onDelete}
        modelResources={modelResources}
        pinnedInputDraftTexts={subgraphTestSection.pinnedInputDraftTexts}
        onPinnedInputDraftChange={
          subgraphTestSection.onPinnedInputDraftChange
        }
        isSubgraphTestExpanded={subgraphTestSection.isSubgraphTestExpanded}
        onSetSubgraphTestExpanded={
          subgraphTestSection.onSetSubgraphTestExpanded
        }
        effectiveSubgraphTestInputItems={
          subgraphTestSection.effectiveSubgraphTestInputItems
        }
        onRunSubgraphTest={subgraphTestSection.onRunSubgraphTest}
        onClearSubgraphTestResult={
          subgraphTestSection.onClearSubgraphTestResult
        }
        onResetSubgraphTestContext={
          subgraphTestSection.onResetSubgraphTestContext
        }
        selectedSubgraphTestDisplayRun={
          subgraphTestSection.selectedSubgraphTestDisplayRun
        }
        subgraphTestErrorMessage={
          subgraphTestSection.subgraphTestErrorMessage
        }
        subgraphTestInfoMessage={subgraphTestSection.subgraphTestInfoMessage}
      />
    </div>
  )
}

