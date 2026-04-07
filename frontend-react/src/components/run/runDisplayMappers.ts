import type { RunResult } from '../../run/runTypes'
import type { DisplayRun } from './runDisplayModels'
import { buildDisplayFailureInfo } from './display-mappers/displayFailureMapper'
import { buildPrimaryState } from './display-mappers/displayPrimaryState'
import { buildDisplayRunBase } from './display-mappers/displayStepMapper'

/**
 * direct run -> display run 映射层。
 *
 * 本文件角色：
 * - 将后端 RunResult 解释为前端 DisplayRun / DisplayStep
 * - 作为 direct run -> display run 的统一主入口
 *
 * 负责：
 * - 组织 steps / failureInfo / primaryState 的展示层映射
 * - 保留原始 run result 到 raw 字段
 *
 * 不负责：
 * - 定义后端 run contract
 * - 修改原始 run 结果
 * - 组件渲染逻辑
 */
export function buildDisplayRunFromDirectRun(
    runResult: RunResult,
    options?: {
        isStale?: boolean
    }
): DisplayRun {
    const { inputState, finalState, partialState, steps } = buildDisplayRunBase({
        runResult,
    })

    const { primaryState, primaryStateTitle } = buildPrimaryState({
        status: runResult.status,
        finalState,
        partialState,
    })

    return {
        source: 'direct',
        status: runResult.status,
        runScope: runResult.run_scope,
        failureStage: runResult.failure_stage,
        inputState,
        primaryState,
        primaryStateTitle,
        steps,
        failureInfo: buildDisplayFailureInfo({
            status: runResult.status,
            steps,
            errorType: runResult.error_type,
            errorMessage: runResult.error_message,
            errorDetail: runResult.error_detail,
        }),
        raw: runResult,
        isStale: options?.isStale || false,
    }
}