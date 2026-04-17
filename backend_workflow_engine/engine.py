from __future__ import annotations
from collections import defaultdict
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any, Protocol

from contracts.workflow_contracts import (
    InputNodeConfig as _InputNodeConfig,
    OutputNodeConfig as _OutputNodeConfig,
    PromptNodeConfig as _PromptNodeConfig,
    WorkflowContextLink as _WorkflowContextLink,
    WorkflowEditorData as _WorkflowEditorData,
    WorkflowEdge as _WorkflowEdge,
    WorkflowNode as _WorkflowNode,
)
from backend_workflow_engine.execution_types import (
    ExecutionStep as _ExecutionStep,
    InputFailedExecutionStep as _InputFailedExecutionStep,
    InputSuccessExecutionStep as _InputSuccessExecutionStep,
    OutputFailedExecutionStep as _OutputFailedExecutionStep,
    OutputSuccessExecutionStep as _OutputSuccessExecutionStep,
    PromptFailedExecutionStep as _PromptFailedExecutionStep,
    PromptSuccessExecutionStep as _PromptSuccessExecutionStep,
)
from backend_workflow_engine.engine_errors import (
    MissingInputsError as _MissingInputsError,
    OutputWriteError as _OutputWriteError,
    PromptRenderError as _PromptRenderError,
    StructuredOutputError as _StructuredOutputError,
    WorkflowDefinitionError,
    WorkflowNodeExecutionError as _WorkflowNodeExecutionError,
)
from backend_workflow_engine.engine_execution_loop import (
    execute_nodes as _execute_nodes_impl,
)
from backend_workflow_engine.engine_graph import (
    _build_graph as _build_graph_impl,
    _build_subgraph_node_set as _build_subgraph_node_set_impl,
    _topological_sort as _topological_sort_impl,
)
from backend_workflow_engine.engine_node_runners import (
    _resolve_bound_inputs as _resolve_bound_inputs_impl,
    _resolve_prompt_text as _resolve_prompt_text_impl,
    run_input_node as _run_input_node_impl,
    run_output_node as _run_output_node_impl,
    run_prompt_node as _run_prompt_node_impl,
)
from backend_workflow_engine.engine_runtime import (
    WorkflowRunRuntime as _WorkflowRunRuntime,
    build_workflow_run_runtime as _build_workflow_run_runtime,
)

"""
workflow 閹笛嗩攽瀵洘鎼搁妴?
閺堫剚鏋冩禒鎯邦潡閼硅绱?
- 濞戝牐鍨傞崥鍫熺《 canonical workflow
- 閹笛嗩攽閼哄倻鍋ｉ妴浣烘樊閹躲倗濮搁幀浣碘偓浣烽獓閸?execution facts

鐠愮喕鐭楅敍?- 閸╄桨绨?nodes / edges / contextLinks 閺嬪嫬缂撻幍褑顢戦崗宕囬兇閸?- 鐟欙絾鐎界紒鎾寸€崠鏍翻閸忋儳绮︾€?- 閹笛嗩攽 input / prompt / output 閼哄倻鍋?
- 缂佸瓨濮㈤崡鏇燁偧 run 閸愬懐娈?prompt window 鏉╂劘顢戦弮鍓佸Ц閹?- 閺嬪嫰鈧?success / failed execution step
- 閺€顖涘瘮 full run 娑?subgraph run

娑撳秷绀嬬拹锝忕窗
- workflow canonical contract 鐎规矮绠?
- save/load 鐟欏嫬鍨?
- HTTP response 閻㈢喐鍨?
- persisted run 鐠佹澘缍?
- 濮濓絽绱?validator 鐟佷礁鍠?

娑撳﹣绗呭〒闈╃窗
- 娑撳﹥鐖舵潏鎾冲弳閺夈儴鍤?normalize + validator 閸氬海娈?WorkflowEditorData
- 娑撳鐖舵潏鎾冲毉閻?workflow_run_service 閸栧懓顥婃稉?WorkflowExecutionResult

瑜版挸澧犻梽鎰煑 / 瀵板懏鏁归崣锝囧仯閿?- window_id 瑜版挸澧犻弰?run-local synthetic identifier閿涘奔绗夐弰?durable identity
- 閸氬苯鐪伴崣顖涘⒔鐞涘矁濡悙褰掋€庢惔蹇庣贩鐠ф牕缍嬮崜宥呮禈閺嬪嫬缂撴い鍝勭碍閿涘苯鐨婚弮鐘靛缁?canonical ordering
- validator 娑?engine 娑斿妫跨€涙ê婀柈銊ュ瀻闂冩彃灏介幀褑顫夐崚娆撳櫢婢?"""

__all__ = [
    "WorkflowEngine",
    "WorkflowDefinitionError",
]

ModelResourceResolverPort = Callable[[str], dict[str, Any]]
LLMFactoryPort = Callable[..., Any]
LLMInvokerPort = Callable[..., Any]


class OutputSinkPort(Protocol):
    def export_output(self, *, node_id: str, value: Any) -> str:
        ...


def _unconfigured_model_resource_resolver(model_resource_id: str) -> dict[str, Any]:
    raise ValueError(
        "WorkflowEngine model_resource_resolver is not configured "
        f"for model resource '{model_resource_id}'"
    )


