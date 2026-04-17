import type { DisplayStep } from './runDisplayModels'
import RunStepCardBase from './RunStepCardBase'
import RunStepWritebackSection from './RunStepWritebackSection'

/**
 * 带写回差异展示的运行步骤卡片。
 *
 * 职责：
 * - 在基础步骤卡片外壳之上挂接当前步骤的 state writeback 展示区
 * - 供 RunResultSteps 按顺序渲染单步执行结果
 *
 * 边界：
 * - step 原始内容展示由 RunStepCardBase 负责
 * - 写回差异展示由 RunStepWritebackSection 负责
 * - 本组件只消费 DisplayStep，不再接收并行的 stateChange 输入
 */
interface RunResultStepCardProps {
  step: DisplayStep
}

export default function RunResultStepCard({
  step,
}: RunResultStepCardProps) {
  return (
    <RunStepCardBase step={step}>
      <RunStepWritebackSection writeback={step.writeback} />
    </RunStepCardBase>
  )
}