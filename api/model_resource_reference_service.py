"""
model resource 删除保护扫描服务层。

本文件角色：
- 扫描正式 workflow 存储链中对某个 model resource 的引用
- 定义“是否允许删除”的保守策略

负责：
- 复用正式 workflow 列表规则
- 对 raw workflow YAML 做最小引用扫描
- 生成结构化 delete blocked detail
- 在不可安全删除时抛出结构化 AppError

不负责：
- canonical workflow load / normalize / validator
- model resource 配置读取
- HTTP response 生成

上下游：
- 上游由删除接口传入 resource_id
- 下游返回 shared detail contract，供 route / 前端消费

当前限制 / 待收口点：
- 扫描逻辑绑定当前 persistent YAML shape；持久化布局变化时必须联动修改
- 对外 detail 仍保留 workflow_name 兼容字段名，内部真实语义更接近 canvas_id
- 删除策略是保守阻止：只要存在引用或无法可靠扫描，即不允许删除
"""
from __future__ import annotations

from typing import List

from app_errors import (
    AppError,
    InvalidInputError,
    ModelResourceDeleteBlockedError,
)
from api.workflow_loader import (
    get_canvas_workflow_path,
    list_canvas_summaries,
    load_yaml_workflow,
)
from contracts.model_resource_contracts import (
    IncompleteWorkflowReferenceScanItem,
    ModelResourceDeleteBlockedDetail,
    ModelResourceReference,
)


def _trim(value) -> str:
    """
    轻量文本辅助。

    只负责：
    - None -> ""
    - 宽松 str() 强转后 strip

    不负责：
    - 严格字段合法性裁决
    """
    if value is None:
        return ""
    return str(value).strip()


def _extract_error_message(exc: Exception) -> str:
    """
    轻量错误文本提取辅助。

    只负责：
    - 优先提取 exc.detail 中的字符串
    - 否则回退到 str(exc)

    不负责：
    - 结构化错误翻译
    """
    detail = getattr(exc, "detail", None)
    if isinstance(detail, str) and detail:
        return detail
    return str(exc)


def list_canvas_workflow_targets() -> List[tuple[str, str]]:
    """
    列出当前正式 workflow 存储链中的全部扫描目标。

    输出：
    - [(canvas_id, workflow_path), ...]

    正式口径：
    - 直接复用 workflow_loader 已收口的正式 workflow 列表规则
    - 不在这里重复实现目录扫描/过滤逻辑

    不负责：
    - workflow 文件是否可被 canonical load
    """
    items: list[tuple[str, str]] = []

    for summary in list_canvas_summaries():
        canvas_id = _trim(summary.get("canvas_id"))
        if not canvas_id:
            continue

        workflow_path = get_canvas_workflow_path(canvas_id)
        items.append((canvas_id, workflow_path))

    return items


def _build_incomplete_scan_item(
    canvas_id: str,
    error_message: str,
) -> IncompleteWorkflowReferenceScanItem:
    """
    构造“扫描不完整”项。

    兼容说明：
    - 内部语义当前已经是 canvas_id
    - 但对外 contract 字段名仍保持 workflow_name，避免继续改动 detail shape
    """
    return IncompleteWorkflowReferenceScanItem(
        workflow_name=canvas_id,
        error_message=error_message,
    )


def _scan_raw_workflow_for_resource_references(
    canvas_id: str,
    raw_data: dict,
    resource_id: str,
) -> tuple[list[ModelResourceReference], IncompleteWorkflowReferenceScanItem | None]:
    """
    在原始 YAML 数据上做最小引用扫描。

    输入：
    - canvas_id: 当前 workflow 标识
    - raw_data: workflow.yaml 原始 dict
    - resource_id: 待扫描资源 id

    输出：
    - references: 当前文件中已确认的引用列表
    - incomplete_item:
        - None: 可可靠完成扫描
        - 非 None: 文件坏到无法继续可靠扫描

    正式口径：
    - 只扫描 nodes 字典
    - 只关心 prompt 节点的 modelResourceId
    - 不做 normalize / validator / dependency check

    当前限制：
    - 本扫描逻辑绑定当前 persistent YAML shape
    - 若中途遇到无法继续可靠扫描的节点，返回“部分 references + incomplete item”
    """
    if not isinstance(raw_data, dict):
        return [], _build_incomplete_scan_item(
            canvas_id,
            "Workflow YAML root must be an object",
        )

    raw_nodes = raw_data.get("nodes")
    if not isinstance(raw_nodes, dict):
        return [], _build_incomplete_scan_item(
            canvas_id,
            "Workflow YAML 'nodes' must be an object",
        )

    references: list[ModelResourceReference] = []

    for raw_node_id, raw_node in raw_nodes.items():
        node_id = _trim(raw_node_id)

        if not isinstance(raw_node, dict):
            return references, _build_incomplete_scan_item(
                canvas_id,
                f"Workflow node '{node_id or '(empty)'}' must be an object",
            )

        node_type = _trim(raw_node.get("type"))
        if node_type != "prompt":
            continue

        model_resource_id = _trim(raw_node.get("modelResourceId"))
        if model_resource_id != resource_id:
            continue

        references.append(
            ModelResourceReference(
                workflow_name=canvas_id,
                node_id=node_id,
                model_resource_id=resource_id,
            )
        )

    return references, None


