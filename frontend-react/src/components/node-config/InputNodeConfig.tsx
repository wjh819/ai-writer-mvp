import type { InputNodeConfig } from '../../workflow-editor/workflowEditorTypes'

/**
 * input 节点配置子表单。
 *
 * 本文件角色：
 * - 渲染 input 节点专属可编辑字段
 * - 将变更后的完整 input config 回传给上层
 *
 * 负责：
 * - 编辑 defaultValue
 *
 * 不负责：
 * - 编辑 outputs / comment（由 NodeConfigPanel 统一负责）
 * - graph 规则联动
 * - 输入值语义校验
 *
 * 上下游：
 * - 上游由 NodeConfigPanel 提供当前 input config
 * - 下游把 nextConfig 回传给 NodeConfigPanel / actions/controller
 *
 * 当前限制 / 待收口点：
 * - 本组件当前不负责 inputKey 编辑；inputKey 由 NodeConfigPanel 统一展示和编辑
 * - defaultValue 只是 input 节点运行输入缺省值，不等于 workflow published state
 */
interface InputNodeConfigProps {
  config: InputNodeConfig
  onConfigChange: (nextConfig: InputNodeConfig) => void
}

export default function InputNodeConfigForm({
  config,
  onConfigChange,
}: InputNodeConfigProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
        Default Value
      </label>
      <input
        value={config.defaultValue}
        onChange={e =>
          onConfigChange({
            ...config,
            defaultValue: e.target.value,
          })
        }
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        Used only when direct run request.state does not provide this inputKey.
      </div>
    </div>
  )
}