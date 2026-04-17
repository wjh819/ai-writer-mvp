from __future__ import annotations

from backend_workflow_canonical import workflow_validation_dependency as _dependency
from backend_workflow_canonical import workflow_validation_execution_graph as _execution_graph
from backend_workflow_canonical import workflow_validation_structure as _structure
from backend_workflow_canonical import workflow_validation_subgraph as _subgraph
from backend_workflow_canonical.workflow_validation_dependency import (
    ModelResourceRegistryProvider,
)
from contracts.workflow_contracts import WorkflowEditorData

"""
Workflow canonical validation facade.

This module orchestrates structure/dependency/subgraph validators and keeps
runtime-coupled dependency checks injectable via provider.
"""

validate_workflow_structure = _structure.validate_workflow_structure
collect_context_source_outbound_rule_errors = (
    _execution_graph.collect_context_source_outbound_rule_errors
)

_default_model_resource_registry_provider: ModelResourceRegistryProvider | None = None


def set_model_resource_registry_provider(
    model_resource_registry_provider: ModelResourceRegistryProvider | None,
) -> None:
    """Configure default provider used by validation facade calls."""

    global _default_model_resource_registry_provider
    _default_model_resource_registry_provider = model_resource_registry_provider


def _resolve_model_resource_registry_provider(
    model_resource_registry_provider: ModelResourceRegistryProvider | None,
) -> ModelResourceRegistryProvider | None:
    if model_resource_registry_provider is not None:
        return model_resource_registry_provider

    return _default_model_resource_registry_provider


def validate_workflow_dependencies(
    workflow: WorkflowEditorData,
    *,
    model_resource_registry_provider: ModelResourceRegistryProvider | None = None,
):
    """Run dependency validation with optional injected model resource provider."""

    provider = _resolve_model_resource_registry_provider(
        model_resource_registry_provider
    )

    if provider is None:
        return _dependency.validate_workflow_dependencies(workflow)

    return _dependency.validate_workflow_dependencies(
        workflow,
        model_resource_registry_provider=provider,
    )


def validate_partial_execution_workflow(
    workflow: WorkflowEditorData,
    *,
    start_node_id: str,
    end_node_ids: list[str] | None = None,
    model_resource_registry_provider: ModelResourceRegistryProvider | None = None,
) -> tuple[str, list[str]]:
    """Run subgraph/partial validation with optional injected provider."""

    provider = _resolve_model_resource_registry_provider(
        model_resource_registry_provider
    )

    if provider is None:
        return _subgraph.validate_partial_execution_workflow(
            workflow,
            start_node_id=start_node_id,
            end_node_ids=end_node_ids,
        )

    return _subgraph.validate_partial_execution_workflow(
        workflow,
        start_node_id=start_node_id,
        end_node_ids=end_node_ids,
        model_resource_registry_provider=provider,
    )


def validate_workflow_editor_data(
    workflow: WorkflowEditorData,
    *,
    model_resource_registry_provider: ModelResourceRegistryProvider | None = None,
):
    """
    Full canonical validation entry.

    Order:
    - structure validation
    - dependency validation
    """

    validate_workflow_structure(workflow)

    if model_resource_registry_provider is None:
        validate_workflow_dependencies(workflow)
        return

    validate_workflow_dependencies(
        workflow,
        model_resource_registry_provider=model_resource_registry_provider,
    )


__all__ = [
    'collect_context_source_outbound_rule_errors',
    'set_model_resource_registry_provider',
    'validate_partial_execution_workflow',
    'validate_workflow_dependencies',
    'validate_workflow_editor_data',
    'validate_workflow_structure',
]
