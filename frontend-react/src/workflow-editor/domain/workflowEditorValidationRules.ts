import type { WorkflowContextLink, NodeOutputSpec } from '../workflowEditorTypes'
import type {
    WorkflowEditorEdge,
    WorkflowEditorNode,
} from '../workflowEditorGraphTypes'
import { hasExecutionPath } from './workflowEditorExecutionGraph'

/**
 * 前端细粒度校验规则层。
 *
 * 本文件角色：
 * - 对当前编辑态做批量轻量规则检查
 * - 返回首个用户可展示的错误字符串
 *
 * 负责：
 * - output / stateKey / input binding / contextLink 等基础规则检查
 * - data edges + contextLinks 的联合执行环轻量预检
 * - 前端保存前的快速错误暴露
 *
 * 不负责：
 * - 自动修复
 * - 外部依赖检查
 * - 后端正式合法性裁决
 * - 默认值补齐
 *
 * 上下游：
 * - 上游由 actions / validators 层传入当前编辑态 nodes / edges / contextLinks
 * - 下游返回首个错误字符串，供 UI 直接展示
 *
 * 当前限制 / 待收口点：
 * - 本文件规则是 UX 层提前提示，不是正式 contract owner
 * - context outbound 规则当前只实现“最多一个 continue”，可能弱于完整业务目标
 * - cycle path 逻辑改为复用共享 execution graph helper
 */

function getNodeOutputs(node: WorkflowEditorNode): NodeOutputSpec[] {
    const config = node?.data?.config
    return Array.isArray(config?.outputs) ? config.outputs : []
}

function trim(value: unknown): string {
    if (value === null || typeof value === 'undefined') {
        return ''
    }
    return String(value).trim()
}

function isPromptNode(node: WorkflowEditorNode | undefined): boolean {
    return trim(node?.data?.config?.type) === 'prompt'
}

function getNodeType(node: WorkflowEditorNode | undefined): string {
    return trim(node?.data?.config?.type)
}

function getPromptModelResourceId(node: WorkflowEditorNode | undefined): string {
    const config = node?.data?.config
    if (!config || config.type !== 'prompt') {
        return ''
    }
    return trim(config.modelResourceId)
}

/**
 * 判断标识符是否满足合法格式。
 */
