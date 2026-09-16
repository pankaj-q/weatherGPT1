"""Groq LLM client (OpenAI-compatible API).

Encapsulates all Groq communication so the rest of the app never touches
the OpenAI SDK directly.  Supports function calling (`get_weather` tool)
for live weather data, plus a separate advisory generation call.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import APIStatusError, AuthenticationError, OpenAI

from config import MODEL, GROQ_BASE_URL, GROQ_TIMEOUT_SECONDS

from utils.prompts import ADVISORY_SYSTEM, CHAT_SYSTEM, TOOL_RESULT_PREFIX, TOOL_RESULT_SUFFIX, WEATHER_TOOL

# ---------------------------------------------------------------------------
# Language detection (reliably fast, no model call)
# ---------------------------------------------------------------------------
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
_SCRIPT_DIRECTIONS = [
    ("Hindi", _DEVANAGARI_RE),
]


def detect_language(text: str) -> str:
    """Return the detected language label for a user message.

    Uses simple Unicode range scanning — fast and dependency-free.  Falls back
    to English when no non-Latin script is detected.
    """
    for label, pattern in _SCRIPT_DIRECTIONS:
        if pattern.search(text):
            return label
    return "English"


# ---------------------------------------------------------------------------
# GroqClient
# ---------------------------------------------------------------------------
class GroqClient:
    """Thin wrapper around the Groq chat completions endpoint (OpenAI-compatible)."""

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError(
                "Groq API key not found. Set the GROQ_API_KEY environment variable "
                "or pass it directly when creating a GroqClient."
            )
        self._client = OpenAI(api_key=key, base_url=GROQ_BASE_URL, timeout=GROQ_TIMEOUT_SECONDS)

    # -- internal helpers ---------------------------------------------------

    @staticmethod
    def _extract_text(message: Any) -> str:
        """Pull plain-text content from a chat completion message object."""
        content = getattr(message, "content", None) or ""
        if isinstance(content, str):
            return content
        # Some models return a list of content parts.
        if isinstance(content, list):
            parts = [p.get("text", "") if isinstance(p, dict) else str(p) for p in content]
            return "".join(parts)
        return str(content)

    @staticmethod
    def _handle_api_error(exc: Exception, context: str) -> str:
        """Convert API errors into user-friendly messages."""
        if isinstance(exc, AuthenticationError):
            return (
                f"⚠️ {context}: Invalid API key. Please check your GROQ_API_KEY in .env "
                "(get one at https://console.groq.com)."
            )
        if isinstance(exc, APIStatusError):
            # Groq returns 401/403 for auth issues; 400 for bad requests
            err_body = getattr(exc, "body", {}) or {}
            if isinstance(err_body, dict):
                err_msg = str(err_body.get("error", {}).get("message", "")).lower()
            else:
                err_msg = str(err_body).lower()
            auth_keywords = ("invalid", "incorrect", "unauthorized", "authentication", "forbidden", "access denied")
            if exc.status_code in (401, 403) or any(kw in err_msg for kw in auth_keywords):
                return (
                    f"⚠️ {context}: Invalid or unauthorized API key. Please check your GROQ_API_KEY in .env "
                    "(get one at https://console.groq.com)."
                )
            if exc.status_code == 429:
                return f"⚠️ {context}: Rate limited. Please wait a moment and try again."
            return f"⚠️ {context}: API error ({exc.status_code})."
        return f"⚠️ {context}: {exc}"

    def _execute_weather(self, location: str, days: int = 7) -> str:
        """Call Open-Meteo via our weather_api and return a compact summary."""
        # Lazy import to avoid circular deps at module load time.
        from utils.alerts import check_thresholds
        from utils.weather_api import (
            weather_context_for_prompt,
            fetch_current_weather,
            fetch_daily_forecast,
            geocode_location,
        )

        try:
            loc = geocode_location(location)
            current = fetch_current_weather(loc.lat, loc.lon)
            daily = fetch_daily_forecast(loc.lat, loc.lon, days)
            alerts = check_thresholds(current, daily)
            summary = weather_context_for_prompt(loc, current, daily)

            if alerts:
                alert_lines = "\n".join(
                    f"- [{a.severity.upper()}] {a.title}: {a.message}" for a in alerts
                )
                summary += f"\n\nActive alerts:\n{alert_lines}"

            return TOOL_RESULT_PREFIX + summary + TOOL_RESULT_SUFFIX
        except Exception as exc:
            return TOOL_RESULT_PREFIX + f"Error fetching weather: {exc}" + TOOL_RESULT_SUFFIX

    # -- public API ---------------------------------------------------------

    def chat(self, messages: list[dict], weather_context: str | None = None) -> str:
        """Send a chat turn, handling function calls if the model requests one.

        Parameters
        ----------
        messages : list[dict]
            Conversation history including system messages.
        weather_context : str | None
            Optional pre-fetched weather summary to inject as context so the
            model may skip a tool call when data is already available.
        """
        full_messages = list(messages)
        if weather_context and not any(m["role"] == "tool" for m in full_messages):
            full_messages.append({
                "role": "user",
                "content": f"[Live weather context]\n{weather_context}",
            })

        # First call — may or may not include a tool call.
        try:
            response = self._client.chat.completions.create(
                model=MODEL,
                messages=full_messages,
                tools=[WEATHER_TOOL],
                tool_choice="auto",
            )
        except Exception as exc:
            return self._handle_api_error(exc, "Chat completion failed")

        choice = response.choices[0]

        # If no tool call requested, return directly.
        if not choice.message.tool_calls:
            return self._extract_text(choice.message) or "I couldn't generate a response."

        # Execute each requested tool and continue the conversation.
        full_messages.append(choice.message.model_dump(exclude_none=True))
        for tool_call in choice.message.tool_calls:
            args = json.loads(tool_call.function.arguments)
            tool_name = tool_call.function.name
            if tool_name == "get_weather":
                result = self._execute_weather(
                    args.get("location", "Varanasi"),
                    args.get("days", 7),
                )
            else:
                result = TOOL_RESULT_PREFIX + f"Unknown tool '{tool_name}'." + TOOL_RESULT_SUFFIX
            full_messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        # Second call with tool results injected.
        try:
            final_response = self._client.chat.completions.create(
                model=MODEL,
                messages=full_messages,
                tools=[WEATHER_TOOL],
                tool_choice="auto",
            )
        except Exception as exc:
            return self._handle_api_error(exc, "Chat completion failed (after tool)")

        return self._extract_text(final_response.choices[0].message) or "I couldn't generate a response."

    def generate_advisory(
        self,
        weather_summary: str,
        city: str,
        language: str = "English",
    ) -> str:
        """Generate the "What should I do?" advisory from live data."""
        prompt = ADVISORY_SYSTEM.replace("{city}", city).replace("{language}", language)
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Live weather data:\n{weather_summary}"},
        ]
        try:
            response = self._client.chat.completions.create(model=MODEL, messages=messages)
        except Exception as exc:
            return self._handle_api_error(exc, "Advisory generation failed")
        return self._extract_text(response.choices[0].message)