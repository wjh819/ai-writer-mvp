import type { WorkflowEditorEdge, WorkflowEditorNode } from '../../workflow-editor/workflowEditorGraphTypes'
import type { WorkflowContextLink } from '../../workflow-editor/workflowEditorTypes'

export interface SemanticGraphSnapshot {
  nodes: WorkflowEditorNode[]
  edges: WorkflowEditorEdge[]
  contextLinks: WorkflowContextLink[]
}

export function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }

  return String(value).trim()
}

export function buildNodeMap(
  nodes: WorkflowEditorNode[]
): Map<string, WorkflowEditorNode> {
  return new Map((nodes || []).map(node => [node.id, node]))
}

export function isSameSemanticNodeConfig(
  previousNode: WorkflowEditorNode,
  nextNode: WorkflowEditorNode
): boolean {
  const previousConfig = previousNode.data.config
  const nextConfig = nextNode.data.config

  if (previousConfig.type !== nextConfig.type) {
    return false
  }

  if (
    JSON.stringify(previousConfig.outputs || []) !==
    JSON.stringify(nextConfig.outputs || [])
  ) {
    return false
  }

  if (previousConfig.type === 'input' && nextConfig.type === 'input') {
    return (
      previousConfig.inputKey === nextConfig.inputKey &&
      previousConfig.defaultValue === nextConfig.defaultValue
    )
  }

  if (previousConfig.type === 'prompt' && nextConfig.type === 'prompt') {
    return (
      previousConfig.promptText === nextConfig.promptText &&
      previousConfig.modelResourceId === nextConfig.modelResourceId &&
      JSON.stringify(previousConfig.llm) === JSON.stringify(nextConfig.llm)
    )
  }

  return true
}

export function collectSemanticChangedNodeIds(
  previousNodes: WorkflowEditorNode[],
  nextNodes: WorkflowEditorNode[]
): Set<string> {
  const changedNodeIds = new Set<string>()
  const previousNodeMap = buildNodeMap(previousNodes)
  const nextNodeMap = buildNodeMap(nextNodes)

  const allNodeIds = new Set<string>([
    ...Array.from(previousNodeMap.keys()),
    ...Array.from(nextNodeMap.keys()),
  ])

  allNodeIds.forEach(nodeId => {
    const previousNode = previousNodeMap.get(nodeId)
    const nextNode = nextNodeMap.get(nodeId)

    if (!previousNode || !nextNode) {
      changedNodeIds.add(nodeId)
      return
    }

    if (!isSameSemanticNodeConfig(previousNode, nextNode)) {
      changedNodeIds.add(nodeId)
    }
  })

  return changedNodeIds
}

export function buildDataEdgeSemanticKey(edge: WorkflowEditorEdge): string {
  return [
    trim(edge.source),
    trim(edge.sourceOutput),
    trim(edge.target),
    trim(edge.targetInput),
  ].join('::')
}

export function collectChangedDataEdgeTargets(
  previousEdges: WorkflowEditorEdge[],
  nextEdges: WorkflowEditorEdge[]
): Set<string> {
  const changedTargets = new Set<string>()

  const previousMap = new Map(
    (previousEdges || []).map(edge => [buildDataEdgeSemanticKey(edge), edge])
  )
  const nextMap = new Map(
    (nextEdges || []).map(edge => [buildDataEdgeSemanticKey(edge), edge])
  )

  const allKeys = new Set<string>([
    ...Array.from(previousMap.keys()),
    ...Array.from(nextMap.keys()),
  ])

  allKeys.forEach(key => {
    const previousEdge = previousMap.get(key)
    const nextEdge = nextMap.get(key)

    if (previousEdge && !nextEdge) {
      const target = trim(previousEdge.target)
      if (target) {
        changedTargets.add(target)
      }
      return
    }

    if (!previousEdge && nextEdge) {
      const target = trim(nextEdge.target)
      if (target) {
        changedTargets.add(target)
      }
    }
  })

  return changedTargets
}

export function buildContextLinkSemanticKey(link: WorkflowContextLink): string {
  return [trim(link.source), trim(link.target), trim(link.mode)].join('::')
}

