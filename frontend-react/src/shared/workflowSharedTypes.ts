/**
 * 前端最小共享基础类型层。
 *
 * 本文件角色：
 * - 提供 editor / run / display 可共同依赖的最小基础类型
 *
 * 负责：
 * - 定义 WorkflowState
 * - 定义 PromptMode
 *
 * 不负责：
 * - workflow canonical contract
 * - run transport contract
 * - graph shell type
 * - 运行时校验
 *
 * 上下游：
 * - 上游无业务依赖，是前端共享底层类型
 * - 下游由 editor、run、display 等多处复用
 *
 * 当前限制 / 待收口点：
 * - WorkflowState 当前为宽松 Record<string, unknown>，只表达“黑板态容器”，不表达更精细的状态 schema
 * - PromptMode 为前端共享枚举镜像，需与后端 contract 保持同步
 */
export type WorkflowState = Record<string, unknown>
