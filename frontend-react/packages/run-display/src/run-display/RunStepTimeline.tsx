import type { DisplayStep } from './runDisplayModels'
import RunResultStepCard from './RunResultStepCard'

function StepTimelineCard({
  step,
}: {
  step: DisplayStep
}) {
  return <RunResultStepCard step={step} />
}

/**
 * 通用步骤时间线组件。
 *
 * 职责：
 * - 以统一时间线样式渲染步骤列表
 * - 供 workflow 即时运行结果时间线展示复用
 *
 * 边界：
 * - 当前统一展示 DisplayStep 上已经映射好的 writeback 信息
 * - 不再区分 direct run / persisted run 的步骤卡片壳
 */
export function StepTimeline({
  steps,
  emptyText,
}: {
  steps: DisplayStep[]
  emptyText: string
}) {
  if (!steps.length) {
    return <div style={{ color: '#666', fontSize: 13 }}>{emptyText}</div>
  }

  return (
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
        <StepTimelineCard key={step.id} step={step} />
      ))}
    </div>
  )
}