def scan_model_resource_references(
    resource_id: str,
) -> tuple[list[ModelResourceReference], list[IncompleteWorkflowReferenceScanItem]]:
    """
    扫描某个 model resource 在全部 workflow 中的引用情况。

    输出：
    - references: 已确认真实引用
    - incomplete_workflows: 无法可靠完成扫描的 workflow 列表

    正式口径：
    - 扫描范围为当前正式 workflow 存储链中的全部 canvas workflow
    - 只做原始 YAML 最小引用扫描
    - 不要求 workflow 能通过 canonical load / normalize / validator

    当前限制：
    - 只要文件坏到无法可靠扫描，就会被记录进 incomplete_workflows
    """
    normalized_resource_id = _trim(resource_id)
    references: list[ModelResourceReference] = []
    incomplete_workflows: list[IncompleteWorkflowReferenceScanItem] = []

    if not normalized_resource_id:
        return references, incomplete_workflows

    for canvas_id, workflow_path in list_canvas_workflow_targets():
        try:
            raw_data = load_yaml_workflow(workflow_path)
        except AppError as exc:
            incomplete_workflows.append(
                _build_incomplete_scan_item(
                    canvas_id=canvas_id,
                    error_message=_extract_error_message(exc),
                )
            )
            continue
        except Exception as exc:
            incomplete_workflows.append(
                _build_incomplete_scan_item(
                    canvas_id=canvas_id,
                    error_message=str(exc),
                )
            )
            continue

        workflow_references, incomplete_item = _scan_raw_workflow_for_resource_references(
            canvas_id=canvas_id,
            raw_data=raw_data,
            resource_id=normalized_resource_id,
        )

        references.extend(workflow_references)

        if incomplete_item is not None:
            incomplete_workflows.append(incomplete_item)

    return references, incomplete_workflows


def build_model_resource_delete_blocked_detail(
    resource_id: str,
) -> ModelResourceDeleteBlockedDetail | None:
    """
    生成“resource 删除被阻止”时的结构化 detail。

    输出：
    - 存在阻止原因时返回 ModelResourceDeleteBlockedDetail
    - 无阻止原因时返回 None

    规则优先级：
    1. 若存在真实引用，则优先返回 model_resource_in_use
    2. 否则若存在无法可靠扫描的 workflow，则返回 reference_scan_incomplete
    3. 两者都不存在时，返回 None

    注意：
    - 当前 detail 会尽量保留完整背景信息
    - 即使存在真实引用，也可能同时带出 incomplete_workflows
    """
    normalized_resource_id = _trim(resource_id)
    references, incomplete_workflows = scan_model_resource_references(
        normalized_resource_id
    )

    if references:
        return ModelResourceDeleteBlockedDetail(
            error_type="model_resource_in_use",
            message=(
                f"Model resource '{normalized_resource_id}' is still referenced "
                f"by workflows"
            ),
            references=references,
            incomplete_workflows=incomplete_workflows,
        )

    if incomplete_workflows:
        return ModelResourceDeleteBlockedDetail(
            error_type="model_resource_reference_scan_incomplete",
            message=(
                f"Cannot verify whether model resource '{normalized_resource_id}' "
                f"is safe to delete because some workflow files could not be "
                f"scanned reliably"
            ),
            references=[],
            incomplete_workflows=incomplete_workflows,
        )

    return None


def assert_model_resource_deletable(resource_id: str):
    """
    断言某个 model resource 当前允许删除。

    正式口径：
    - 删除策略为保守阻止
    - 只要存在真实引用，或存在无法可靠扫描的 workflow，即不允许删除

    不负责：
    - HTTPException 翻译

    输出：
    - 允许删除时返回 None
    - 不允许删除时抛 ModelResourceDeleteBlockedError，并携带结构化 detail
    """
    normalized_resource_id = _trim(resource_id)
    if not normalized_resource_id:
        raise InvalidInputError("Model resource id is required")

    blocked_detail = build_model_resource_delete_blocked_detail(normalized_resource_id)
    if blocked_detail is None:
        return

    raise ModelResourceDeleteBlockedError(blocked_detail.model_dump())