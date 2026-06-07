"""
gemini.py — thin async wrapper around the Gemini generateContent API.

All LLM calls go through call_gemini(). It handles:
  - API key injection
  - Request/response envelope
  - Timeout and HTTP error surfacing
  - Markdown code-fence stripping (Gemini sometimes wraps JSON in ```json ... ```)
"""

import json
import os
import re

import httpx
from fastapi import HTTPException

_BASE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
_TIMEOUT = 20.0

# Regex to strip ```json ... ``` or ``` ... ``` fences
_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def _strip_fences(text: str) -> str:
    """Remove markdown code fences that Gemini sometimes adds despite being told not to."""
    match = _FENCE_RE.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()


async def call_gemini(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the raw text response.

    Raises HTTPException on timeout (504), upstream error (502), or
    unexpected response structure (422).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        try:
            resp = await client.post(
                f"{_BASE_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail=f"Gemini API timed out after {_TIMEOUT}s.",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API returned HTTP {exc.response.status_code}.",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach Gemini API: {exc}",
            ) from exc

    try:
        data = resp.json()
        raw: str = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unexpected Gemini response structure: {exc}",
        ) from exc

    return _strip_fences(raw)


async def call_gemini_json(prompt: str) -> object:
    """
    Call Gemini and parse the response as JSON.

    Returns the parsed Python object (list or dict).
    Raises HTTPException 422 if the response is not valid JSON.
    """
    raw = await call_gemini(prompt)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        snippet = raw[:300]
        raise HTTPException(
            status_code=422,
            detail=f"LLM response is not valid JSON: {exc}. Raw (truncated): {snippet!r}",
        ) from exc
