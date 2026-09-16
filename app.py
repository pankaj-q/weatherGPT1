"""WeatherGPT — Main app entry point.

Launch with:
    python3 -m streamlit run app.py

The landing screen immediately answers three questions:

    1. What is happening now?   → Zone ①  (Current weather)
    2. What might happen next?  → Zone ②  (Forecast + alerts)
    3. What should I do?        → Zone ③  (AI advisory)

Below the three zones sits a conversational chat input where users can ask
follow-up questions in English or Hindi.
"""

from __future__ import annotations

import os
import time
from datetime import datetime

import pandas as pd
import streamlit as st

# ── Environment & config ─────────────────────────────────────────────────────
from dotenv import load_dotenv

load_dotenv()

from config import (
    DATA_MAX_AGE_SECONDS,
    PRESET_CITIES,
    QUICK_PROMPTS,
    SIMULATED_SUBSCRIBERS,
    GROQ_BASE_URL,
)

from utils.alerts import Alert, BroadcastLog, check_thresholds, simulate_broadcast
from utils.grok_client import GroqClient, detect_language
from utils.prompts import CHAT_SYSTEM
from utils.ui import (
    inject_css,
    render_advisory_card,
    render_alert_banner,
    render_assistant_chat_bubble,
    render_broadcast_log_entry,
    render_day_cards_row,
    render_hero_current,
    render_section_title,
    render_skeleton,
    render_status_bar,
    render_user_chat_bubble,
)
from utils.weather_api import (
    CurrentWeather,
    Location,
    fetch_current_weather,
    fetch_daily_forecast,
    geocode_location,
    hourly_temperature_series,
    weather_context_for_prompt,
)

# ── Page config (must be first Streamlit call) ───────────────────────────────
st.set_page_config(
    page_title="WeatherGPT",
    page_icon="🌤️",
    layout="centered",
    initial_sidebar_state="expanded",
)

inject_css()

# ── Session state defaults ───────────────────────────────────────────────────
_DEFAULTS = {
    "wg_city": None,
    "wg_current": None,
    "wg_daily": None,
    "wg_alerts": None,
    "wg_advisory": None,
    "wg_advisory_lang": "English",
    "wg_chat_history": [],
    "wg_broadcasts": [],
    "wg_last_fetch_ts": 0.0,
    "wg_user_lang": "English",
    "wg_grok_client": None,
}
for key, val in _DEFAULTS.items():
    if key not in st.session_state:
        st.session_state[key] = val


# ── Grok client (singleton, lazy) ────────────────────────────────────────────
def _get_grok() -> GroqClient | None:
    """Return a cached GroqClient or None if the API key is missing."""
    if st.session_state.wg_grok_client is not None:
        return st.session_state.wg_grok_client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        st.session_state.wg_grok_client = GroqClient(api_key=api_key)
        return st.session_state.wg_grok_client
    except Exception:
        return None


# ── Data fetching (with time-based cache) ────────────────────────────────────
def _refresh_weather(city: Location) -> None:
    """Fetch current + forecast and update session state. Rate-limited."""
    now = time.time()
    if now - st.session_state.wg_last_fetch_ts < DATA_MAX_AGE_SECONDS:
        return
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            current = fetch_current_weather(city.lat, city.lon)
            daily = fetch_daily_forecast(city.lat, city.lon, 7)
            st.session_state.wg_current = current
            st.session_state.wg_daily = daily
            st.session_state.wg_alerts = check_thresholds(current, daily)
            st.session_state.wg_last_fetch_ts = now
            return
        except Exception as exc:
            last_err = exc
            time.sleep(1.0 * (attempt + 1))
    st.session_state.wg_last_fetch_ts = 0.0  # allow a retry on the next rerun
    st.error(
        f"⚠️ Couldn't reach Open-Meteo right now. {last_err or ''} "
        "Live weather will retry automatically on your next interaction."
    )


def _force_refresh(city: Location) -> None:
    """Bypass the cache and fetch fresh data."""
    st.session_state.wg_last_fetch_ts = 0.0
    _refresh_weather(city)


