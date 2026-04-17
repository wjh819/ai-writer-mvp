import type { DisplayRun } from './runDisplayModels'
import RunResultSteps from './RunResultSteps'
import RunStateOverview from './RunStateOverview'
import RunFailureSummary from './panel/RunFailureSummary'
import RunRawJsonPanel from './panel/RunRawJsonPanel'
import RunResultHeader from './panel/RunResultHeader'

/**
 * run 结果总展示面板。
 *
 * 本文件角色：
 * - 消费 DisplayRun 并组织总体展示
 * - 组合 header、失败摘要、整体 state 总览、步骤列表与原始 JSON 透视
 *
 * 负责：
 * - 展示一次 display run 的整体信息
 * - 作为 RunResultSteps / RunStateOverview / panel 子组件的上层装配组件
 *
 * 不负责：
 * - 解释后端 transport contract
 * - direct run -> display run 映射
 * - 逐步 writeback diff 的生成
 */
export interface RunResultPanelProps {
    displayRun: DisplayRun | null
}

export default function RunResultPanel({
                                           displayRun,
                                       }: RunResultPanelProps) {
    return (
        <div
            style={{
                height: 320,
                borderTop: '1px solid #ddd',
                padding: 12,
                overflow: 'auto',
                background: '#f8fafc',
            }}
        >
            <RunResultHeader displayRun={displayRun} />

            {!displayRun ? <div style={{ color: '#666' }}>No run result yet</div> : null}

            {displayRun ? (
                <>
                    <div
                        style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 12,
                        }}
                    >
                        <RunFailureSummary displayRun={displayRun} />

                        <RunStateOverview
                            inputState={displayRun.inputState}
                            resultState={displayRun.primaryState}
                            resultStateTitle={displayRun.primaryStateTitle}
                        />
                    </div>

                    <RunResultSteps steps={displayRun.steps} />

                    <RunRawJsonPanel value={displayRun.raw} />
                </>
            ) : null}
        </div>
    )
}