export function isValidOutputFormat(value: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

/**
 * 通用标识符格式校验。
 *
 * 用途：
 * - output.name
 * - stateKey
 * - inputKey
 * - edge targetInput / sourceOutput
 *
 * 返回：
 * - 空字符串：通过
 * - 非空字符串：可直接展示给用户的首个错误
 *
 * 注意：
 * - 这是前端 UX 层规则，不替代后端正式 validator
 */
export function validateOutputFormat(value: string): string {
    const nextValue = trim(value)

    if (!nextValue) {
        return 'Value is required'
    }

    if (!isValidOutputFormat(nextValue)) {
        return 'Value must start with a letter or underscore, and contain only letters, numbers, and underscores'
    }

    return ''
}

export function isValidOutputValue(value: string): boolean {
    return !validateOutputFormat(value)
}

/**
 * 校验 data edges 的基础引用关系。
 *
 * 负责：
 * - source / target 节点存在性
 * - input 节点禁止 inbound binding
 * - sourceOutput / targetInput 格式
 * - sourceOutput 必须存在于 source 节点 outputs
 * - 同一 targetInput 只能绑定一次
 *
 * 不负责：
 * - dependency 校验
 * - 运行时缺值校验
 */
export function validateEdgeReferences(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[]
): string {
    const nodeMap = new Map<string, WorkflowEditorNode>(
        (nodes || []).map(node => [node.id, node])
    )

    const targetInputOwners = new Map<string, string>()

    for (const edge of edges || []) {
        const source = trim(edge.source)
        const target = trim(edge.target)
        const sourceOutput = trim(edge.sourceOutput)
        const targetInput = trim(edge.targetInput)

        if (!source || !target) {
            return 'Edge source/target cannot be empty'
        }

        if (!nodeMap.has(source)) {
            return `Edge source node not found: ${source}`
        }

        if (!nodeMap.has(target)) {
            return `Edge target node not found: ${target}`
        }

        const targetNode = nodeMap.get(target)
        if (getNodeType(targetNode) === 'input') {
            return `Input node '${target}' cannot accept inbound bindings`
        }

        const sourceOutputError = validateOutputFormat(sourceOutput)
        if (sourceOutputError) {
            return `Edge '${source} -> ${target}' sourceOutput invalid: ${sourceOutputError}`
        }

        const targetInputError = validateOutputFormat(targetInput)
        if (targetInputError) {
            return `Edge '${source} -> ${target}' targetInput invalid: ${targetInputError}`
        }

        const sourceNode = nodeMap.get(source)
        const sourceOutputs = getNodeOutputs(sourceNode as WorkflowEditorNode)
        const hasSourceOutput = sourceOutputs.some(
            output => trim(output.name) === sourceOutput
        )

        if (!hasSourceOutput) {
            return `Edge sourceOutput '${sourceOutput}' not found on node '${source}'`
        }

        const targetInputKey = `${target}::${targetInput}`
        if (targetInputOwners.has(targetInputKey)) {
            const previousSource = targetInputOwners.get(targetInputKey)
            return `Target input '${targetInput}' on node '${target}' already bound from '${previousSource}'`
        }

        targetInputOwners.set(targetInputKey, `${source}.${sourceOutput}`)
    }

    return ''
}

/**
 * 校验 workflow 范围内 outputs 规则。
 */
export function validateNodeOutputRules(nodes: WorkflowEditorNode[]): string {
    const nodeIds = new Set((nodes || []).map(node => trim(node.id)).filter(Boolean))
    const stateKeyOwners = new Map<string, string>()

    for (const node of nodes || []) {
        const config = node?.data?.config
        const outputs = getNodeOutputs(node)

        if (outputs.length === 0) {
            return `Node '${node.id}' must declare at least one output`
        }

        const outputNames = new Set<string>()

        for (const output of outputs) {
            const outputName = trim(output.name)
            const stateKey = trim(output.stateKey)

            const outputNameError = validateOutputFormat(outputName)
            if (outputNameError) {
                return `Node '${node.id}' output name invalid: ${outputNameError}`
            }

            const stateKeyError = validateOutputFormat(stateKey)
            if (stateKeyError) {
                return `Node '${node.id}' stateKey invalid: ${stateKeyError}`
            }

            if (outputNames.has(outputName)) {
                return `Node '${node.id}' has duplicate output name '${outputName}'`
            }
            outputNames.add(outputName)

            if (stateKey === node.id) {
                return `Node '${node.id}' stateKey '${stateKey}' cannot be the same as node id`
            }

            if (nodeIds.has(stateKey) && stateKey !== node.id) {
                return `Node '${node.id}' stateKey '${stateKey}' conflicts with existing node id '${stateKey}'`
            }

            if (stateKeyOwners.has(stateKey)) {
                return `StateKey '${stateKey}' is already used by node '${stateKeyOwners.get(stateKey)}'`
            }

            stateKeyOwners.set(stateKey, node.id)
        }

        if (config?.type === 'input') {
            const inputKey = trim(config.inputKey)
            const inputKeyError = validateOutputFormat(inputKey)

            if (inputKeyError) {
                return `Input node '${node.id}' inputKey invalid: ${inputKeyError}`
            }

            if (outputs.length !== 1) {
                return `Input node '${node.id}' must declare exactly one output`
            }
        }

        if (config?.type === 'output') {
            if (outputs.length !== 1) {
                return `Output node '${node.id}' must declare exactly one output`
            }
        }
    }

    return ''
}

export function validateNodeInboundBindingRules(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[]
): string {
    const inboundCount = new Map<string, number>()

    for (const node of nodes || []) {
        inboundCount.set(node.id, 0)
    }

    for (const edge of edges || []) {
        const target = trim(edge.target)
        if (!target) {
            continue
        }
        inboundCount.set(target, (inboundCount.get(target) || 0) + 1)
    }

    for (const node of nodes || []) {
        const nodeType = getNodeType(node)

        if (nodeType === 'output' && (inboundCount.get(node.id) || 0) === 0) {
            return `Output node '${node.id}' must have at least one inbound binding`
        }
    }

    return ''
}

export function validateDataEdgeExecutionCycles(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[]
): string {
    for (let index = 0; index < (edges || []).length; index += 1) {
        const edge = edges[index]
        const source = trim(edge.source)
        const target = trim(edge.target)
        const sourceOutput = trim(edge.sourceOutput)
        const targetInput = trim(edge.targetInput)

        if (!source || !target) {
            continue
        }

        if (source === target) {
            return `Data edge '${source}.${sourceOutput} -> ${target}.${targetInput}' cannot point to itself`
        }

        const otherEdges = (edges || []).filter((_, otherIndex) => otherIndex !== index)

        const wouldCreateCycle = hasExecutionPath({
            startNodeId: target,
            targetNodeId: source,
            nodes,
            edges: otherEdges,
            contextLinks,
        })

        if (wouldCreateCycle) {
            return `Data edge '${source}.${sourceOutput} -> ${target}.${targetInput}' would create a cycle in execution order`
        }
    }

    return ''
}

/**
 * 校验 context source 的 outbound 规则。
 *
 * 当前实现：
 * - 同一 source 最多允许一个 continue outbound context link
 *
 * 注意：
 * - 这是当前前端已实现的最小规则，不代表完整业务目标已经全部收口
 * - 若后续需要更强 topology 规则，应与后端 validator 和 graph 层同步调整
 */
export function validateContextSourceOutboundRules(
    contextLinks: WorkflowContextLink[]
): string {
    const modesBySource = new Map<string, string[]>()

    for (const link of contextLinks || []) {
        const source = trim(link.source)
        const mode = trim(link.mode)

        if (!source || !mode) {
            continue
        }

        const existing = modesBySource.get(source) || []
        existing.push(mode)
        modesBySource.set(source, existing)
    }

    for (const [source, modes] of modesBySource.entries()) {
        const continueCount = modes.filter(mode => mode === 'continue').length
        if (continueCount > 1) {
            return `Prompt node '${source}' can have at most one continue outbound context link`
        }
    }

    return ''
}

/**
 * 校验 contextLinks 的基础引用关系。
 *
 * 当前规则：
 * - id 必填且 workflow 内唯一
 * - source / target 必填且必须存在
 * - 必须是 prompt -> prompt
 * - mode 只能是 continue / branch
 * - 不允许 self-loop
 * - 同一 target 只允许一个 inbound context link
 * - source / target 的 modelResourceId 必须一致
 * - data edges + contextLinks 的联合执行图不能成环
 */
export function validateContextLinkReferences(
    nodes: WorkflowEditorNode[],
    edges: WorkflowEditorEdge[],
    contextLinks: WorkflowContextLink[]
): string {
    const nodeMap = new Map<string, WorkflowEditorNode>(
        (nodes || []).map(node => [node.id, node])
    )

    const contextLinkIds = new Set<string>()
    const targetOwners = new Map<string, string>()

    for (const link of contextLinks || []) {
        const id = trim(link.id)
        const source = trim(link.source)
        const target = trim(link.target)
        const mode = trim(link.mode)

        if (!id) {
            return 'Context link id cannot be empty'
        }

        if (contextLinkIds.has(id)) {
            return `Duplicate context link id: ${id}`
        }
        contextLinkIds.add(id)

        if (!source || !target) {
            return `Context link '${id}' source/target cannot be empty`
        }

        if (source === target) {
            return `Context link '${id}' cannot point to itself`
        }

        if (!nodeMap.has(source)) {
            return `Context link '${id}' source node not found: ${source}`
        }

        if (!nodeMap.has(target)) {
            return `Context link '${id}' target node not found: ${target}`
        }

        const sourceNode = nodeMap.get(source)
        const targetNode = nodeMap.get(target)

        if (!isPromptNode(sourceNode)) {
            return `Context link '${id}' source '${source}' must be a prompt node`
        }

        if (!isPromptNode(targetNode)) {
            return `Context link '${id}' target '${target}' must be a prompt node`
        }

        if (mode !== 'continue' && mode !== 'branch') {
            return `Context link '${id}' has invalid mode '${mode}'`
        }

        if (targetOwners.has(target)) {
            return `Prompt node '${target}' already has inbound context link '${targetOwners.get(target)}'`
        }
        targetOwners.set(target, id)

        const sourceModelResourceId = getPromptModelResourceId(sourceNode)
        const targetModelResourceId = getPromptModelResourceId(targetNode)

        if (
            sourceModelResourceId &&
            targetModelResourceId &&
            sourceModelResourceId !== targetModelResourceId
        ) {
            return `Context link '${id}' requires source/target prompt nodes to use the same model resource`
        }
    }

    const sourceOutboundRuleError =
        validateContextSourceOutboundRules(contextLinks)
    if (sourceOutboundRuleError) {
        return sourceOutboundRuleError
    }

    for (const link of contextLinks || []) {
        const source = trim(link.source)
        const target = trim(link.target)

        const otherLinks = (contextLinks || []).filter(item => item.id !== link.id)
        const wouldCreateCycle = hasExecutionPath({
            startNodeId: target,
            targetNodeId: source,
            nodes,
            edges,
            contextLinks: otherLinks,
        })

        if (wouldCreateCycle) {
            return `Context link '${trim(link.id)}' would create a cycle in execution order`
        }
    }

    return ''
}

export function validateSingleNodeOutput(
    nodes: WorkflowEditorNode[],
    nodeId: string,
    nextOutput: string
): string {
    const nextStateKey = trim(nextOutput)

    const formatError = validateOutputFormat(nextStateKey)
    if (formatError) {
        return formatError
    }

    const nodeIdSet = new Set((nodes || []).map(node => node.id).filter(Boolean))
    if (nextStateKey === nodeId) {
        return `StateKey '${nextStateKey}' cannot be the same as node id '${nodeId}'`
    }

    if (nodeIdSet.has(nextStateKey) && nextStateKey !== nodeId) {
        return `StateKey '${nextStateKey}' conflicts with existing node id '${nextStateKey}'`
    }

    for (const node of nodes || []) {
        if (node.id === nodeId) {
            continue
        }

        const outputs = getNodeOutputs(node)
        const duplicated = outputs.find(
            output => trim(output.stateKey) === nextStateKey
        )

        if (duplicated) {
            return `StateKey '${nextStateKey}' is already used by node '${node.id}'`
        }
    }

    return ''
}