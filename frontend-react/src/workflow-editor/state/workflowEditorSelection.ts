/**
 * selection 总入口。
 *
 * 本文件角色：
 * - 保留既有 import 入口不变
 * - 将 selection reducer / selector 拆分到子文件
 *
 * 注意：
 * - 当前仅做文件内职责拆分
 * - 不改变对外导出名，不改变外部调用面
 */

export type {
    EdgeClickSelectionResult,
    PaneClickSelectionResult,
    NodeClickSelectionResult,
    SelectionChangeResult,
} from './selectionReducers'

export {
    buildEdgeClickSelection,
    buildPaneClickSelection,
    buildNodeClickSelection,
    buildSelectionChangeResult,
} from './selectionReducers'

export { buildSelectedNode } from './selectionSelectors'