import type { DisplayStep } from './runDisplayModels'
import RunResultStepCard from './RunResultStepCard'
/**
 * 执行步骤列表展示组件。
 *
 * 本文件角色：
 * - 消费 DisplayStep[] 并按时间线样式渲染步骤列表
 *
 * 负责：
 * - 展示步骤列表标题
 * - 在空列表时返回轻量空态
 * - 将每个 DisplayStep 下发给 RunResultStepCard
 *
 * 不负责：
 * - 计算 writeback diff
 * - 解释 run 语义
 * - 生成 step id
 *
 * 当前限制：
 * - 依赖上游已提供稳定的 display-local step.id
 */
interface RunResultStepsProps {
  steps: DisplayStep[]
}

export default function RunResultSteps({
  steps,
}: RunResultStepsProps) {
  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <strong>Execution Steps</strong>
      </div>

      {steps.length === 0 ? (
        <div style={{ color: '#666' }}>No steps returned</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 12 }}>
          <div
            style={{
              position: 'absolute',
              left: 5,
              top: 6,
              bottom: 6,
              width: 2,
              background: '#e2e8f0',
            }}
          />
          {steps.map(step => (
            <RunResultStepCard key={step.id} step={step} />
          ))}
        </div>
      )}
    </>
  )
}