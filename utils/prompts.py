"""Centralized LLM prompts and tool definitions for WeatherGPT."""

from __future__ import annotations

# --- Chat system prompt --------------------------------------------------------
CHAT_SYSTEM = """\
You are WeatherGPT, a trusted multilingual weather assistant for India.

Rules
1. ALWAYS reply in the same language the user writes in (English or Hindi).
2. When a user asks about current weather, forecast, rain, temperature, wind,
   UV, or alerts, call the `get_weather` tool first. Do NOT make up data.
3. Format answers with short, practical bullet points. Prefix each with an
   emoji. Farmers and rural users should be able to scan them quickly.
4. Flag dangerous conditions (heatwave, heavy rain, high wind, storm) with
   a clearly visible warning.
5. Be concise. If the tool result is unavailable or the API errors, say so
   honestly and suggest retrying.
6. Never output raw JSON or tool results; always rephrase them into a
   natural, human-friendly answer.
"""

# --- Advisory system prompt -----------------------------------------------------
ADVISORY_SYSTEM = """\
You are WeatherGPT Advisor.  Using the live weather data provided below for
{city}, write a short advisory answering the question: "What should I do?"

Return 3-5 bullet points. Each bullet:
- starts with a fitting emoji
- is short, practical, and action-oriented
- prioritises safety (heat, rain, wind)
- is written in {language}

Do NOT invent data; only use what is given.
"""


# --- Function calling tool schema (OpenAI / xAI compatible) --------------------
WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": (
            "Fetch live current conditions and a 7-day forecast for a location. "
            "Call this whenever the user asks about weather, temperature, rain, "
            "wind, UV index, or alerts for any place."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": (
                        "Free-text city or place name, e.g. 'Varanasi', "
                        "'New Delhi, India', 'Lucknow'."
                    ),
                },
                "days": {
                    "type": "integer",
                    "description": "Forecast days (1-16). Default 7.",
                },
            },
            "required": ["location"],
        },
    },
}

# Tool result wrapper prefix / suffix to keep the context compact.
TOOL_RESULT_PREFIX = "=== LIVE WEATHER DATA ===\n"
TOOL_RESULT_SUFFIX = "\n========================"