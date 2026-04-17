import type { LiveRunSnapshot, RunResult } from '../run/runDisplayInputTypes'
import type { DisplayRun } from './runDisplayModels'
import { buildDisplayFailureInfo } from './display-mappers/displayFailureMapper'
import { buildPrimaryState } from './display-mappers/displayPrimaryState'
import { buildDisplayRunBase } from './display-mappers/displayStepMapper'

function normalizeLiveDisplayStatus(
    status: LiveRunSnapshot['status']
): DisplayRun['status'] {
    /**
     * 璇存槑锛?
     * - buildDisplayRunFromLiveSnapshot 鍙簲璇ョ敤浜庘€滃凡鏈夋椿鍔?live snapshot鈥濈殑灞曠ず
     * - idle 涓嶆槸姝ｅ紡灞曠ず鎬侊紱鑻ヨ皟鐢ㄦ柟璇紶 idle锛岃繖閲屽洖閫€鎴?running锛岄伩鍏?display 灞傚穿鎺?
     * - 姝ｅ父涓婚摼搴旂敱椤甸潰灞備繚璇侊細idle snapshot 涓嶈繘鍏?display mapper
     */
    return status === 'idle' ? 'running' : status
}

/**
 * direct run / live run -> display run 鏄犲皠灞傘€?
 *
 * 鏈枃浠惰鑹诧細
 * - 灏嗗悗绔?RunResult / LiveRunSnapshot 瑙ｉ噴涓哄墠绔?DisplayRun / DisplayStep
 * - 浣滀负 run display 鐨勭粺涓€鏄犲皠鍏ュ彛
 *
 * 璐熻矗锛?
 * - 缁勭粐 steps / failureInfo / primaryState 鐨勫睍绀哄眰鏄犲皠
 * - 淇濈暀鍘熷 run result / live snapshot 鍒?raw 瀛楁
 *
 * 涓嶈礋璐ｏ細
 * - 瀹氫箟鍚庣 run contract
 * - 淇敼鍘熷 run 缁撴灉
 * - 缁勪欢娓叉煋閫昏緫
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

