interface OutputNodeConfigProps {
  derivedTargetInputs?: string[]
  disabled?: boolean
}

/**
 * output 节点配置子表单。
 *
 * 本文件角色：
 * - 展示 output 节点当前从图上派生出的 inbound inputs 摘要
 *
 * 负责：
 * - 只读展示 derivedTargetInputs
 *
 * 不负责：
 * - 编辑 output 节点 inputs
 * - 编辑 outputs / comment（由 NodeConfigPanel 统一负责）
 * - graph 联动
 *
 * 上下游：
 * - 上游由 NodeConfigPanel 根据当前 edges 派生 derivedTargetInputs
 * - 下游仅用于 UI 展示
 *
 * 当前限制 / 待收口点：
 * - derivedTargetInputs 完全来自当前图关系，不进入保存态
 * - output 节点当前仍使用 output 命名；若未来迁 aggregate 语义，本组件说明也需联动更新
 */
export default function OutputNodeConfigForm({
  derivedTargetInputs = [],
  disabled = false,
}: OutputNodeConfigProps) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label>Derived Inputs</label>

        <input
          value={derivedTargetInputs.join(', ')}
          readOnly
          disabled={disabled}
          style={{ width: '100%', background: '#f5f5f5', color: '#666' }}
          placeholder='Derived from current incoming bindings (may be empty)'
        />

        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          This list is derived from incoming edges and is not saved into node config.
        </div>
      </div>
    </>
  )
}