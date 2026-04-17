from __future__ import annotations

import ast
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
ENGINE_PACKAGE_DIR = PROJECT_ROOT / "backend_workflow_engine"
CANONICAL_PACKAGE_DIR = PROJECT_ROOT / "backend_workflow_canonical"

ENGINE_MODULE_PATHS = [
    ENGINE_PACKAGE_DIR / "engine.py",
    ENGINE_PACKAGE_DIR / "engine_errors.py",
    ENGINE_PACKAGE_DIR / "engine_execution_loop.py",
    ENGINE_PACKAGE_DIR / "engine_graph.py",
    ENGINE_PACKAGE_DIR / "engine_node_runners.py",
    ENGINE_PACKAGE_DIR / "engine_prompt_window.py",
    ENGINE_PACKAGE_DIR / "engine_runtime.py",
    ENGINE_PACKAGE_DIR / "engine_step_builders.py",
    ENGINE_PACKAGE_DIR / "execution_types.py",
]

CANONICAL_MODULE_PATHS = [
    CANONICAL_PACKAGE_DIR / "workflow_validation_dependency.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_execution_graph.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_structure.py",
    CANONICAL_PACKAGE_DIR / "workflow_validation_subgraph.py",
    CANONICAL_PACKAGE_DIR / "workflow_validator.py",
]

REMOVED_CORE_ENGINE_BRIDGES = [
    PROJECT_ROOT / "core" / "engine.py",
    PROJECT_ROOT / "core" / "engine_errors.py",
    PROJECT_ROOT / "core" / "engine_execution_loop.py",
    PROJECT_ROOT / "core" / "engine_graph.py",
    PROJECT_ROOT / "core" / "engine_node_runners.py",
    PROJECT_ROOT / "core" / "engine_prompt_window.py",
    PROJECT_ROOT / "core" / "engine_runtime.py",
    PROJECT_ROOT / "core" / "engine_step_builders.py",
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


def test_engine_package_has_no_api_fastapi_or_storage_dependencies() -> None:
    for path in ENGINE_MODULE_PATHS:
        module = _parse_module(path)
        imported_modules = _imported_modules(module)

        assert not any(name.startswith("api") for name in imported_modules), path
        assert not any(name.startswith("fastapi") for name in imported_modules), path
        assert not any(name.startswith("storage") for name in imported_modules), path


def test_engine_and_canonical_layers_do_not_cross_import() -> None:
    for path in ENGINE_MODULE_PATHS:
        module = _parse_module(path)
        imported_modules = _imported_modules(module)
        assert not any(
            name.startswith("backend_workflow_canonical") for name in imported_modules
        ), path

    for path in CANONICAL_MODULE_PATHS:
        module = _parse_module(path)
        imported_modules = _imported_modules(module)
        assert not any(
            name.startswith("backend_workflow_engine") for name in imported_modules
        ), path
        assert not any(name.startswith("core.engine") for name in imported_modules), path


def test_core_engine_bridge_modules_are_removed() -> None:
    for path in REMOVED_CORE_ENGINE_BRIDGES:
        assert not path.exists(), path
