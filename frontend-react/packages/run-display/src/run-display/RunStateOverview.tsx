import type { WorkflowState } from '../run/runDisplayInputTypes'
import { ValueBlock } from './RunValueBlock'

/**
 * 鏁翠綋 state 瀵圭収缁撴灉銆?
 *
 * 鐢ㄤ簬鎶?inputState 涓?resultState 鐨勬暣浣撳樊寮?
 * 鏀舵暃涓烘洿閫傚悎灞曠ず灞傛秷璐圭殑杞婚噺鎽樿銆?
 */
interface OverallStateDiff {
  addedKeys: string[]
  modifiedKeys: string[]
}

/**
 * 杞婚噺姣旇緝涓や釜鍊兼槸鍚︾浉绛夈€?
 *
 * 浼樺厛浣跨敤涓ユ牸鐩哥瓑锛?
 * 鑻ヤ笉鐩哥瓑锛屽垯閫€鍖栦负 JSON 搴忓垪鍖栧悗姣旇緝銆?
 *
 * 璇存槑锛?
 * - 杩欓噷鍙敤浜?run state overview 鐨勫睍绀烘憳瑕?
 * - 涓嶄綔涓哄簳灞傛暟鎹浉绛夋€ф爣鍑?
 */
function areValuesEqual(left: unknown, right: unknown) {
  if (left === right) {
    return true
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

/**
 * 鍒ゆ柇瀵硅薄鑷韩鏄惁鎷ユ湁鏌愪釜 key銆?
 */
function hasOwnKey(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

/**
 * 鏋勫缓 run 鍓嶅悗鏁翠綋 state 鐨勮交閲忓樊寮傛憳瑕併€?
 *
 * 杈撳嚭涓ょ被 key锛?
 * - addedKeys: 杩愯鍓嶄笉瀛樺湪銆佽繍琛屽悗瀛樺湪鐨?key
 * - modifiedKeys: 杩愯鍓嶅悗閮藉瓨鍦ㄤ笖鍊煎彂鐢熷彉鍖栫殑 key
 *
 * 娉ㄦ剰锛?
 * - 杩欓噷鍙粺璁?resultState 涓疄闄呭瓨鍦ㄧ殑 key
 * - 杩欓噷鍙湇鍔℃暣浣?state 鎬昏灞曠ず锛屼笉浣滀负姝ｅ紡鐘舵€佸樊寮傜畻娉?
 */
function buildOverallStateDiff(
  inputState: WorkflowState,
  resultState: WorkflowState
): OverallStateDiff {
  const addedKeys: string[] = []
  const modifiedKeys: string[] = []

  const keys = Object.keys(resultState || {})

  keys.forEach(key => {
    const beforeHasKey = hasOwnKey(inputState, key)

    if (!beforeHasKey) {
      addedKeys.push(key)
      return
    }

    if (!areValuesEqual(inputState[key], resultState[key])) {
      modifiedKeys.push(key)
    }
  })

  return {
    addedKeys,
    modifiedKeys,
  }
}

/**
 * 鏌愪竴绫?key 鎽樿鍒楄〃鐨勫睍绀虹粍浠躲€?
 */
function SummaryKeyList({
  title,
  keys,
}: {
  title: string
  keys: string[]
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 10,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {title} ({keys.length})
      </div>
      {keys.length === 0 ? (
        <div style={{ fontSize: 12, color: '#64748b' }}>无</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keys.map(key => (
            <span
              key={key}
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#f1f5f9',
                color: '#334155',
              }}
            >
              {key}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 杩愯 state 鎬昏缁勪欢銆?
 *
 * 鏈枃浠惰鑹诧細
 * - 灞曠ず run 鍓?inputState 涓庝富缁撴灉 state 鐨勬暣浣撳鐓?
 * - 杈撳嚭寮辫В閲婄殑鏂板/鍙樻洿瀛楁鎽樿
 *
 * 鑱岃矗锛?
 * - 骞舵帓灞曠ず inputState 涓?resultState
 * - 瀵?run 鍓嶅悗瀛楁鍙樺寲鍋氳交閲忔憳瑕?
 *
 * 鍏抽敭鍙ｅ緞锛?
 * - 杩欐槸鏁翠綋 state 瀵圭収瑙嗗浘锛屼笉鏄€愭 writeback 鏃堕棿绾?
 * - 杩欓噷鍙繚鐣欐柊澧?鍙樻洿涓ょ被寮辨憳瑕侊紝閬垮厤杩囧害瑙ｉ噴杩愯璇箟
 *
 * 褰撳墠闄愬埗锛?
 * - areValuesEqual 浠呯敤浜庡睍绀烘憳瑕侊紝涓嶆槸搴曞眰鏁版嵁鐩哥瓑鎬ф爣鍑?
 * - 宸紓姣旇緝浠ユ祬灞?key 闆嗗悎涓哄叆鍙ｏ紝涓嶆壙鎷呭鏉傜粨鏋勫寲 diff 璇箟
 */
export default function RunStateOverview({
  inputState,
  resultState,
  resultStateTitle = '结果状态',
}: {
  inputState: WorkflowState
  resultState: WorkflowState
  resultStateTitle?: string
}) {
  const overallDiff = buildOverallStateDiff(inputState, resultState)

  return (
    <>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>运行状态总览</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <ValueBlock title='输入状态' value={inputState} />
        <ValueBlock title={resultStateTitle} value={resultState} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <SummaryKeyList
          title='新增字段（运行前不存在）'
          keys={overallDiff.addedKeys}
        />
        <SummaryKeyList title='更新字段' keys={overallDiff.modifiedKeys} />
      </div>
    </>
  )
}