def _unconfigured_llm_factory(**_kwargs: Any) -> Any:
    raise ValueError("WorkflowEngine llm_factory is not configured")


def _unconfigured_llm_invoker(_llm: Any, **_kwargs: Any) -> Any:
    raise ValueError("WorkflowEngine llm_invoker is not configured")

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

class WorkflowEngine:
    """
    瀹搞儰缍斿ù浣瑰⒔鐞涘苯绱╅幙搴涒偓?
    濮濓絽绱￠崣锝呯窞閿?    - engine 閻╁瓨甯村☉鍫ｅ瀭 WorkflowEditorData
    - engine 娑撳秴鍟€閹枫儲婀侀悪顒傜彌 workflow contract
    - workflow 閸氬牊纭堕幀褏鏁辨稉濠冪埗 normalize + validator 娣囨繆鐦?
    - engine 閸欘亝澧界悰灞芥値濞?canonical workflow閿涘苯鑻熸禍褍鍤?execution facts

    瑜版挸澧犵粣妤€褰涚拠顓濈疅鐎圭偟骞囬敍?    - 閸欘亜婀崡鏇燁偧 run 閸愬懐娣幎銈呭敶鐎涙鐛ラ崣锝嗘暈閸愬矁銆?
    - 娑撳秵甯?provider-native conversation / branch API
    - 闁俺绻冨☉鍫熶紖閸樺棗褰堕柌宥嗘杹鐎圭偟骞?new_window / continue / branch

    濞夈劍鍓伴敍?    - engine 鏉╂柨娲栭惃鍕Ц execution facts閿涘奔绗夐弰?direct run HTTP result
    - run 缁?status / error_type / failure_stage / finished_at 娑撳秶鏁遍張顒傝閻╁瓨甯寸€规矮绠?
    """
    _workflow_definition_error_cls = WorkflowDefinitionError
    _workflow_node_execution_error_cls = _WorkflowNodeExecutionError
    _missing_inputs_error_cls = _MissingInputsError
    _prompt_render_error_cls = _PromptRenderError
    _structured_output_error_cls = _StructuredOutputError
    _output_write_error_cls = _OutputWriteError
    _input_success_step_cls = _InputSuccessExecutionStep
    _prompt_success_step_cls = _PromptSuccessExecutionStep
    _output_success_step_cls = _OutputSuccessExecutionStep

    def __init__(
        self,
        workflow_data: _WorkflowEditorData,
        prompt_overrides: dict[str, str] | None = None,
        output_sink: OutputSinkPort | None = None,
        # backward-compatible alias; prefer output_sink
        output_exporter: OutputSinkPort | None = None,
        model_resource_resolver: ModelResourceResolverPort | None = None,
        llm_factory: LLMFactoryPort | None = None,
        llm_invoker: LLMInvokerPort | None = None,
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

        self.prompt_overrides = dict(prompt_overrides or {})

        if output_sink is not None and output_exporter is not None:
            raise ValueError("Pass either output_sink or output_exporter, not both")

        self.model_resource_resolver = (
            model_resource_resolver or _unconfigured_model_resource_resolver
        )
        self.llm_factory = llm_factory or _unconfigured_llm_factory
        self.llm_invoker = llm_invoker or _unconfigured_llm_invoker
        self.output_sink = output_sink if output_sink is not None else output_exporter

        self._build_graph()
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
        閹笛嗩攽閺佺繝閲?workflow閵?
        鏉堟挸鍙嗛敍?        - state閿涙碍婀板▎陇绻嶇悰宀€娈戦崚婵嗩潗娑撳﹣绗呴弬鍥风礉韫囧懘銆忔稉?dict

        鏉堟挸鍤敍?        - current_state閿涙碍澧嶉張澶嬪灇閸旂喕濡悙鐟板晸閸ョ偛鎮楅惃鍕付缂佸牏濮搁幀?        - steps閿涙碍瀵滈惇鐔风杽閹笛嗩攽妞ゅ搫绨拋鏉跨秿閻?execution facts

        瑜版挸澧犵憴鍕灟閿?        - 閼哄倻鍋ｉ幍褑顢戦崗鍫滈獓閻㈢喎鎳￠崥宥堢翻閸?{output_name: value}
        - 閸愬秶鏁?outputs[].stateKey 閸欐垵绔烽崚?current_state
        - engine 娑撳秶娲块幒銉ら獓閸?API/persisted step shape
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
        閹笛嗩攽娴?start_node_id 瀵偓婵娈戠€涙劕娴橀妴?
        濮濓絽绱￠崣锝呯窞閿?        - 閸欘亝澧界悰?start 閼哄倻鍋ｉ崣濠傚従娑撳鐖堕妴浣风瑬娴ｅ秳绨?end_node_ids 閹搭亝顒涢懠鍐ㄦ纯閸愬懐娈戦懞鍌滃仯
        - 鐎涙劕娴樻径鏍畱缂佹挻鐎崠鏍翻閸忋儱褰查悽鍙樼炊閸?state 閹绘劒绶?
        - 鐎涙劕娴樺ù瀣槸姒涙顓昏箛鐣屾殣 start 閼哄倻鍋ｆ稊瀣閻?prompt window閿涙稖瀚?context source
          娑撳秴婀幍褑顢戦懠鍐ㄦ纯閸愬拑绱濋崚娆愬瘻 new_window 婢跺嫮鎮?
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