export function collectChangedContextTargets(
  previousContextLinks: WorkflowContextLink[],
  nextContextLinks: WorkflowContextLink[]
): Set<string> {
  const changedTargets = new Set<string>()

  const previousMap = new Map(
    (previousContextLinks || []).map(link => [
      buildContextLinkSemanticKey(link),
      link,
    ])
  )
  const nextMap = new Map(
    (nextContextLinks || []).map(link => [
      buildContextLinkSemanticKey(link),
      link,
    ])
  )

  const allKeys = new Set<string>([
    ...Array.from(previousMap.keys()),
    ...Array.from(nextMap.keys()),
  ])

  allKeys.forEach(key => {
    const previousLink = previousMap.get(key)
    const nextLink = nextMap.get(key)

    if (previousLink && !nextLink) {
      const target = trim(previousLink.target)
      if (target) {
        changedTargets.add(target)
      }
      return
    }

    if (!previousLink && nextLink) {
      const target = trim(nextLink.target)
      if (target) {
        changedTargets.add(target)
      }
    }
  })

  return changedTargets
}

export function collectUpstreamNodeIds(
  anchorNodeId: string,
  nodes: WorkflowEditorNode[],
  edges: WorkflowEditorEdge[],
  contextLinks: WorkflowContextLink[]
): Set<string> {
  const normalizedAnchorNodeId = trim(anchorNodeId)
  const upstreamNodeIds = new Set<string>()

  if (!normalizedAnchorNodeId) {
    return upstreamNodeIds
  }

  const reverseAdjacency = new Map<string, string[]>()

  ;(nodes || []).forEach(node => {
    reverseAdjacency.set(node.id, reverseAdjacency.get(node.id) || [])
  })

  ;(edges || []).forEach(edge => {
    const source = trim(edge.source)
    const target = trim(edge.target)

    if (!source || !target) {
      return
    }

    reverseAdjacency.set(target, [
      ...(reverseAdjacency.get(target) || []),
      source,
    ])
  })

  ;(contextLinks || []).forEach(link => {
    const source = trim(link.source)
    const target = trim(link.target)

    if (!source || !target) {
      return
    }

    reverseAdjacency.set(target, [
      ...(reverseAdjacency.get(target) || []),
      source,
    ])
  })

  const stack = [normalizedAnchorNodeId]

  while (stack.length > 0) {
    const currentNodeId = trim(stack.pop())
    if (!currentNodeId || upstreamNodeIds.has(currentNodeId)) {
      continue
    }

    upstreamNodeIds.add(currentNodeId)

    ;(reverseAdjacency.get(currentNodeId) || []).forEach(previousNodeId => {
      if (!upstreamNodeIds.has(previousNodeId)) {
        stack.push(previousNodeId)
      }
    })
  }

  return upstreamNodeIds
}

export function shouldInvalidateSubgraphTestContextForSemanticChange(params: {
  previousSnapshot: SemanticGraphSnapshot
  nextSnapshot: SemanticGraphSnapshot
  anchorNodeId: string
}): boolean {
  const { previousSnapshot, nextSnapshot, anchorNodeId } = params

  const changedNodeIds = collectSemanticChangedNodeIds(
    previousSnapshot.nodes,
    nextSnapshot.nodes
  )
  const changedDataEdgeTargets = collectChangedDataEdgeTargets(
    previousSnapshot.edges,
    nextSnapshot.edges
  )
  const changedContextTargets = collectChangedContextTargets(
    previousSnapshot.contextLinks,
    nextSnapshot.contextLinks
  )

  if (
    changedNodeIds.size === 0 &&
    changedDataEdgeTargets.size === 0 &&
    changedContextTargets.size === 0
  ) {
    return false
  }

  const relatedNodeIds = new Set<string>([
    ...Array.from(
      collectUpstreamNodeIds(
        anchorNodeId,
        previousSnapshot.nodes,
        previousSnapshot.edges,
        previousSnapshot.contextLinks
      )
    ),
    ...Array.from(
      collectUpstreamNodeIds(
        anchorNodeId,
        nextSnapshot.nodes,
        nextSnapshot.edges,
        nextSnapshot.contextLinks
      )
    ),
  ])

  if (relatedNodeIds.size === 0) {
    relatedNodeIds.add(anchorNodeId)
  }

  for (const nodeId of changedNodeIds) {
    if (relatedNodeIds.has(nodeId)) {
      return true
    }
  }

  for (const targetNodeId of changedDataEdgeTargets) {
    if (relatedNodeIds.has(targetNodeId)) {
      return true
    }
  }

  for (const targetNodeId of changedContextTargets) {
    if (relatedNodeIds.has(targetNodeId)) {
      return true
    }
  }

  return false
}
