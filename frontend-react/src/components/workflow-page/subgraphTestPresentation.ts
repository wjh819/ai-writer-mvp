import type {
  SubgraphTestInputSource,
} from '../../workflow-editor/state/workflowEditorSubgraphTestInputs'

export function getEffectiveSourceLabel(source: SubgraphTestInputSource): string {
  switch (source) {
    case 'reusable':
      return 'Reusable'
    case 'pinned':
      return 'Pinned'
    default:
      return 'Missing'
  }
}

export function getEffectiveSourceStyles(source: SubgraphTestInputSource) {
  switch (source) {
    case 'reusable':
      return {
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
      }
    case 'pinned':
      return {
        border: '1px solid #c7d2fe',
        background: '#eef2ff',
        color: '#4338ca',
      }
    default:
      return {
        border: '1px solid #e5e7eb',
        background: '#f8fafc',
        color: '#64748b',
      }
  }
}
