import type { ModelResourceListItem } from '../../model-resources/modelResourceTypes'
import type {
  PromptNodeConfig as PromptNodeConfigType,
  LLMConfig,
} from '../../workflow-editor/workflowEditorTypes'

/**
 * prompt 节点配置子表单。
 *
 * 本文件角色：
 * - 渲染 prompt 节点专属可编辑字段
 * - 展示与 prompt 节点相关的 graph-derived 只读提示信息
 *
 * 负责：
 * - 编辑 promptText
 * - 编辑 modelResourceId
 * - 编辑 llm 运行参数
 * - 展示窗口关系摘要、inbound bindings、prompt variable hints
 *
 * 不负责：
 * - 编辑 outputs / comment（由 NodeConfigPanel 统一负责）
 * - graph 规则联动
 * - 正式 prompt 变量解析
 * - contextLinks 管理
 *
 * 上下游：
 * - 上游由 NodeConfigPanel 传入 config、modelResources 与 graph-derived 展示信息
 * - 下游把 nextConfig 回传给上层，由 actions/controller 决定是否接受
 *
 * 当前限制 / 待收口点：
 * - graphWindow* 仅是来自 contextLinks 的图关系摘要，不是运行态 window identity
 * - inboundBindings 是权威输入来源展示，但并不在本组件中直接创建/修改 bindings
 * - promptVariableHints 仅是 text-derived hint，不等于正式输入语义
 */
interface InboundBindingDisplayItem {
  sourceNodeId: string
  sourceOutput: string
  targetInput: string
}

interface PromptNodeConfigProps {
  config: PromptNodeConfigType
  modelResources: ModelResourceListItem[]
  derivedTargetInputs?: string[]
  inboundBindings?: InboundBindingDisplayItem[]
  promptVariableHints?: string[]
  graphWindowMode?: 'new_window' | 'continue' | 'branch'
  graphWindowSourceNodeId?: string | null
  graphWindowTargetNodeIds?: string[]
  onConfigChange: (nextConfig: PromptNodeConfigType) => void
  disabled?: boolean
}

function getResourceOptionLabel(resource: ModelResourceListItem): string {
  return `${resource.id} · ${resource.provider} · ${resource.model}`
}

function trim(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  return String(value).trim()
}

/**
 * 将 graph-derived 窗口关系摘要整理成可展示文本。
 *
 * 注意：
 * - 输入来自 graph truth（顶层 contextLinks）
 * - 输出仅服务 UI 展示，不进入 config 或保存态
 */
function buildWindowRelationSummary(params: {
  graphWindowMode: 'new_window' | 'continue' | 'branch'
  graphWindowSourceNodeId?: string | null
  graphWindowTargetNodeIds?: string[]
}) {
  const mode = params.graphWindowMode
  const sourceNodeId = trim(params.graphWindowSourceNodeId)
  const targets = (params.graphWindowTargetNodeIds || [])
    .map(trim)
    .filter(Boolean)

  return {
    modeText:
      mode === 'continue'
        ? '继续'
        : mode === 'branch'
          ? '分支'
          : '新窗口',
    sourceText: mode === 'new_window' ? '-' : sourceNodeId || '-',
    targetsText: targets.length > 0 ? targets.join(', ') : '-',
  }
}