# ── Advisory generation ──────────────────────────────────────────────────────
def _refresh_advisory(city: Location) -> None:
    """Generate or refresh the AI advisory using the current live data."""
    grok = _get_grok()
    current = st.session_state.wg_current
    daily = st.session_state.wg_daily
    alerts = st.session_state.wg_alerts
    if not all([grok, current, daily]):
        return
    lang = st.session_state.wg_advisory_lang or "English"
    summary = weather_context_for_prompt(city, current, daily)
    if alerts:
        alert_lines = "\n".join(f"- [{a.severity.upper()}] {a.title}: {a.message}" for a in alerts)
        summary += f"\n\nActive alerts:\n{alert_lines}"
    try:
        st.session_state.wg_advisory = grok.generate_advisory(summary, city.label, lang)
    except Exception as exc:
        st.session_state.wg_advisory = f"⚠️ Could not generate advisory: {exc}"


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    # Logo & tagline
    st.markdown("# 🌤️ WeatherGPT")
    st.caption("Conversational weather AI for India")

    st.divider()

    # --- Location picker ---
    st.markdown("### 📍 Location")
    city_names = [c["name"] for c in PRESET_CITIES]
    selected_preset = st.selectbox(
        "Choose a city or select Other",
        options=city_names + ["Other"],
        key="wg_preset_picker",
    )
    custom = st.text_input(
        "🔍 Search any location",
        placeholder="e.g. Shimla, Dehradun...",
        key="wg_custom_city_input",
    )
    if custom.strip():
        st.session_state.wg_city = geocode_location(custom)
    elif selected_preset == "Other":
        st.info("Type a city name above.")
    else:
        st.session_state.wg_city = geocode_location(selected_preset)

    city: Location = st.session_state.wg_city
    st.caption(f"📍 {city.label} ({city.lat:.2f}°N {city.lon:.2f}°E)")

    # --- Language indicator ---
    last_msg = ""
    for m in reversed(st.session_state.wg_chat_history):
        if m.get("role") == "user":
            last_msg = m.get("content", "")
            break
    detected = detect_language(last_msg) if last_msg else "English"
    st.session_state.wg_user_lang = detected
    lang_emoji = "🇮🇳" if detected == "Hindi" else "🇬🇧"
    st.caption(f"{lang_emoji} Detected: {detected}")

    st.divider()

    # --- Emergency broadcast button ---
    st.markdown(
        '<div class="wg-btn-emergency">🚨 BROADCAST ALERT</div>',
        unsafe_allow_html=True,
    )
    if st.button("Send emergency broadcast", key="wg_broadcast_btn", type="primary"):
        alerts = st.session_state.wg_alerts or []
        top_alert = alerts[0] if alerts else None
        log_entry = simulate_broadcast(city.label, top_alert)
        st.session_state.wg_broadcasts.insert(0, log_entry.to_dict())
        st.toast(
            f"🚨 Broadcast sent to {log_entry.subscriber_count:,} subscribers "
            f"via {log_entry.channels_str}"
        )

    # --- Broadcast log ---
    broadcasts = st.session_state.wg_broadcasts
    if broadcasts:
        with st.expander(f"📜 Broadcast log ({len(broadcasts)})", expanded=False):
            for entry in broadcasts[:8]:
                st.markdown(render_broadcast_log_entry(entry), unsafe_allow_html=True)

    st.divider()

    # --- Active alerts ---
    alerts = st.session_state.wg_alerts or []
    if alerts:
        st.markdown("### ⚠️ Active alerts")
        for a in alerts:
            st.markdown(
                f"<span style='font-size:13px;'>{a.emoji} {a.title}</span>",
                unsafe_allow_html=True,
            )
    else:
        st.markdown("### ✅ No active alerts")

    # --- Refresh ---
    st.divider()
    if st.button("🔄 Refresh", width="stretch"):
        _force_refresh(city)
        st.rerun()


# ── Ensure data is loaded ────────────────────────────────────────────────────
_refresh_weather(city)

current: CurrentWeather | None = st.session_state.wg_current
daily = st.session_state.wg_daily or []
alerts_list: list[Alert] = st.session_state.wg_alerts or []

# ── Missing API key banner ───────────────────────────────────────────────────
grok = _get_grok()
if grok is None:
    st.warning(
        "**Groq API key not found.** Set `GROQ_API_KEY` in your `.env` file "
        "to enable the AI advisory and chat features.  Weather data will "
        "still load normally."
    )

# ── Missing data fallback ────────────────────────────────────────────────────
if current is None:
    st.info("Fetching weather data…")
    st.stop()

# ══════════════════════════════════════════════════════════════════════════════
# HEADER
# ══════════════════════════════════════════════════════════════════════════════
col_city, col_action = st.columns([4, 1])
with col_city:
    st.markdown(f"## 🌤️ WeatherGPT — **{city.name}**")
    st.caption(
        f"{city.label} · "
        f"Updated {current.time} · "
        f"Last refresh {datetime.fromtimestamp(st.session_state.wg_last_fetch_ts).strftime('%H:%M:%S')}"
    )
with col_action:
    if st.button("🔄", help="Refresh now"):
        _force_refresh(city)
        st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# STATUS BAR (summary strip tying all 3 zones together)
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(
    render_status_bar(current, alerts_list, city.label, current.time),
    unsafe_allow_html=True,
)

# ══════════════════════════════════════════════════════════════════════════════
# ZONE ① — WHAT'S HAPPENING NOW?
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(render_hero_current(current), unsafe_allow_html=True)
st.markdown("")  # spacer

# ══════════════════════════════════════════════════════════════════════════════
# ZONE ② — WHAT MIGHT HAPPEN NEXT?
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(render_section_title("What might happen next?"))

