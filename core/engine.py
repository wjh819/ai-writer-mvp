from __future__ import annotations

import json
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Iterable

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from contracts.workflow_contracts import (
    InputNodeConfig,
    OutputNodeConfig,
    PromptNodeConfig,
    WorkflowContextLink,
    WorkflowEditorData,
    WorkflowEdge,
    WorkflowNode,
)
from core.execution_types import (
    ExecutionStep,
    InputFailedExecutionStep,
    InputSuccessExecutionStep,
    OutputFailedExecutionStep,
    OutputSuccessExecutionStep,
    PromptFailedExecutionStep,
    PromptSuccessExecutionStep,
    WorkflowRunError,
)
from core.llm import get_llm, invoke_llm
from core.model_resource_registry import (
    load_model_resource_registry,
    resolve_model_resource,
)
from utils.prompt_loader import load_prompt
from core.output_exporter import OutputExportError, WorkflowOutputExporter

"""
workflow 执行引擎。

本文件角色：
- 消费合法 canonical workflow
- 执行节点、维护状态、产出 execution facts

负责：
- 基于 nodes / edges / contextLinks 构建执行关系图
- 解析结构化输入绑定
- 执行 input / prompt / output 节点
- 维护单次 run 内的 prompt window 运行时状态
- 构造 success / failed execution step
- 支持 full run 与 subgraph run

不负责：
- workflow canonical contract 定义
- save/load 规则
- HTTP response 生成
- persisted run 记录
- 正式 validator 裁决

上下游：
- 上游输入来自 normalize + validator 后的 WorkflowEditorData
- 下游输出由 workflow_run_service 包装为 WorkflowExecutionResult

当前限制 / 待收口点：
- window_id 当前是 run-local synthetic identifier，不是 durable identity
- 同层可执行节点顺序依赖当前图构建顺序，尚无独立 canonical ordering
- validator 与 engine 之间存在部分防御性规则重复
"""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class WorkflowDefinitionError(Exception):
    """workflow 定义/配置阶段错误。"""


class WorkflowNodeExecutionError(Exception):
    error_type = "node_execution_failed"

    def __init__(
        self,
        message: str,
        *,
        error_detail: str | None = None,
        bound_inputs: dict[str, Any] | None = None,
        rendered_prompt: str | None = None,
        prompt_mode: str | None = None,
        prompt_ref: str | None = None,
        window_mode: str | None = None,
        window_source_node_id: str | None = None,
        window_id: str | None = None,
        window_parent_id: str | None = None,
    ):
        super().__init__(message)
        self.error_message = message
        self.error_detail = error_detail or message
        self.bound_inputs = dict(bound_inputs or {})
        self.rendered_prompt = rendered_prompt
        self.prompt_mode = prompt_mode
        self.prompt_ref = prompt_ref
        self.window_mode = window_mode
        self.window_source_node_id = window_source_node_id
        self.window_id = window_id
        self.window_parent_id = window_parent_id


class MissingInputsError(WorkflowNodeExecutionError):
    error_type = "missing_inputs"


class PromptRenderError(WorkflowNodeExecutionError):
    error_type = "prompt_render_failed"


class StructuredOutputError(WorkflowNodeExecutionError):
    error_type = "structured_output_invalid"

class OutputWriteError(WorkflowNodeExecutionError):
    error_type = "output_write_failed"

