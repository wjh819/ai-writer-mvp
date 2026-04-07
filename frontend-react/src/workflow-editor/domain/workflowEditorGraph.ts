/**
 * 前端 graph rule / graph-sync 层总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 graph helper / connect / removal / mode sync / node sync 拆分到子文件
 *
 * 注意：
 * - 当前仅做文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export {
    buildTempEdgeId,
    buildTempContextLinkId,
    trim,
    getNodeOutputs,
    findNodeById,
    hasOutputName,
    getNodeType,
    isInputNode,
    isPromptNode,
    getPromptModelResourceId,
    isOutputReferenced,
    syncOutboundEdgesForOutputRename,
    buildOutputRenamePlan,
} from './graphHelpers'

export { connectEdgeWithNodeSync } from './edgeConnectRules'

export {
    connectContextLinkWithGraphSync,
    validatePromptContextModelConsistency,
} from './contextLinkRules'

export {
    deleteContextLinkInGraph,
    removeEdgesWithNodeSync,
    removeContextLinksWithNodeSync,
    removeNodesWithGraphSync,
    deleteNodeInGraph,
} from './graphRemoval'

export { applyUpdatedNodeInGraph } from './nodeGraphSync'

export { updateContextLinkModeInGraph } from './contextLinkModeSync'