export default function PromptNodeConfigForm({
  config,
  modelResources,
  derivedTargetInputs = [],
  inboundBindings = [],
  promptVariableHints = [],
  graphWindowMode = 'new_window',
  graphWindowSourceNodeId = null,
  graphWindowTargetNodeIds = [],
  onConfigChange,
  disabled = false,
}: PromptNodeConfigProps) {
  const windowSummary = buildWindowRelationSummary({
    graphWindowMode,
    graphWindowSourceNodeId,
    graphWindowTargetNodeIds,
  })

  /**
   * 将局部 patch 合并到当前 prompt config 并回传上层。
   *
   * 不负责：
   * - 对 nextConfig 做 normalize
   * - 校验 promptText / modelResourceId / llm 的最终合法性
   */
  function updateConfig(patch: Partial<PromptNodeConfigType>) {
    onConfigChange({
      ...config,
      ...patch,
    })
  }

  /**
   * 更新 llm 子配置的单个运行参数字段。
   *
   * 注意：
   * - llm 只承载运行参数
   * - 模型选择统一由 modelResourceId 表达
   */
  function updateLLM<K extends keyof LLMConfig>(key: K, value: LLMConfig[K]) {
    updateConfig({
      llm: {
        ...config.llm,
        [key]: value,
      },
    })
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          提示词文本
        </label>
        <textarea
          value={config.promptText}
          disabled={disabled}
          onChange={e => updateConfig({ promptText: e.target.value })}
          style={{ width: '100%', minHeight: 140 }}
          placeholder='在此输入提示词...'
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          模型资源
        </label>
        <select
          value={config.modelResourceId}
          disabled={disabled}
          onChange={e => updateConfig({ modelResourceId: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value=''>请选择模型资源</option>
          {modelResources.map(resource => (
            <option key={resource.id} value={resource.id}>
              {getResourceOptionLabel(resource)}
            </option>
          ))}
        </select>
        <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
          资源标识与连接信息由共享资源层管理；当前节点仅保存 modelResourceId。
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>
          窗口关系
        </label>
        <div
          style={{
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#f8fafc',
            fontSize: 12,
            color: '#475569',
          }}
        >
          <div style={{ marginBottom: 6 }}>
            Prompt 窗口的继承/分支由图上的 context links 定义，不在 prompt 配置中编辑。
          </div>

          <div style={{ marginBottom: 4 }}>
            <strong>模式：</strong> {windowSummary.modeText}
          </div>

          <div style={{ marginBottom: 4 }}>
            <strong>来源 Prompt：</strong> {windowSummary.sourceText}
          </div>

          <div>
            <strong>上下文目标：</strong> {windowSummary.targetsText}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>
          派生目标输入
        </label>

        {derivedTargetInputs.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#666',
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f8fafc',
            }}
          >
            当前没有从入边数据连线推导出的目标输入。
          </div>
        ) : (
          <div
            style={{
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f8fafc',
              fontSize: 12,
              color: '#475569',
            }}
          >
            {derivedTargetInputs.map(targetInput => (
              <div key={targetInput} style={{ marginBottom: 4 }}>
                {targetInput}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>
          入边绑定（权威）
        </label>

        {inboundBindings.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#666',
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f8fafc',
            }}
          >
            暂无入边绑定
          </div>
        ) : (
          <div
            style={{
              padding: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f8fafc',
              fontSize: 12,
            }}
          >
            {inboundBindings.map(binding => (
              <div
                key={`${binding.sourceNodeId}.${binding.sourceOutput}->${binding.targetInput}`}
                style={{ marginBottom: 4 }}
              >
                {binding.sourceNodeId}.{binding.sourceOutput} {'->'}{' '}
                {binding.targetInput}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>
          Prompt 变量提示（仅提示）
        </label>

        <div
          style={{
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff7ed',
            fontSize: 12,
            color: '#9a3412',
          }}
        >
          <div style={{ marginBottom: 6 }}>
            这些名称仅从提示词文本解析得到。系统只识别由边定义的入边绑定。
          </div>

          {promptVariableHints.length === 0 ? (
            <div>未从提示词文本解析到变量提示。</div>
          ) : (
            promptVariableHints.map(name => (
              <div key={name} style={{ marginBottom: 4 }}>
                {name}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6 }}>
          <strong>LLM 运行参数</strong>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>
            温度
          </label>
          <input
            type='number'
            step='0.1'
            value={config.llm.temperature}
            disabled={disabled}
            onChange={e =>
              updateLLM('temperature', Number(e.target.value || 0))
            }
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>超时</label>
          <input
            type='number'
            value={config.llm.timeout}
            disabled={disabled}
            onChange={e => updateLLM('timeout', Number(e.target.value || 0))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>
            最大重试次数
          </label>
          <input
            type='number'
            value={config.llm.max_retries}
            disabled={disabled}
            onChange={e =>
              updateLLM('max_retries', Number(e.target.value || 0))
            }
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </>
  )
}
