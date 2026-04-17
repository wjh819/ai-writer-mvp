from __future__ import annotations

import ast
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
RUN_HTTP_SCHEMAS_PATH = PROJECT_ROOT / "api" / "run_http_schemas.py"
RUN_RESULT_MAPPER_PATH = PROJECT_ROOT / "api" / "run_result_mapper.py"
RUN_CONTRACTS_PATH = PROJECT_ROOT / "contracts" / "run_contracts.py"


def _parse_module(path: pathlib.Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))


def _imported_modules(module: ast.Module) -> set[str]:
    modules: set[str] = set()

    for node in ast.walk(module):
        if isinstance(node, ast.Import):
            for alias in node.names:
                modules.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            modules.add(node.module or "")

    return modules


def test_run_contract_owner_stays_inside_contracts_layer() -> None:
    module = _parse_module(RUN_CONTRACTS_PATH)
    imported_modules = _imported_modules(module)

    forbidden = [module_name for module_name in imported_modules if module_name.startswith("api")]
    assert forbidden == []

    class_names = {
        node.name
        for node in module.body
        if isinstance(node, ast.ClassDef)
    }
    assert {
        "RunDraftRequest",
        "SubgraphTestRequest",
        "RunResult",
        "LiveRunStartResponse",
        "LiveRunSnapshot",
        "BatchRunRequest",
        "BatchItemSummary",
        "BatchSummaryResponse",
        "BatchItemDetailResponse",
    } <= class_names


def test_api_run_http_schemas_bridge_is_removed() -> None:
    assert not RUN_HTTP_SCHEMAS_PATH.exists()


def test_run_result_mapper_depends_on_contract_owner_directly() -> None:
    module = _parse_module(RUN_RESULT_MAPPER_PATH)
    imported_modules = _imported_modules(module)

    assert "contracts.run_contracts" in imported_modules
    assert "api.run_http_schemas" not in imported_modules