# Alert banners (stack above forecast cards)
if alerts_list:
    for alert in alerts_list:
        st.markdown(render_alert_banner(alert), unsafe_allow_html=True)

# 7-day forecast cards
st.markdown(
    render_day_cards_row(daily),
    unsafe_allow_html=True,
)

# Charts (2 columns)
if daily:
    col_temp, col_rain = st.columns(2)
    with col_temp:
        st.markdown(
            '<div class="wg-chart-box" style="padding:16px;">',
            unsafe_allow_html=True,
        )
        st.markdown(render_section_title("24h Temperature"), unsafe_allow_html=True)
        try:
            hourly = hourly_temperature_series(city.lat, city.lon, hours=24)
        except Exception:
            hourly = []
        if hourly:
            df_temp = pd.DataFrame(hourly, columns=["Hour", "Temp °C"])
            st.line_chart(df_temp.set_index("Hour"), width="stretch")
        else:
            st.markdown(
                '<div style="font-size:13px;color:var(--wg-muted);padding-bottom:8px;">'
                "⏳ Hourly data unavailable right now.</div>",
                unsafe_allow_html=True,
            )
        st.markdown("</div>", unsafe_allow_html=True)
    with col_rain:
        st.markdown(
            '<div class="wg-chart-box" style="padding:16px;">',
            unsafe_allow_html=True,
        )
        st.markdown(render_section_title("7-day precipitation"), unsafe_allow_html=True)
        df_rain = pd.DataFrame({
            "Day": [d.date[5:] for d in daily],
            "Rain mm": [d.precipitation_mm for d in daily],
        })
        st.bar_chart(df_rain.set_index("Day"), width="stretch", color="#0284C7")
        st.markdown("</div>", unsafe_allow_html=True)

st.markdown("")  # spacer

# ══════════════════════════════════════════════════════════════════════════════
# ZONE ③ — WHAT SHOULD I DO?
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(render_section_title("What should I do?"), unsafe_allow_html=True)

if grok is None:
    advisory_html = (
        '<div class="wg-card" style="border-left:4px solid #94A3B8;">'
        '<div style="font-size:14px;color:#64748B;">'
        "⚠️ Set <code>GROQ_API_KEY</code> in your <code>.env</code> file to enable the AI advisory."
        "</div></div>"
    )
    st.markdown(advisory_html, unsafe_allow_html=True)
else:
    # Show shimmer while loading
    if st.session_state.wg_advisory is None:
        st.markdown(render_skeleton(), unsafe_allow_html=True)
        _refresh_advisory(city)

    if st.session_state.wg_advisory:
        # Format the raw text into bullet HTML
        raw = st.session_state.wg_advisory
        bullets_html = raw.replace("\n", "<br>")
        st.markdown(
            render_advisory_card(
                "🤖 WeatherGPT AI Advisory",
                bullets_html,
                source=f"Generated for {city.label} · {st.session_state.wg_advisory_lang}",
            ),
            unsafe_allow_html=True,
        )

st.markdown("")  # spacer

# ══════════════════════════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════════════════════════
st.divider()
st.markdown("### 💬 Ask WeatherGPT")

# Render existing conversation
for msg in st.session_state.wg_chat_history:
    if msg["role"] == "user":
        st.markdown(render_user_chat_bubble(msg["content"]), unsafe_allow_html=True)
    elif msg["role"] == "assistant":
        st.markdown(render_assistant_chat_bubble(msg["content"]), unsafe_allow_html=True)

# Quick prompt chips (shown when conversation is empty)
if not st.session_state.wg_chat_history:
    chip_html = " ".join(f'<span class="wg-chip">{p}</span>' for p in QUICK_PROMPTS)
    st.markdown(chip_html, unsafe_allow_html=True)

# Chat input
user_input = st.chat_input("Ask about weather anywhere…")

if user_input:
    # Show user message
    st.markdown(render_user_chat_bubble(user_input), unsafe_allow_html=True)
    st.session_state.wg_chat_history.append({"role": "user", "content": user_input})

    if grok is None:
        assistant_msg = (
"⚠️ Groq API key not configured. Set `GROQ_API_KEY` in your `.env` file "
        "to enable conversational weather queries."
        )
    else:
        with st.spinner("Thinking…"):
            try:
                messages = [{"role": "system", "content": CHAT_SYSTEM}]
                messages.extend(st.session_state.wg_chat_history)
                weather_ctx = weather_context_for_prompt(
                    city, current, daily
                )
                assistant_msg = grok.chat(messages, weather_context=weather_ctx)
            except Exception as exc:
                assistant_msg = f"⚠️ Error: {exc}"

    st.session_state.wg_chat_history.append({"role": "assistant", "content": assistant_msg})
    st.markdown(render_assistant_chat_bubble(assistant_msg), unsafe_allow_html=True)
    st.rerun()