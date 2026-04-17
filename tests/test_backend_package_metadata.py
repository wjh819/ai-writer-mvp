from __future__ import annotations

import pathlib
import re
import sys
import tomllib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]

PACKAGE_PYPROJECTS = {
    "run_contracts": PROJECT_ROOT / "contracts" / "pyproject.toml",
    "canonical": PROJECT_ROOT / "backend_workflow_canonical" / "pyproject.toml",
    "engine": PROJECT_ROOT / "backend_workflow_engine" / "pyproject.toml",
}

VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9\.-]+)?$")


def _read_project(path: pathlib.Path) -> dict:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    project = data.get("project")
    if not isinstance(project, dict):
        raise AssertionError(f"missing [project] section: {path}")
    return project


def test_backend_package_pyprojects_exist() -> None:
    for path in PACKAGE_PYPROJECTS.values():
        assert path.exists(), path
    assert (PROJECT_ROOT / "backend_workflow_canonical" / "app_errors.py").exists()


def test_backend_package_project_name_is_unique() -> None:
    names: set[str] = set()

    for path in PACKAGE_PYPROJECTS.values():
        project = _read_project(path)
        name = project.get("name")
        assert isinstance(name, str) and name.strip(), path
        assert name not in names, f"duplicate package name: {name}"
        names.add(name)


def test_backend_package_versions_are_explicit_and_semver_like() -> None:
    for path in PACKAGE_PYPROJECTS.values():
        project = _read_project(path)
        version = project.get("version")
        assert isinstance(version, str) and version.strip(), path
        assert VERSION_PATTERN.match(version), (
            f"package version should be semver-like in {path}: {version!r}"
        )


def test_backend_package_dependency_directions_are_explicit() -> None:
    projects = {key: _read_project(path) for key, path in PACKAGE_PYPROJECTS.items()}

    run_contracts_deps = set(projects["run_contracts"].get("dependencies") or [])
    canonical_deps = set(projects["canonical"].get("dependencies") or [])
    engine_deps = set(projects["engine"].get("dependencies") or [])

    assert all(
        not dep.startswith("aiwriter-workflow-") for dep in run_contracts_deps
    ), "run-contracts must not depend on canonical or engine packages"
    assert any(
        dep.startswith("aiwriter-run-contracts") for dep in canonical_deps
    ), "canonical package must explicitly depend on run-contracts package"
    assert any(
        dep.startswith("aiwriter-run-contracts") for dep in engine_deps
    ), "engine package must explicitly depend on run-contracts package"
