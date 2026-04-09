import type { LiveRunSnapshot, RunResult } from '../../run/runTypes'
import type { DisplayRun } from './runDisplayModels'
import { buildDisplayFailureInfo } from './display-mappers/displayFailureMapper'
import { buildPrimaryState } from './display-mappers/displayPrimaryState'
import { buildDisplayRunBase } from './display-mappers/displayStepMapper'

function normalizeLiveDisplayStatus(
    status: LiveRunSnapshot['status']
): DisplayRun['status'] {
    /**
     * 说明：
     * - buildDisplayRunFromLiveSnapshot 只应该用于“已有活动 live snapshot”的展示
     * - idle 不是正式展示态；若调用方误传 idle，这里回退成 running，避免 display 层崩掉
     * - 正常主链应由页面层保证：idle snapshot 不进入 display mapper
     */
    return status === 'idle' ? 'running' : status
}

/**
 * direct run / live run -> display run 映射层。
 *
 * 本文件角色：
 * - 将后端 RunResult / LiveRunSnapshot 解释为前端 DisplayRun / DisplayStep
 * - 作为 run display 的统一映射入口
 *
 * 负责：
 * - 组织 steps / failureInfo / primaryState 的展示层映射
 * - 保留原始 run result / live snapshot 到 raw 字段
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
    const { inputState, currentState, finalState, partialState, steps } =
        buildDisplayRunBase({
            runResult,
        })

    const { primaryState, primaryStateTitle } = buildPrimaryState({
        status: runResult.status,
        currentState,
        finalState,
        partialState,
    })

    return {
        source: 'direct',
        status: runResult.status,
        runScope: runResult.run_scope,
        failureStage: runResult.failure_stage,
        inputState,
        currentState,
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
        runId: undefined,
        activeNodeId: null,
        isLive: false,
    }
}

export function buildDisplayRunFromLiveSnapshot(
    snapshot: LiveRunSnapshot,
    options?: {
        isStale?: boolean
    }
): DisplayRun {
    const displayStatus = normalizeLiveDisplayStatus(snapshot.status)

    const normalizedSnapshot = {
        ...snapshot,
        status: displayStatus,
    }

    const { inputState, currentState, finalState, partialState, steps } =
        buildDisplayRunBase({
            runResult: normalizedSnapshot,
        })

    const { primaryState, primaryStateTitle } = buildPrimaryState({
        status: displayStatus,
        currentState,
        finalState,
        partialState,
    })

    return {
        source: 'live',
        status: displayStatus,
        runScope: snapshot.run_scope,
        failureStage: snapshot.failure_stage,
        inputState,
        currentState,
        primaryState,
        primaryStateTitle,
        steps,
        failureInfo:
            displayStatus === 'running'
                ? null
                : buildDisplayFailureInfo({
                      status: displayStatus,
                      steps,
                      errorType: snapshot.error_type,
                      errorMessage: snapshot.error_message,
                      errorDetail: snapshot.error_detail,
                  }),
        raw: snapshot,
        isStale: options?.isStale || false,
        runId: snapshot.run_id ?? undefined,
        activeNodeId: snapshot.active_node_id ?? null,
        isLive: true,
    }
}