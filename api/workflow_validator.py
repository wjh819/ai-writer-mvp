from api import workflow_validation_dependency as _dependency
from api import workflow_validation_execution_graph as _execution_graph
from api import workflow_validation_structure as _structure
from api import workflow_validation_subgraph as _subgraph
from contracts.workflow_contracts import WorkflowEditorData


"""
workflow 合法性裁决层。

本文件角色：
- workflow canonical editor model 的正式 validator
- 区分 structure validation 与 dependency validation

负责：
- 节点 / 边 / contextLinks 结构规则
- output / stateKey / binding 规则
- 联合执行关系图无环检查
- modelResourceId / promptText 变量绑定依赖检查
- subgraph test 边界节点对当前 canonical workflow 的最小校验

不负责：
- 默认值补齐
- 旧字段兼容
- HTTP 语义翻译
- engine 运行
- subgraph reachability / topo 排序本体

上下游：
- 上游输入来自 normalize 后的 canonical workflow
- 下游由 save/load/run 主链消费裁决结果

当前限制 / 待收口点：
- dependency validation 会访问外部资源（model registry），不是纯内存函数
- context source outbound 规则当前实现重点是“最多一个 continue”，可能弱于完整业务目标；修改时须同时核对前端 validator 与 graph 层
- validator 与 engine 之间存在部分防御性规则重复，用于防止上游绕过校验后错误下沉到执行期
"""


validate_workflow_structure = _structure.validate_workflow_structure
validate_workflow_dependencies = _dependency.validate_workflow_dependencies
validate_partial_execution_workflow = _subgraph.validate_partial_execution_workflow
collect_context_source_outbound_rule_errors = (
    _execution_graph.collect_context_source_outbound_rule_errors
)

__all__ = [
    "collect_context_source_outbound_rule_errors",
    "validate_partial_execution_workflow",
    "validate_workflow_dependencies",
    "validate_workflow_editor_data",
    "validate_workflow_structure",
]


def validate_workflow_editor_data(workflow: WorkflowEditorData):
    """
    workflow canonical editor model 最终合法性裁决入口。

    正式顺序：
    - 先做 structure validation
    - 再做 dependency validation

    注意：
    - 这是 save/load/run 主链共用的正式 validator 入口
    """

    validate_workflow_structure(workflow)
    validate_workflow_dependencies(workflow)
