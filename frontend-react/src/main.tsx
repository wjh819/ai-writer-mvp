import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

/**
 * 前端启动入口。
 *
 * 当前职责：
 * - 引入全局样式
 * - 获取页面 root 容器
 * - 创建 React 根节点
 * - 挂载应用顶层组件 App
 *
 * 注意：
 * - 这里只负责应用启动装配
 * - 不承载业务逻辑或页面状态
 */
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error("Root element '#root' not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)