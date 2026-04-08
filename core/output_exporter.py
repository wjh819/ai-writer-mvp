from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SAFE_FILE_STEM_RE = re.compile(r"[^A-Za-z0-9_-]+")


class OutputExportError(Exception):
    """output 落盘失败。"""


def _build_timestamp_dir_name() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _sanitize_file_stem(node_id: str) -> str:
    normalized = str(node_id or "").strip()
    if not normalized:
        raise OutputExportError("Output node id is empty")

    sanitized = SAFE_FILE_STEM_RE.sub("_", normalized).strip("_")
    if not sanitized:
        raise OutputExportError(f"Output node id '{node_id}' cannot be used as file name")

    return sanitized


def _render_markdown(value: Any) -> str:
    if isinstance(value, str):
        return value

    rendered_json = json.dumps(
        value,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
        default=str,
    )
    return f"```json\n{rendered_json}\n```\n"


class WorkflowOutputExporter:
    """
    full run output 节点导出器。

    正式规则：
    - 首次真正写 output 时才懒创建 timestamp 目录
    - 同一次 run 的多个 output 节点写入同一个 timestamp 目录
    - 文件名固定为 <safe_node_id>.md
    """

    def __init__(self, canvas_outputs_root: str):
        self.canvas_outputs_root = Path(canvas_outputs_root)
        self._run_output_dir: Path | None = None

    def _ensure_run_output_dir(self) -> Path:
        if self._run_output_dir is None:
            run_dir = self.canvas_outputs_root / _build_timestamp_dir_name()
            run_dir.mkdir(parents=True, exist_ok=False)
            self._run_output_dir = run_dir
        return self._run_output_dir

    def export_output(self, *, node_id: str, value: Any) -> str:
        try:
            run_dir = self._ensure_run_output_dir()
            file_stem = _sanitize_file_stem(node_id)
            file_path = run_dir / f"{file_stem}.md"
            markdown_text = _render_markdown(value)
            file_path.write_text(markdown_text, encoding="utf-8")
            return str(file_path)
        except OutputExportError:
            raise
        except Exception as exc:
            raise OutputExportError(
                f"Failed to export output for node '{node_id}': {exc}"
            ) from exc