from pathlib import Path
import re

PROMPT_DIR = Path("prompt")
PROMPT_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _normalize_prompt_name(name: str) -> str:
    if not isinstance(name, str):
        raise ValueError("Prompt name must be a string")

    normalized = name.strip()
    if not normalized or not PROMPT_NAME_RE.match(normalized):
        raise ValueError("Prompt name is invalid")

    return normalized


def load_prompt(name):
    normalized_name = _normalize_prompt_name(name)
    path = PROMPT_DIR / f"{normalized_name}.txt"

    with open(path, encoding="utf-8") as f:
        return f.read()


def list_prompts():
    if not PROMPT_DIR.exists():
        return []

    prompts = [
        file.stem
        for file in PROMPT_DIR.glob("*.txt")
        if PROMPT_NAME_RE.match(file.stem)
    ]
    prompts.sort()
    return prompts