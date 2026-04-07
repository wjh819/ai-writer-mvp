from __future__ import annotations

from fastapi import APIRouter

from utils.prompt_loader import list_prompts

router = APIRouter()


@router.get("/prompts")
def get_prompts():
    return list_prompts()