class WorkflowEngine:
    """
    工作流执行引擎。

    正式口径：
    - engine 直接消费 WorkflowEditorData
    - engine 不再拥有独立 workflow contract
    - workflow 合法性由上游 normalize + validator 保证
    - engine 只执行合法 canonical workflow，并产出 execution facts

    当前窗口语义实现：
    - 只在单次 run 内维护内存窗口注册表
    - 不接 provider-native conversation / branch API
    - 通过消息历史重放实现 new_window / continue / branch

    注意：
    - engine 返回的是 execution facts，不是 direct run HTTP result
    - run 级 status / error_type / failure_stage / finished_at 不由本类直接定义
    """

    def __init__(
        self,
        workflow_data: WorkflowEditorData,
        prompt_overrides: dict[str, str] | None = None,
        output_exporter: WorkflowOutputExporter | None = None,
    ):
        if not isinstance(workflow_data, WorkflowEditorData):
            raise ValueError("workflow_data must be WorkflowEditorData")

        self.workflow = workflow_data
        self.nodes: list[WorkflowNode] = workflow_data.nodes
        self.edges: list[WorkflowEdge] = workflow_data.edges
        self.context_links: list[WorkflowContextLink] = workflow_data.contextLinks
        self.node_map: dict[str, WorkflowNode] = {node.id: node for node in self.nodes}

        self.graph: dict[str, list[str]] = defaultdict(list)
        self.in_degree: dict[str, int] = defaultdict(int)
        self.incoming_edges_by_target: dict[str, list[WorkflowEdge]] = defaultdict(list)
        self.incoming_context_link_by_target: dict[str, WorkflowContextLink | None] = {}

        self.model_resource_registry = load_model_resource_registry()
        self.prompt_overrides = dict(prompt_overrides or {})

        # 单次 run 内的窗口注册表
        self.prompt_window_id_by_node: dict[str, str] = {}
        self.window_histories: dict[str, list[BaseMessage]] = {}

        # 固定保存“某个 prompt 节点自己提交完成时”的窗口快照。
        # branch 必须从这个快照分叉，不能被后续 continue 污染。
        self.prompt_committed_history_by_node: dict[str, list[BaseMessage]] = {}

        self._build_graph()
        self.output_exporter = output_exporter
    def _build_graph(self) -> None:
        for node in self.nodes:
            self.graph[node.id] = []
            self.in_degree[node.id] = 0
            self.incoming_edges_by_target[node.id] = []
            self.incoming_context_link_by_target[node.id] = None

        # data edges: 既参与执行顺序，也参与结构化输入绑定
        for edge in self.edges:
            src = edge.source
            dst = edge.target

            if src not in self.node_map:
                raise WorkflowDefinitionError(f"Edge source node not found: {src}")
            if dst not in self.node_map:
                raise WorkflowDefinitionError(f"Edge target node not found: {dst}")

            self.graph[src].append(dst)
            self.incoming_edges_by_target[dst].append(edge)
            self.in_degree[dst] += 1

        # context links: 只参与执行顺序，不参与结构化输入绑定
        for link in self.context_links:
            src = link.source
            dst = link.target

            if src not in self.node_map:
                raise WorkflowDefinitionError(
                    f"Context link source node not found: {src}"
                )
            if dst not in self.node_map:
                raise WorkflowDefinitionError(
                    f"Context link target node not found: {dst}"
                )

            if self.incoming_context_link_by_target[dst] is not None:
                raise WorkflowDefinitionError(
                    f"Prompt node '{dst}' has multiple inbound context links"
                )

            self.graph[src].append(dst)
            self.in_degree[dst] += 1
            self.incoming_context_link_by_target[dst] = link

    def _build_reverse_graph(self) -> dict[str, list[str]]:
        reverse_graph: dict[str, list[str]] = defaultdict(list)

        for source, targets in self.graph.items():
            for target in targets:
                reverse_graph[target].append(source)

        return reverse_graph

    def _build_window_id(self, node_id: str) -> str:
        return f"window::{node_id}"

    def _build_published_state(
        self,
        node: WorkflowNode,
        named_outputs: dict[str, Any],
    ) -> dict[str, Any]:
        output_map = self._get_output_spec_map(node)
        return {
            state_key: named_outputs[output_name]
            for output_name, state_key in output_map.items()
            if output_name in named_outputs
        }

    def _build_downstream_node_set(self, start_node_id: str) -> set[str]:
        if start_node_id not in self.node_map:
            raise WorkflowDefinitionError(f"Start node not found: {start_node_id}")

        visited: set[str] = set()
        queue = deque([start_node_id])

        while queue:
            current = queue.popleft()
            if current in visited:
                continue

            visited.add(current)
            for next_node_id in self.graph.get(current, []):
                if next_node_id not in visited:
                    queue.append(next_node_id)

        return visited

    def _build_subgraph_node_set(
        self,
        start_node_id: str,
        end_node_ids: Iterable[str] | None = None,
    ) -> set[str]:
        normalized_start_node_id = str(start_node_id or "").strip()
        if not normalized_start_node_id:
            raise WorkflowDefinitionError("Start node id is required")
        if normalized_start_node_id not in self.node_map:
            raise WorkflowDefinitionError(
                f"Start node not found: {normalized_start_node_id}"
            )

        reachable_from_start = self._build_downstream_node_set(normalized_start_node_id)

        normalized_end_node_ids: list[str] = []
        seen_end_node_ids: set[str] = set()

        for raw_node_id in list(end_node_ids or []):
            node_id = str(raw_node_id or "").strip()
            if not node_id:
                raise WorkflowDefinitionError("End node ids must not contain empty values")
            if node_id not in self.node_map:
                raise WorkflowDefinitionError(f"End node not found: {node_id}")
            if node_id not in seen_end_node_ids:
                normalized_end_node_ids.append(node_id)
                seen_end_node_ids.add(node_id)

        if not normalized_end_node_ids:
            return reachable_from_start

        unreachable_end_node_ids = [
            node_id
            for node_id in normalized_end_node_ids
            if node_id not in reachable_from_start
        ]
        if unreachable_end_node_ids:
            raise WorkflowDefinitionError(
                "End nodes are not reachable from start node "
                f"'{normalized_start_node_id}': {sorted(unreachable_end_node_ids)}"
            )

        reverse_graph = self._build_reverse_graph()
        can_reach_end: set[str] = set(normalized_end_node_ids)
        queue = deque(normalized_end_node_ids)

        while queue:
            current = queue.popleft()
            for parent in reverse_graph.get(current, []):
                if parent in reachable_from_start and parent not in can_reach_end:
                    can_reach_end.add(parent)
                    queue.append(parent)

        selected_node_ids = {
            node_id
            for node_id in reachable_from_start
            if node_id in can_reach_end
        }

        if normalized_start_node_id not in selected_node_ids:
            raise WorkflowDefinitionError(
                f"Start node '{normalized_start_node_id}' is not included in selected subgraph"
            )

        return selected_node_ids

    def _topological_sort(
        self,
        selected_node_ids: set[str] | None = None,
    ) -> list[str]:
        """
        基于 data edges + contextLinks 共同构成的执行图，生成执行顺序。

        正式口径：
        - data edges 参与执行顺序
        - contextLinks 也参与执行顺序
        - 若图中存在环，抛 WorkflowDefinitionError
        - selected_node_ids 不为空时，仅对该子图内的边重新计算 in_degree
        """
        if selected_node_ids is None:
            selected = {node.id for node in self.nodes}
        else:
            selected = set(selected_node_ids)

        local_in_degree: dict[str, int] = {node_id: 0 for node_id in selected}
        local_graph: dict[str, list[str]] = {node_id: [] for node_id in selected}

        for source, targets in self.graph.items():
            if source not in selected:
                continue
            for target in targets:
                if target not in selected:
                    continue
                local_graph[source].append(target)
                local_in_degree[target] += 1

        queue = deque(
            node_id
            for node in self.nodes
            for node_id in [node.id]
            if node_id in selected and local_in_degree[node_id] == 0
        )

        order: list[str] = []

        while queue:
            current_node_id = queue.popleft()
            order.append(current_node_id)

            for neighbor in local_graph.get(current_node_id, []):
                local_in_degree[neighbor] -= 1
                if local_in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != len(selected):
            raise WorkflowDefinitionError("Workflow graph has a cycle")

        return order

    def _get_output_specs(self, node: WorkflowNode):
        outputs = list(getattr(node.config, "outputs", []) or [])
        if len(outputs) == 0:
            raise WorkflowDefinitionError(f"Node '{node.id}' has no outputs")
        return outputs

    def _get_output_spec_map(self, node: WorkflowNode) -> dict[str, str]:
        return {spec.name: spec.stateKey for spec in self._get_output_specs(node)}

    def _get_primary_state_key(self, node: WorkflowNode) -> str:
        outputs = self._get_output_specs(node)
        return outputs[0].stateKey

    def _get_single_output_spec(self, node: WorkflowNode):
        outputs = self._get_output_specs(node)
        if len(outputs) != 1:
            raise WorkflowDefinitionError(
                f"Node '{node.id}' must declare exactly one output at runtime"
            )
        return outputs[0]

    def _resolve_bound_inputs(
        self,
        node_id: str,
        state: dict[str, Any],
        *,
        strict: bool = True,
    ) -> dict[str, Any]:
        """
        基于 target 节点的 incoming edges 解析显式输入绑定。

        返回：
        - { targetInput: value }

        strict=True：
        - 某个 binding 对应的 stateKey 不存在时，抛 MissingInputsError

        strict=False：
        - 某个 binding 对应的 stateKey 不存在时，跳过该 binding
        """
        resolved: dict[str, Any] = {}

        for edge in self.incoming_edges_by_target.get(node_id, []) or []:
            source_node = self.node_map.get(edge.source)
            if not source_node:
                raise WorkflowDefinitionError(
                    f"Edge source node not found: {edge.source}"
                )

            source_output_map = self._get_output_spec_map(source_node)
            source_state_key = source_output_map.get(edge.sourceOutput)
            if not source_state_key:
                raise WorkflowDefinitionError(
                    f"Edge sourceOutput '{edge.sourceOutput}' not found on node '{edge.source}'"
                )

            if source_state_key not in state:
                if strict:
                    raise MissingInputsError(
                        f"Node '{node_id}' missing required input for binding "
                        f"'{edge.targetInput}' from '{edge.source}.{edge.sourceOutput}'"
                    )
                continue

            resolved[edge.targetInput] = state[source_state_key]

        return resolved

    def _publish_named_outputs(
        self,
        node: WorkflowNode,
        named_outputs: dict[str, Any],
        current_state: dict[str, Any],
    ) -> None:
        output_map = self._get_output_spec_map(node)

        expected_names = set(output_map.keys())
        actual_names = set(named_outputs.keys())

        if actual_names != expected_names:
            raise WorkflowDefinitionError(
                f"Node '{node.id}' produced outputs {sorted(actual_names)}, "
                f"expected {sorted(expected_names)}"
            )

        for output_name, state_key in output_map.items():
            current_state[state_key] = named_outputs[output_name]

    def _finalize_step_timing(
        self,
        step: ExecutionStep,
        *,
        started_at: str,
        finished_at: str,
        duration_ms: int,
    ) -> ExecutionStep:
        step.started_at = started_at
        step.finished_at = finished_at
        step.duration_ms = duration_ms
        return step

    def _resolve_prompt_window_runtime(
        self,
        node: WorkflowNode,
        *,
        allowed_source_node_ids: set[str] | None = None,
    ) -> dict[str, Any]:
        """
        解析当前 prompt 节点在本次 run 中的窗口运行时上下文。

        正式口径：
        - 无 inbound context link = new_window
        - continue 复用来源窗口 id，并基于当前窗口历史继续
        - branch 创建新的 run-local window_id，但其 base_messages 固定来自
          source 节点提交完成时的快照
        - subgraph 运行时，若 context source 不在执行范围内，则视为 new_window

        不负责：
        - 持久化窗口 identity
        - provider-native branch / thread 管理
        """
        inbound_link = self.incoming_context_link_by_target.get(node.id)

        if inbound_link is None:
            return {
                "window_mode": "new_window",
                "window_source_node_id": None,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": None,
                "base_messages": [],
            }

        source_node_id = inbound_link.source
        if (
            allowed_source_node_ids is not None
            and source_node_id not in allowed_source_node_ids
        ):
            return {
                "window_mode": "new_window",
                "window_source_node_id": None,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": None,
                "base_messages": [],
            }

        if source_node_id not in self.prompt_window_id_by_node:
            raise WorkflowDefinitionError(
                f"Prompt node '{node.id}' context source '{source_node_id}' "
                "has no resolved window in current run"
            )

        source_window_id = self.prompt_window_id_by_node[source_node_id]

        if inbound_link.mode == "continue":
            source_history = list(self.window_histories.get(source_window_id, []))
            return {
                "window_mode": "continue",
                "window_source_node_id": source_node_id,
                "window_id": source_window_id,
                "window_parent_id": None,
                "base_messages": source_history,
            }

        if inbound_link.mode == "branch":
            if source_node_id not in self.prompt_committed_history_by_node:
                raise WorkflowDefinitionError(
                    f"Prompt node '{node.id}' context source '{source_node_id}' "
                    "has no committed snapshot in current run"
                )

            source_snapshot = list(
                self.prompt_committed_history_by_node[source_node_id]
            )

            return {
                "window_mode": "branch",
                "window_source_node_id": source_node_id,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": source_window_id,
                "base_messages": source_snapshot,
            }

        raise WorkflowDefinitionError(
            f"Prompt node '{node.id}' has invalid context link mode: {inbound_link.mode}"
        )

    def _build_prompt_window_metadata_for_failed_step(
        self,
        node: WorkflowNode,
        *,
        allowed_source_node_ids: set[str] | None = None,
    ) -> dict[str, Any]:
        inbound_link = self.incoming_context_link_by_target.get(node.id)

        if inbound_link is None:
            return {
                "window_mode": "new_window",
                "window_source_node_id": None,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": None,
            }

        source_node_id = inbound_link.source
        if (
            allowed_source_node_ids is not None
            and source_node_id not in allowed_source_node_ids
        ):
            return {
                "window_mode": "new_window",
                "window_source_node_id": None,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": None,
            }

        source_window_id = self.prompt_window_id_by_node.get(source_node_id)

        if inbound_link.mode == "continue":
            return {
                "window_mode": "continue",
                "window_source_node_id": source_node_id,
                "window_id": source_window_id,
                "window_parent_id": None,
            }

        if inbound_link.mode == "branch":
            return {
                "window_mode": "branch",
                "window_source_node_id": source_node_id,
                "window_id": self._build_window_id(node.id),
                "window_parent_id": source_window_id,
            }

        return {
            "window_mode": None,
            "window_source_node_id": None,
            "window_id": None,
            "window_parent_id": None,
        }

    def _commit_prompt_window(
        self,
        *,
        node_id: str,
        window_runtime: dict[str, Any],
        rendered_prompt: str,
        output_text: str,
    ) -> None:
        """
        在 prompt 节点成功完成后提交窗口历史。

        正式口径：
        - 只有成功 prompt 才推进窗口历史
        - branch 后续分叉必须基于 source prompt 自己提交完成时的固定快照
        - failed prompt 不提交窗口，不污染后续 branch 基线

        当前限制：
        - window_id 仅在单次 run 内有意义
        """
        updated_history = list(window_runtime["base_messages"] or [])
        updated_history.append(HumanMessage(content=rendered_prompt))
        updated_history.append(AIMessage(content=output_text))

        window_id = window_runtime["window_id"]
        if not window_id:
            raise WorkflowDefinitionError(
                f"Prompt node '{node_id}' resolved no window_id at commit time"
            )

        self.window_histories[window_id] = updated_history
        self.prompt_window_id_by_node[node_id] = window_id

        # 固定保存“该 prompt 节点自己提交完成时”的快照。
        # 后续任何从它 branch 出去的节点，都必须基于这个快照。
        self.prompt_committed_history_by_node[node_id] = list(updated_history)

    def _resolve_prompt_template(
        self,
        node: WorkflowNode,
        config: PromptNodeConfig,
    ) -> tuple[str, str | None]:
        """
        解析当前 prompt 节点本次运行使用的正文。

        优先级：
        1) prompt_overrides[node.id]
        2) inline 模式使用 config.inlinePrompt
        3) template 模式使用 load_prompt(config.prompt)

        返回：
        - prompt_template: 本次运行要 format 的 prompt 正文
        - prompt_ref: 仅当走 template 文件引用时返回模板名；override/inline 返回 None

        注意：
        - prompt_overrides 是 run-time 临时覆盖，不属于保存态 workflow
        """
        override_prompt_text = self.prompt_overrides.get(node.id)
        if override_prompt_text is not None and str(override_prompt_text).strip():
            return str(override_prompt_text).strip(), None

        if config.promptMode == "inline":
            prompt_template = (config.inlinePrompt or "").strip()
            if not prompt_template:
                raise WorkflowDefinitionError(
                    f"Node '{node.id}' inline prompt is empty"
                )
            return prompt_template, None

        if config.promptMode == "template":
            prompt_name = (config.prompt or "").strip()
            if not prompt_name:
                raise WorkflowDefinitionError(
                    f"Node '{node.id}' prompt template name is empty"
                )
            try:
                return load_prompt(prompt_name), prompt_name
            except Exception as exc:
                raise WorkflowDefinitionError(
                    f"Node '{node.id}' prompt template load failed: {exc}"
                ) from exc

        raise WorkflowDefinitionError(
            f"Node '{node.id}' has invalid promptMode: {config.promptMode}"
        )

    def _build_failed_step(
        self,
        node: WorkflowNode,
        state: dict[str, Any],
        error_message: str,
        *,
        error_detail: str | None = None,
        execution_error: WorkflowNodeExecutionError | None = None,
        allowed_context_source_node_ids: set[str] | None = None,
    ) -> ExecutionStep:
        """
        基于当前已知 execution context 构造 failed execution step。

        正式口径：
        - failed step 尽量保留失败前已知的结构化上下文
        - prompt failed step 可携带 bound_inputs / rendered_prompt / window metadata
        - 失败路径字段允许比 success step 更不完整

        不负责：
        - 生成 run 级 failure summary
        """
        config = node.config

        try:
            primary_state_key = self._get_primary_state_key(node)
        except Exception:
            primary_state_key = None

        if isinstance(config, PromptNodeConfig):
            if execution_error is not None:
                bound_inputs = dict(getattr(execution_error, "bound_inputs", {}) or {})
                rendered_prompt = getattr(execution_error, "rendered_prompt", None)
                prompt_mode = (
                    getattr(execution_error, "prompt_mode", None) or config.promptMode
                )
                prompt_ref = getattr(execution_error, "prompt_ref", None)
                window_mode = getattr(execution_error, "window_mode", None)
                window_source_node_id = getattr(
                    execution_error,
                    "window_source_node_id",
                    None,
                )
                window_id = getattr(execution_error, "window_id", None)
                window_parent_id = getattr(execution_error, "window_parent_id", None)
            else:
                try:
                    bound_inputs = self._resolve_bound_inputs(
                        node.id,
                        state,
                        strict=False,
                    )
                except Exception:
                    bound_inputs = {}

                rendered_prompt = None
                prompt_mode = config.promptMode
                prompt_ref = config.prompt if config.promptMode == "template" else None

                window_metadata = self._build_prompt_window_metadata_for_failed_step(
                    node,
                    allowed_source_node_ids=allowed_context_source_node_ids,
                )
                window_mode = window_metadata["window_mode"]
                window_source_node_id = window_metadata["window_source_node_id"]
                window_id = window_metadata["window_id"]
                window_parent_id = window_metadata["window_parent_id"]

            return PromptFailedExecutionStep(
                node_id=node.id,
                primary_state_key=primary_state_key,
                prompt_mode=prompt_mode,
                prompt_ref=prompt_ref,
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                error_message=error_message,
                error_detail=error_detail or error_message,
                window_mode=window_mode,
                window_source_node_id=window_source_node_id,
                window_id=window_id,
                window_parent_id=window_parent_id,
            )

        if isinstance(config, OutputNodeConfig):
            if execution_error is not None:
                bound_inputs = dict(getattr(execution_error, "bound_inputs", {}) or {})
            else:
                try:
                    bound_inputs = self._resolve_bound_inputs(
                        node.id,
                        state,
                        strict=False,
                    )
                except Exception:
                    bound_inputs = {}

            return OutputFailedExecutionStep(
                node_id=node.id,
                primary_state_key=primary_state_key,
                bound_inputs=bound_inputs,
                error_message=error_message,
                error_detail=error_detail or error_message,
            )

        return InputFailedExecutionStep(
            node_id=node.id,
            primary_state_key=primary_state_key,
            error_message=error_message,
            error_detail=error_detail or error_message,
        )

    def _run_nodes(
        self,
        *,
        execution_order: list[str],
        initial_state: dict[str, Any],
        allowed_context_source_node_ids: set[str] | None = None,
    ) -> tuple[dict[str, Any], list[ExecutionStep]]:
        current_state = dict(initial_state)
        steps: list[ExecutionStep] = []

        for node_id in execution_order:
            node = self.node_map[node_id]
            started_at = utc_now_iso()
            start_perf = time.perf_counter()

            try:
                step_info, named_outputs = self.run_node(
                    node,
                    current_state,
                    allowed_context_source_node_ids=allowed_context_source_node_ids,
                )

                finished_at = utc_now_iso()
                duration_ms = int((time.perf_counter() - start_perf) * 1000)

                self._finalize_step_timing(
                    step_info,
                    started_at=started_at,
                    finished_at=finished_at,
                    duration_ms=duration_ms,
                )

                self._publish_named_outputs(node, named_outputs, current_state)
                steps.append(step_info)

            except WorkflowDefinitionError as exc:
                finished_at = utc_now_iso()
                duration_ms = int((time.perf_counter() - start_perf) * 1000)

                failed_step = self._build_failed_step(
                    node=node,
                    state=current_state,
                    error_message=str(exc),
                    error_detail=str(exc),
                    execution_error=None,
                    allowed_context_source_node_ids=allowed_context_source_node_ids,
                )
                self._finalize_step_timing(
                    failed_step,
                    started_at=started_at,
                    finished_at=finished_at,
                    duration_ms=duration_ms,
                )
                steps.append(failed_step)

                raise WorkflowRunError(
                    str(exc),
                    current_state,
                    steps,
                    error_type="workflow_definition_error",
                    error_detail=str(exc),
                    failure_stage="definition",
                ) from exc

            except WorkflowNodeExecutionError as exc:
                finished_at = utc_now_iso()
                duration_ms = int((time.perf_counter() - start_perf) * 1000)

                failed_step = self._build_failed_step(
                    node=node,
                    state=current_state,
                    error_message=str(exc),
                    error_detail=exc.error_detail,
                    execution_error=exc,
                    allowed_context_source_node_ids=allowed_context_source_node_ids,
                )
                self._finalize_step_timing(
                    failed_step,
                    started_at=started_at,
                    finished_at=finished_at,
                    duration_ms=duration_ms,
                )
                steps.append(failed_step)

                raise WorkflowRunError(
                    str(exc),
                    current_state,
                    steps,
                    error_type=exc.error_type,
                    error_detail=exc.error_detail,
                    failure_stage="execution",
                ) from exc

            except Exception as exc:
                finished_at = utc_now_iso()
                duration_ms = int((time.perf_counter() - start_perf) * 1000)

                failed_step = self._build_failed_step(
                    node=node,
                    state=current_state,
                    error_message=str(exc),
                    error_detail=str(exc),
                    execution_error=None,
                    allowed_context_source_node_ids=allowed_context_source_node_ids,
                )
                self._finalize_step_timing(
                    failed_step,
                    started_at=started_at,
                    finished_at=finished_at,
                    duration_ms=duration_ms,
                )
                steps.append(failed_step)

                raise WorkflowRunError(
                    str(exc),
                    current_state,
                    steps,
                    error_type="node_execution_failed",
                    error_detail=str(exc),
                    failure_stage="execution",
                ) from exc

        return current_state, steps

    def run(self, state: dict[str, Any]):
        """
        执行整个 workflow。

        输入：
        - state：本次运行的初始上下文，必须为 dict

        输出：
        - current_state：所有成功节点写回后的最终状态
        - steps：按真实执行顺序记录的 execution facts

        当前规则：
        - 节点执行先产生命名输出 {output_name: value}
        - 再由 outputs[].stateKey 发布到 current_state
        - engine 不直接产出 API/persisted step shape
        """
        if not isinstance(state, dict):
            raise ValueError("Initial state must be a dict")

        execution_order = self._topological_sort()
        return self._run_nodes(
            execution_order=execution_order,
            initial_state=dict(state),
        )

    def run_subgraph(
        self,
        *,
        start_node_id: str,
        state: dict[str, Any],
        end_node_ids: list[str] | None = None,
    ) -> tuple[dict[str, Any], list[ExecutionStep]]:
        """
        执行从 start_node_id 开始的子图。

        正式口径：
        - 只执行 start 节点及其下游、且位于 end_node_ids 截止范围内的节点
        - 子图外的结构化输入可由传入 state 提供
        - 子图测试默认忽略 start 节点之前的 prompt window；若 context source
          不在执行范围内，则按 new_window 处理
        """
        if not isinstance(state, dict):
            raise ValueError("Initial state must be a dict")

        selected_node_ids = self._build_subgraph_node_set(
            start_node_id=start_node_id,
            end_node_ids=end_node_ids,
        )
        execution_order = self._topological_sort(selected_node_ids)

        return self._run_nodes(
            execution_order=execution_order,
            initial_state=dict(state),
            allowed_context_source_node_ids=selected_node_ids,
        )

    def run_node(
        self,
        node: WorkflowNode,
        state: dict[str, Any],
        *,
        allowed_context_source_node_ids: set[str] | None = None,
    ):
        config = node.config

        if isinstance(config, InputNodeConfig):
            return self.run_input_node(node, state)

        if isinstance(config, PromptNodeConfig):
            return self.run_prompt_node(
                node,
                state,
                allowed_context_source_node_ids=allowed_context_source_node_ids,
            )

        if isinstance(config, OutputNodeConfig):
            return self.run_output_node(node, state)

        raise WorkflowDefinitionError(f"Unknown node config type for node '{node.id}'")

    def run_input_node(self, node: WorkflowNode, state: dict[str, Any]):
        config = node.config
        if not isinstance(config, InputNodeConfig):
            raise WorkflowDefinitionError(f"Node '{node.id}' is not an input node")

        output_spec = self._get_single_output_spec(node)
        value = state.get(config.inputKey, config.defaultValue)

        named_outputs = {
            output_spec.name: value,
        }

        step_info = InputSuccessExecutionStep(
            node_id=node.id,
            primary_state_key=output_spec.stateKey,
            value=value,
            published_state=self._build_published_state(node, named_outputs),
        )

        return step_info, named_outputs

    def run_prompt_node(
        self,
        node: WorkflowNode,
        state: dict[str, Any],
        *,
        bound_inputs_override: dict[str, Any] | None = None,
        window_runtime_override: dict[str, Any] | None = None,
        allowed_context_source_node_ids: set[str] | None = None,
    ):
        """
        执行单个 prompt 节点。

        正式口径：
        - 结构化输入来自 data edges 解析结果
        - prompt 正文来自 override / inline / template 三选一
        - 模型选择只由 modelResourceId 决定
        - llm 只承载运行参数

        多输出规则：
        - 当 outputs 数量大于 1 时，模型输出必须是 JSON object
        - 返回 key 集合必须与 outputs.name 完全一致

        不负责：
        - prompt 模板存在性与变量依赖的正式校验；那属于上游 validator
        """
        config = node.config
        if not isinstance(config, PromptNodeConfig):
            raise WorkflowDefinitionError(f"Node '{node.id}' is not a prompt node")

        bound_inputs = (
            dict(bound_inputs_override)
            if bound_inputs_override is not None
            else self._resolve_bound_inputs(node.id, state, strict=True)
        )
        primary_state_key = self._get_primary_state_key(node)

        prompt_template, prompt_ref = self._resolve_prompt_template(node, config)
        window_runtime = (
            dict(window_runtime_override)
            if window_runtime_override is not None
            else self._resolve_prompt_window_runtime(
                node,
                allowed_source_node_ids=allowed_context_source_node_ids,
            )
        )

        try:
            rendered_prompt = prompt_template.format(**bound_inputs)
        except KeyError as exc:
            raise PromptRenderError(
                f"Node '{node.id}' prompt formatting failed, missing variable: {exc}",
                bound_inputs=bound_inputs,
                rendered_prompt=None,
                prompt_mode=config.promptMode,
                prompt_ref=prompt_ref,
                window_mode=window_runtime["window_mode"],
                window_source_node_id=window_runtime["window_source_node_id"],
                window_id=window_runtime["window_id"],
                window_parent_id=window_runtime["window_parent_id"],
            ) from exc

        llm_config = config.llm
        try:
            model_resource = resolve_model_resource(
                config.modelResourceId,
                self.model_resource_registry,
            )
        except Exception as exc:
            raise WorkflowDefinitionError(
                f"Node '{node.id}' model resource resolve failed: {exc}"
            ) from exc

        llm = get_llm(
            provider=model_resource["provider"],
            api_key=model_resource["api_key"],
            model=model_resource["model"],
            temperature=llm_config.temperature,
            timeout=llm_config.timeout,
            max_retries=llm_config.max_retries,
            base_url=model_resource["base_url"],
        )

        try:
            messages_to_invoke = list(window_runtime["base_messages"] or [])
            messages_to_invoke.append(HumanMessage(content=rendered_prompt))

            response = invoke_llm(
                llm,
                messages=messages_to_invoke,
            )

            output_text = (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )

            output_specs = list(config.outputs or [])

            if len(output_specs) == 1:
                named_outputs = {
                    output_specs[0].name: output_text,
                }
            else:
                try:
                    parsed = json.loads(output_text)
                except Exception as exc:
                    raise StructuredOutputError(
                        f"Node '{node.id}' multi-output prompt must return valid JSON object: {exc}",
                        bound_inputs=bound_inputs,
                        rendered_prompt=rendered_prompt,
                        prompt_mode=config.promptMode,
                        prompt_ref=prompt_ref,
                        window_mode=window_runtime["window_mode"],
                        window_source_node_id=window_runtime["window_source_node_id"],
                        window_id=window_runtime["window_id"],
                        window_parent_id=window_runtime["window_parent_id"],
                    ) from exc

                if not isinstance(parsed, dict):
                    raise StructuredOutputError(
                        f"Node '{node.id}' multi-output prompt must return a JSON object",
                        bound_inputs=bound_inputs,
                        rendered_prompt=rendered_prompt,
                        prompt_mode=config.promptMode,
                        prompt_ref=prompt_ref,
                        window_mode=window_runtime["window_mode"],
                        window_source_node_id=window_runtime["window_source_node_id"],
                        window_id=window_runtime["window_id"],
                        window_parent_id=window_runtime["window_parent_id"],
                    )

                expected_names = {spec.name for spec in output_specs}
                actual_names = set(parsed.keys())

                if actual_names != expected_names:
                    raise StructuredOutputError(
                        f"Node '{node.id}' multi-output prompt returned keys {sorted(actual_names)}, "
                        f"expected {sorted(expected_names)}",
                        bound_inputs=bound_inputs,
                        rendered_prompt=rendered_prompt,
                        prompt_mode=config.promptMode,
                        prompt_ref=prompt_ref,
                        window_mode=window_runtime["window_mode"],
                        window_source_node_id=window_runtime["window_source_node_id"],
                        window_id=window_runtime["window_id"],
                        window_parent_id=window_runtime["window_parent_id"],
                    )

                named_outputs = parsed

        except WorkflowNodeExecutionError:
            raise
        except Exception as exc:
            raise WorkflowNodeExecutionError(
                str(exc),
                error_detail=str(exc),
                bound_inputs=bound_inputs,
                rendered_prompt=rendered_prompt,
                prompt_mode=config.promptMode,
                prompt_ref=prompt_ref,
                window_mode=window_runtime["window_mode"],
                window_source_node_id=window_runtime["window_source_node_id"],
                window_id=window_runtime["window_id"],
                window_parent_id=window_runtime["window_parent_id"],
            ) from exc

        self._commit_prompt_window(
            node_id=node.id,
            window_runtime=window_runtime,
            rendered_prompt=rendered_prompt,
            output_text=output_text,
        )

        step_info = PromptSuccessExecutionStep(
            node_id=node.id,
            primary_state_key=primary_state_key,
            prompt_mode=config.promptMode,
            prompt_ref=prompt_ref,
            bound_inputs=bound_inputs,
            rendered_prompt=rendered_prompt,
            raw_output_text=output_text,
            published_state=self._build_published_state(node, named_outputs),
            window_mode=window_runtime["window_mode"],
            window_source_node_id=window_runtime["window_source_node_id"],
            window_id=window_runtime["window_id"],
            window_parent_id=window_runtime["window_parent_id"],
        )

        return step_info, named_outputs

    def run_output_node(
        self,
        node: WorkflowNode,
        state: dict[str, Any],
        *,
        bound_inputs_override: dict[str, Any] | None = None,
    ):
        config = node.config
        if not isinstance(config, OutputNodeConfig):
            raise WorkflowDefinitionError(f"Node '{node.id}' is not an output node")

        output_spec = self._get_single_output_spec(node)
        bound_inputs = (
            dict(bound_inputs_override)
            if bound_inputs_override is not None
            else self._resolve_bound_inputs(node.id, state, strict=True)
        )

        if len(bound_inputs) == 1:
            output_value = next(iter(bound_inputs.values()))
        else:
            output_value = dict(bound_inputs)

        if self.output_exporter is not None:
            try:
                self.output_exporter.export_output(
                    node_id=node.id,
                    value=output_value,
                )
            except OutputExportError as exc:
                raise OutputWriteError(
                    f"Output node '{node.id}' failed to write markdown file",
                    error_detail=str(exc),
                    bound_inputs=bound_inputs,
                ) from exc

        named_outputs = {
            output_spec.name: output_value,
        }

        step_info = OutputSuccessExecutionStep(
            node_id=node.id,
            primary_state_key=output_spec.stateKey,
            bound_inputs=bound_inputs,
            value=output_value,
            published_state=self._build_published_state(node, named_outputs),
        )

        return step_info, named_outputs