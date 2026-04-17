from __future__ import annotations

from string import Formatter
from typing import Any, Callable, Mapping

from app_errors import InvalidInputError
from contracts.workflow_contracts import PromptNodeConfig, WorkflowEditorData

"""
workflow dependency validation module.

Responsibilities:
- extract prompt template variables
- build target -> inbound data-edge map
- validate prompt dependency bindings

Non-responsibilities:
- structure validation
- execution graph validation
- subgraph validation
- top-level validator orchestration
"""

ModelResourceRegistryProvider = Callable[[], Mapping[str, Any]]


def resolve_model_resource_registry(
    model_resource_registry_provider: ModelResourceRegistryProvider | None,
) -> dict[str, Any] | None:
    """
    Resolve an optional model resource registry provider.

    - return None when provider is missing (skip availability check)
    - return a dict snapshot when provider exists
    """

    if model_resource_registry_provider is None:
        return None

    active_registry = model_resource_registry_provider() or {}
    return dict(active_registry)


def extract_template_variables(prompt_text: str) -> set[str]:
    """
    Extract top-level format field variables from prompt text.
    """

    variables: set[str] = set()

    for _, field_name, _, _ in Formatter().parse(prompt_text or ''):
        if not field_name:
            continue

        root_name = field_name.split('.', 1)[0].split('[', 1)[0].strip()
        if root_name:
            variables.add(root_name)

    return variables


def _build_incoming_data_edges_by_target(
    workflow: WorkflowEditorData,
) -> dict[str, list]:
    """
    Build target -> incoming data edges map.
    """

    incoming_edges_by_target: dict[str, list] = {}
    for node in workflow.nodes:
        incoming_edges_by_target[node.id] = []

    for edge in workflow.edges:
        incoming_edges_by_target[edge.target].append(edge)

    return incoming_edges_by_target


def validate_workflow_dependencies(
    workflow: WorkflowEditorData,
    *,
    model_resource_registry_provider: ModelResourceRegistryProvider | None = None,
):
    """
    Validate dependency-level rules.

    Checks:
    - prompt modelResourceId availability (when provider is injected)
    - prompt template variables have inbound data-edge bindings
    """

    prompt_nodes = [
        node for node in workflow.nodes if isinstance(node.config, PromptNodeConfig)
    ]
    if not prompt_nodes:
        return

    incoming_edges_by_target = _build_incoming_data_edges_by_target(workflow)
    active_model_resource_registry = resolve_model_resource_registry(
        model_resource_registry_provider
    )

    for node in prompt_nodes:
        node_id = (node.id or '').strip()
        config = node.config

        model_resource_id = (config.modelResourceId or '').strip()
        if active_model_resource_registry is not None:
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

        required_variables = extract_template_variables(config.promptText or '')
        bound_target_inputs = {
            (edge.targetInput or '').strip()
            for edge in incoming_edges_by_target.get(node_id, [])
        }

        missing_variables = sorted(required_variables - bound_target_inputs)
        if missing_variables:
            raise InvalidInputError(
                f"Prompt node '{node_id}' is missing inbound bindings for variables: "
                f"{', '.join(missing_variables)}"
            )
