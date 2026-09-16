"""WeatherGPT — Dedicated Chat Interface (Page 2).

A full-screen conversational view for querying weather data.  Conversation
history is shared with the main page via st.session_state.
"""

from __future__ import annotations

import os

import streamlit as st

from config import QUICK_PROMPTS

from utils.grok_client import GroqClient, detect_language
from utils.prompts import CHAT_SYSTEM
from utils.ui import (
    inject_css,
    render_assistant_chat_bubble,
    render_user_chat_bubble,
)
from utils.weather_api import Location, weather_context_for_prompt

inject_css()

# Shared session state
if "wg_city" not in st.session_state:
    st.session_state.wg_city = Location("Varanasi", 25.3176, 82.9739, country="India")
if "wg_chat_history" not in st.session_state:
    st.session_state.wg_chat_history = []

city: Location = st.session_state.wg_city
current = st.session_state.get("wg_current")
daily = st.session_state.get("wg_daily") or []

# Header
col_title, col_clear = st.columns([5, 1])
with col_title:
    st.markdown("## 💬 WeatherGPT Chat")
    st.caption(f"Conversational weather intelligence for {city.label}")
with col_clear:
    if st.button("Clear", key="clear_chat"):
        st.session_state.wg_chat_history = []
        st.rerun()

# Language detection chip
last_msg = ""
for m in reversed(st.session_state.wg_chat_history):
    if m.get("role") == "user":
        last_msg = m.get("content", "")
        break
lang = detect_language(last_msg) if last_msg else "English"
lang_emoji = "India" if lang == "Hindi" else "UK"
st.caption(f"{lang_emoji} Responding in: **{lang}**")

st.divider()

# Conversation history
for msg in st.session_state.wg_chat_history:
    if msg["role"] == "user":
        st.markdown(render_user_chat_bubble(msg["content"]), unsafe_allow_html=True)
    elif msg["role"] == "assistant":
        st.markdown(
            render_assistant_chat_bubble(msg["content"]), unsafe_allow_html=True
        )

# Quick prompt chips (shown when empty)
if not st.session_state.wg_chat_history:
    st.markdown(
        '<div style="padding:16px 0;">'
        '<div style="font-size:12px;color:#64748B;text-transform:uppercase;'
        "letter-spacing:.06em;font-weight:600;margin-bottom:8px;\">"
        "Try asking"
        "</div>"
        + " ".join(f'<span class="wg-chip">{p}</span>' for p in QUICK_PROMPTS)
        + "</div>",
        unsafe_allow_html=True,
    )

# Chat input
user_input = st.chat_input("Ask about weather for any location...")

if user_input:
    st.markdown(render_user_chat_bubble(user_input), unsafe_allow_html=True)
    st.session_state.wg_chat_history.append({"role": "user", "content": user_input})

    # Update language detection
    lang = detect_language(user_input)
    lang_emoji = "India" if lang == "Hindi" else "UK"

    # --- Get Groq client ---
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        assistant_msg = (
            "Groq API key not configured. Set `GROQ_API_KEY` in your `.env` file "
            "to enable conversational weather queries."
        )
    else:
        try:
            grok = GroqClient(api_key=api_key)
        except Exception as exc:
            assistant_msg = f"Failed to initialise Groq: {exc}"
            grok = None

        if grok is not None:
            with st.spinner("Thinking..." if lang == "English" else "..."):
                try:
                    messages = [{"role": "system", "content": CHAT_SYSTEM}]
                    messages.extend(st.session_state.wg_chat_history)

                    weather_ctx = ""
                    if current and daily:
                        weather_ctx = weather_context_for_prompt(city, current, daily)

                    assistant_msg = grok.chat(messages, weather_context=weather_ctx)
                except Exception as exc:
                    assistant_msg = f"Error: {exc}"

    st.session_state.wg_chat_history.append({"role": "assistant", "content": assistant_msg})
    st.markdown(render_assistant_chat_bubble(assistant_msg), unsafe_allow_html=True)
    st.rerun()

# Footer
st.markdown("")
st.markdown(
    '<div style="text-align:center;font-size:12px;color:#94A3B8;padding:24px 0;">'
    "WeatherGPT · Powered by Groq + Open-Meteo · "
    "For demo purposes only"
    "</div>",
    unsafe_allow_html=True,
)