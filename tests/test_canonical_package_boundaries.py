from __future__ import annotations

import ast
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
CANONICAL_PACKAGE_DIR = PROJECT_ROOT / "backend_workflow_canonical"

CANONICAL_MODULE_PATHS = [
    CANONICAL_PACKAGE_DIR / "workflow_validation_dependency.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_execution_graph.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_structure.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_subgraph.py",
    CANONICAL_PACKAGE_DIR / "workflow_validator.py",
]

REMOVED_API_BRIDGES = [
    PROJECT_ROOT / "api" / "workflow_validation_dependency.py",
    PROJECT_ROOT / "api" / "workflow_validation_execution_graph.py",
    PROJECT_ROOT / "api" / "workflow_validation_structure.py",
    PROJECT_ROOT / "api" / "workflow_validation_subgraph.py",
    PROJECT_ROOT / "api" / "workflow_validator.py",
]


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


def test_canonical_package_has_no_api_fastapi_or_storage_dependencies() -> None:
    for path in CANONICAL_MODULE_PATHS:
        module = _parse_module(path)
        imported_modules = _imported_modules(module)

        assert not any(name.startswith("api") for name in imported_modules), path
        assert not any(name.startswith("fastapi") for name in imported_modules), path
        assert not any(name.startswith("storage") for name in imported_modules), path


def test_api_validation_bridge_modules_are_removed() -> None:
    for path in REMOVED_API_BRIDGES:
        assert not path.exists(), path
