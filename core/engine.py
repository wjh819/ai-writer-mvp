from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from contracts.workflow_contracts import (
    InputNodeConfig as _InputNodeConfig,
    OutputNodeConfig as _OutputNodeConfig,
    PromptNodeConfig as _PromptNodeConfig,
    WorkflowContextLink as _WorkflowContextLink,
    WorkflowEditorData as _WorkflowEditorData,
    WorkflowEdge as _WorkflowEdge,
    WorkflowNode as _WorkflowNode,
)
from core.execution_types import (
    ExecutionStep as _ExecutionStep,
    InputFailedExecutionStep as _InputFailedExecutionStep,
    InputSuccessExecutionStep as _InputSuccessExecutionStep,
    OutputFailedExecutionStep as _OutputFailedExecutionStep,
    OutputSuccessExecutionStep as _OutputSuccessExecutionStep,
    PromptFailedExecutionStep as _PromptFailedExecutionStep,
    PromptSuccessExecutionStep as _PromptSuccessExecutionStep,
)
from core.engine_errors import (
    MissingInputsError as _MissingInputsError,
    OutputWriteError as _OutputWriteError,
    PromptRenderError as _PromptRenderError,
    StructuredOutputError as _StructuredOutputError,
    WorkflowDefinitionError,
    WorkflowNodeExecutionError as _WorkflowNodeExecutionError,
)
from core.engine_execution_loop import (
    execute_nodes as _execute_nodes_impl,
)
from core.engine_graph import (
    _build_graph as _build_graph_impl,
    _build_subgraph_node_set as _build_subgraph_node_set_impl,
    _topological_sort as _topological_sort_impl,
)
from core.engine_node_runners import (
    _resolve_bound_inputs as _resolve_bound_inputs_impl,
    _resolve_prompt_text as _resolve_prompt_text_impl,
    run_input_node as _run_input_node_impl,
    run_output_node as _run_output_node_impl,
    run_prompt_node as _run_prompt_node_impl,
)
from core.engine_runtime import (
    WorkflowRunRuntime as _WorkflowRunRuntime,
    build_workflow_run_runtime as _build_workflow_run_runtime,
)
from core.model_resource_registry import (
    load_model_resource_registry as _load_model_resource_registry,
)
from core.output_exporter import (
    OutputExportError as _OutputExportError,
    WorkflowOutputExporter as _WorkflowOutputExporter,
)

"""
workflow 鎵ц寮曟搸銆?
鏈枃浠惰鑹诧細
- 娑堣垂鍚堟硶 canonical workflow
- 鎵ц鑺傜偣銆佺淮鎶ょ姸鎬併€佷骇鍑?execution facts

璐熻矗锛?- 鍩轰簬 nodes / edges / contextLinks 鏋勫缓鎵ц鍏崇郴鍥?- 瑙ｆ瀽缁撴瀯鍖栬緭鍏ョ粦瀹?- 鎵ц input / prompt / output 鑺傜偣
- 缁存姢鍗曟 run 鍐呯殑 prompt window 杩愯鏃剁姸鎬?- 鏋勯€?success / failed execution step
- 鏀寔 full run 涓?subgraph run

涓嶈礋璐ｏ細
- workflow canonical contract 瀹氫箟
- save/load 瑙勫垯
- HTTP response 鐢熸垚
- persisted run 璁板綍
- 姝ｅ紡 validator 瑁佸喅

涓婁笅娓革細
- 涓婃父杈撳叆鏉ヨ嚜 normalize + validator 鍚庣殑 WorkflowEditorData
- 涓嬫父杈撳嚭鐢?workflow_run_service 鍖呰涓?WorkflowExecutionResult

褰撳墠闄愬埗 / 寰呮敹鍙ｇ偣锛?- window_id 褰撳墠鏄?run-local synthetic identifier锛屼笉鏄?durable identity
- 鍚屽眰鍙墽琛岃妭鐐归『搴忎緷璧栧綋鍓嶅浘鏋勫缓椤哄簭锛屽皻鏃犵嫭绔?canonical ordering
- validator 涓?engine 涔嬮棿瀛樺湪閮ㄥ垎闃插尽鎬ц鍒欓噸澶?"""

__all__ = [
    "WorkflowEngine",
    "WorkflowDefinitionError",
]

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

