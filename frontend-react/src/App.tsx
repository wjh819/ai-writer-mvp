import WorkflowEditor from './components/WorkflowEditor'

/**
 * 前端应用顶层组件。
 *
 * 当前职责：
 * - 作为 React 应用根组件
 * - 挂载 workflow 编辑器主页面
 *
 * 注意：
 * - 本文件本身不承载页面状态管理
 * - 不直接处理 workflow 编辑、运行与模型资源管理逻辑
 * - 真实页面装配与交互主链下沉到 WorkflowEditor
 */
function App() {
  return <WorkflowEditor />
}

export default App