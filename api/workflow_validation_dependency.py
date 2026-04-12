from __future__ import annotations

from string import Formatter

from app_errors import InvalidInputError
from contracts.workflow_contracts import PromptNodeConfig, WorkflowEditorData
from core.model_resource_registry import load_model_resource_registry

"""
workflow dependency validation 子模块。

本文件角色：
- 承接 dependency validation 相关实现

负责：
- 提取 promptText 顶层变量名
- 构建 target -> incoming data edges 映射
- 执行 dependency validation

不负责：
- structure validation
- execution graph / outbound rule 校验
- subgraph validation
- 顶层 validator 入口
"""


def extract_template_variables(prompt_text: str) -> set[str]:
    """
    从 promptText 中提取顶层变量名集合。

    注意：
    - 这里只提取 format field 的根变量名
    - 不负责校验 prompt 语义是否合理
    - 结果仅用于与 data edge inbound bindings 做对齐检查
    """

    variables: set[str] = set()

    for _, field_name, _, _ in Formatter().parse(prompt_text or ""):
        if not field_name:
            continue

        root_name = field_name.split(".", 1)[0].split("[", 1)[0].strip()
        if root_name:
            variables.add(root_name)

    return variables


def _build_incoming_data_edges_by_target(
    workflow: WorkflowEditorData,
) -> dict[str, list]:
    """
    构建 target -> incoming data edges 映射。

    只负责：
    - 收集普通 data edges
    - 供 dependency validation 做 promptText 变量绑定检查

    不负责：
    - contextLinks 收集
    """

    incoming_edges_by_target: dict[str, list] = {}
    for node in workflow.nodes:
        incoming_edges_by_target[node.id] = []

    for edge in workflow.edges:
        incoming_edges_by_target[edge.target].append(edge)

    return incoming_edges_by_target


def validate_workflow_dependencies(workflow: WorkflowEditorData):
    """
    只做依赖检查。

    负责：
    - modelResourceId 是否存在
    - promptText 中声明的变量与 data edge inbound bindings 是否匹配

    注意：
    - 这里的变量绑定检查只看普通 data edges
    - contextLinks 不参与结构化输入变量绑定
    - 本函数会访问外部资源（model registry），不是纯内存 validator
    """

    prompt_nodes = [
        node for node in workflow.nodes if isinstance(node.config, PromptNodeConfig)
    ]
    if not prompt_nodes:
        return

    incoming_edges_by_target = _build_incoming_data_edges_by_target(workflow)
    active_model_resource_registry = load_model_resource_registry()

    for node in prompt_nodes:
        node_id = (node.id or "").strip()
        config = node.config

        model_resource_id = (config.modelResourceId or "").strip()
        if not active_model_resource_registry:
            raise InvalidInputError(
                f"Prompt node '{node_id}' references model resource "
                f"'{model_resource_id}', but no model resources are configured"
            )

        if model_resource_id not in active_model_resource_registry:
            raise InvalidInputError(
                f"Prompt node '{node_id}' references unknown model resource "
                f"'{model_resource_id}'"
            )

        required_variables = extract_template_variables(config.promptText or "")
        bound_target_inputs = {
            (edge.targetInput or "").strip()
            for edge in incoming_edges_by_target.get(node_id, [])
        }

        missing_variables = sorted(required_variables - bound_target_inputs)
        if missing_variables:
            raise InvalidInputError(
                f"Prompt node '{node_id}' is missing inbound bindings for variables: "
                f"{', '.join(missing_variables)}"
            )