class WorkflowEngine:
    """
    宸ヤ綔娴佹墽琛屽紩鎿庛€?
    姝ｅ紡鍙ｅ緞锛?    - engine 鐩存帴娑堣垂 WorkflowEditorData
    - engine 涓嶅啀鎷ユ湁鐙珛 workflow contract
    - workflow 鍚堟硶鎬х敱涓婃父 normalize + validator 淇濊瘉
    - engine 鍙墽琛屽悎娉?canonical workflow锛屽苟浜у嚭 execution facts

    褰撳墠绐楀彛璇箟瀹炵幇锛?    - 鍙湪鍗曟 run 鍐呯淮鎶ゅ唴瀛樼獥鍙ｆ敞鍐岃〃
    - 涓嶆帴 provider-native conversation / branch API
    - 閫氳繃娑堟伅鍘嗗彶閲嶆斁瀹炵幇 new_window / continue / branch

    娉ㄦ剰锛?    - engine 杩斿洖鐨勬槸 execution facts锛屼笉鏄?direct run HTTP result
    - run 绾?status / error_type / failure_stage / finished_at 涓嶇敱鏈被鐩存帴瀹氫箟
    """
    _workflow_definition_error_cls = WorkflowDefinitionError
    _workflow_node_execution_error_cls = _WorkflowNodeExecutionError
    _missing_inputs_error_cls = _MissingInputsError
    _prompt_render_error_cls = _PromptRenderError
    _structured_output_error_cls = _StructuredOutputError
    _output_write_error_cls = _OutputWriteError
    _output_export_error_cls = _OutputExportError
    _input_success_step_cls = _InputSuccessExecutionStep
    _prompt_success_step_cls = _PromptSuccessExecutionStep
    _output_success_step_cls = _OutputSuccessExecutionStep

    def __init__(
        self,
        workflow_data: _WorkflowEditorData,
        prompt_overrides: dict[str, str] | None = None,
        output_exporter: _WorkflowOutputExporter | None = None,
        progress_callback: Any | None = None,
    ):
        if not isinstance(workflow_data, _WorkflowEditorData):
            raise ValueError("workflow_data must be WorkflowEditorData")

        self.workflow = workflow_data
        self.nodes: list[_WorkflowNode] = workflow_data.nodes
        self.edges: list[_WorkflowEdge] = workflow_data.edges
        self.context_links: list[_WorkflowContextLink] = workflow_data.contextLinks
        self.node_map: dict[str, _WorkflowNode] = {node.id: node for node in self.nodes}

        self.graph: dict[str, list[str]] = defaultdict(list)
        self.in_degree: dict[str, int] = defaultdict(int)
        self.incoming_edges_by_target: dict[str, list[_WorkflowEdge]] = defaultdict(list)
        self.incoming_context_link_by_target: dict[str, _WorkflowContextLink | None] = {}

        self.model_resource_registry = _load_model_resource_registry()
        self.prompt_overrides = dict(prompt_overrides or {})



        self._build_graph()
        self.output_exporter = output_exporter
        self.progress_callback = progress_callback
    def _build_graph(self) -> None:
        _build_graph_impl(
            nodes=self.nodes,
            edges=self.edges,
            context_links=self.context_links,
            node_map=self.node_map,
            graph=self.graph,
            in_degree=self.in_degree,
            incoming_edges_by_target=self.incoming_edges_by_target,
            incoming_context_link_by_target=self.incoming_context_link_by_target,
            definition_error_cls=WorkflowDefinitionError,
        )

    def _notify_node_started(
            self,
            *,
            node_id: str,
            current_state: dict[str, Any],
            steps,
    ) -> None:
        callback = getattr(self.progress_callback, "on_node_started", None)
        if callable(callback):
            callback(
                node_id=node_id,
                current_state=dict(current_state or {}),
                steps=list(steps or []),
            )

    def _notify_node_succeeded(
            self,
            *,
            current_state: dict[str, Any],
            steps,
    ) -> None:
        callback = getattr(self.progress_callback, "on_node_succeeded", None)
        if callable(callback):
            callback(
                current_state=dict(current_state or {}),
                steps=list(steps or []),
            )

    def _notify_node_failed(
            self,
            *,
            node_id: str,
            current_state: dict[str, Any] | None,
            steps,
            error_type: str | None,
            error_message: str | None,
            error_detail: str | None,
            failure_stage: str | None,
    ) -> None:
        callback = getattr(self.progress_callback, "on_node_failed", None)
        if callable(callback):
            callback(
                node_id=node_id,
                current_state=dict(current_state or {}) if current_state is not None else None,
                steps=list(steps or []),
                error_type=error_type,
                error_message=error_message,
                error_detail=error_detail,
                failure_stage=failure_stage,
            )

    def _execute_runtime(
        self,
        *,
        execution_order: list[str],
        initial_state: dict[str, Any],
        allowed_context_source_node_ids: set[str] | None = None,
    ) -> tuple[dict[str, Any], list[_ExecutionStep]]:
        runtime = _build_workflow_run_runtime(initial_state)
        _execute_nodes_impl(
            execution_order=execution_order,
            node_map=self.node_map,
            runtime=runtime,
            run_node=self.run_node,
            notify_node_started=self._notify_node_started,
            notify_node_succeeded=self._notify_node_succeeded,
            notify_node_failed=self._notify_node_failed,
            resolve_bound_inputs=self._resolve_bound_inputs,
            incoming_context_link_by_target=self.incoming_context_link_by_target,
            utc_now_iso=utc_now_iso,
            allowed_context_source_node_ids=allowed_context_source_node_ids,
        )
        return runtime.current_state, runtime.steps

    def run(self, state: dict[str, Any]):
        """
        鎵ц鏁翠釜 workflow銆?
        杈撳叆锛?        - state锛氭湰娆¤繍琛岀殑鍒濆涓婁笅鏂囷紝蹇呴』涓?dict

        杈撳嚭锛?        - current_state锛氭墍鏈夋垚鍔熻妭鐐瑰啓鍥炲悗鐨勬渶缁堢姸鎬?        - steps锛氭寜鐪熷疄鎵ц椤哄簭璁板綍鐨?execution facts

        褰撳墠瑙勫垯锛?        - 鑺傜偣鎵ц鍏堜骇鐢熷懡鍚嶈緭鍑?{output_name: value}
        - 鍐嶇敱 outputs[].stateKey 鍙戝竷鍒?current_state
        - engine 涓嶇洿鎺ヤ骇鍑?API/persisted step shape
        """
        if not isinstance(state, dict):
            raise ValueError("Initial state must be a dict")

        execution_order = _topological_sort_impl(
            graph=self.graph,
            node_order=[node.id for node in self.nodes],
            selected_node_ids=None,
            definition_error_cls=WorkflowDefinitionError,
        )
        return self._execute_runtime(
            execution_order=execution_order,
            initial_state=dict(state),
        )

    def run_subgraph(
        self,
        *,
        start_node_id: str,
        state: dict[str, Any],
        end_node_ids: list[str] | None = None,
    ) -> tuple[dict[str, Any], list[_ExecutionStep]]:
        """
        鎵ц浠?start_node_id 寮€濮嬬殑瀛愬浘銆?
        姝ｅ紡鍙ｅ緞锛?        - 鍙墽琛?start 鑺傜偣鍙婂叾涓嬫父銆佷笖浣嶄簬 end_node_ids 鎴鑼冨洿鍐呯殑鑺傜偣
        - 瀛愬浘澶栫殑缁撴瀯鍖栬緭鍏ュ彲鐢变紶鍏?state 鎻愪緵
        - 瀛愬浘娴嬭瘯榛樿蹇界暐 start 鑺傜偣涔嬪墠鐨?prompt window锛涜嫢 context source
          涓嶅湪鎵ц鑼冨洿鍐咃紝鍒欐寜 new_window 澶勭悊
        """
        if not isinstance(state, dict):
            raise ValueError("Initial state must be a dict")

        selected_node_ids = _build_subgraph_node_set_impl(
            start_node_id=start_node_id,
            end_node_ids=end_node_ids,
            graph=self.graph,
            node_ids=set(self.node_map.keys()),
            definition_error_cls=WorkflowDefinitionError,
        )
        execution_order = _topological_sort_impl(
            graph=self.graph,
            node_order=[node.id for node in self.nodes],
            selected_node_ids=selected_node_ids,
            definition_error_cls=WorkflowDefinitionError,
        )

        return self._execute_runtime(
            execution_order=execution_order,
            initial_state=dict(state),
            allowed_context_source_node_ids=selected_node_ids,
        )

    def run_node(
        self,
        node: _WorkflowNode,
        state: dict[str, Any],
        *,
        runtime: _WorkflowRunRuntime,
        allowed_context_source_node_ids: set[str] | None = None,
    ):
        config = node.config

        if isinstance(config, _InputNodeConfig):
            return self.run_input_node(node, state)

        if isinstance(config, _PromptNodeConfig):
            return self.run_prompt_node(
                node,
                state,
                runtime=runtime,
                allowed_context_source_node_ids=allowed_context_source_node_ids,
            )

        if isinstance(config, _OutputNodeConfig):
            return self.run_output_node(node, state)

        raise WorkflowDefinitionError(f"Unknown node config type for node '{node.id}'")
    _resolve_bound_inputs = _resolve_bound_inputs_impl
    _resolve_prompt_text = _resolve_prompt_text_impl
    run_input_node = _run_input_node_impl
    run_prompt_node = _run_prompt_node_impl
    run_output_node = _run_output_node_impl
