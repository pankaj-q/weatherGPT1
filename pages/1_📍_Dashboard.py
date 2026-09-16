"""WeatherGPT — Weather Dashboard (Page 1).

A data-rich view of the current location's weather: full hero metrics,
7-day forecast cards, hourly charts, alert history, and the emergency
broadcast log.
"""

from __future__ import annotations

import os
import time
from datetime import datetime

import pandas as pd
import streamlit as st

from config import DATA_MAX_AGE_SECONDS, PRESET_CITIES

from utils.alerts import Alert, check_thresholds
from utils.ui import (
    inject_css,
    render_alert_banner,
    render_broadcast_log_entry,
    render_day_cards_row,
    render_hero_current,
    render_section_title,
    render_status_bar,
)
from utils.weather_api import (
    Location,
    fetch_current_weather,
    fetch_daily_forecast,
    geocode_location,
    hourly_temperature_series,
    weather_context_for_prompt,
)

inject_css()

# ── Session state (shared with app.py) ───────────────────────────────────────
if "wg_city" not in st.session_state:
    st.session_state.wg_city = Location("Varanasi", 25.3176, 82.9739, country="India")
if "wg_current" not in st.session_state:
    st.session_state.wg_current = None
if "wg_daily" not in st.session_state:
    st.session_state.wg_daily = None
if "wg_alerts" not in st.session_state:
    st.session_state.wg_alerts = None
if "wg_last_fetch_ts" not in st.session_state:
    st.session_state.wg_last_fetch_ts = 0.0

city: Location = st.session_state.wg_city

# ── Fetch if stale ───────────────────────────────────────────────────────────
now = time.time()
if now - st.session_state.wg_last_fetch_ts > DATA_MAX_AGE_SECONDS:
    try:
        st.session_state.wg_current = fetch_current_weather(city.lat, city.lon)
        st.session_state.wg_daily = fetch_daily_forecast(city.lat, city.lon, 7)
        st.session_state.wg_alerts = check_thresholds(
            st.session_state.wg_current, st.session_state.wg_daily
        )
        st.session_state.wg_last_fetch_ts = now
    except Exception as exc:
        st.error(f"Failed to fetch weather data: {exc}")
        st.stop()

current = st.session_state.wg_current
daily = st.session_state.wg_daily or []
alerts_list: list[Alert] = st.session_state.wg_alerts or []

if current is None:
    st.info("No weather data available yet. Visit the main page first.")
    st.stop()

# ── Header ───────────────────────────────────────────────────────────────────
col_title, col_refresh = st.columns([5, 1])
with col_title:
    st.markdown(f"## 📍 Weather Dashboard — {city.name}")
    st.caption(f"{city.label} · Updated {current.time}")
with col_refresh:
    if st.button("🔄 Refresh", key="dash_refresh"):
        st.session_state.wg_last_fetch_ts = 0.0
        st.rerun()

# ── Status bar ───────────────────────────────────────────────────────────────
st.markdown(
    render_status_bar(current, alerts_list, city.label, current.time),
    unsafe_allow_html=True,
)

# ── Alert banners ────────────────────────────────────────────────────────────
if alerts_list:
    st.markdown(render_section_title("Active alerts"), unsafe_allow_html=True)
    for alert in alerts_list:
        st.markdown(render_alert_banner(alert), unsafe_allow_html=True)

# ── Hero current weather ─────────────────────────────────────────────────────
st.markdown(render_hero_current(current), unsafe_allow_html=True)
st.markdown("")

# ── 7-day forecast cards ─────────────────────────────────────────────────────
if daily:
    st.markdown(render_section_title("7-day forecast"), unsafe_allow_html=True)
    st.markdown(render_day_cards_row(daily), unsafe_allow_html=True)

    # Expanded table view
    with st.expander("📊 Detailed 7-day table", expanded=False):
        df = pd.DataFrame([
            {
                "Date": d.date,
                "Condition": d.condition_text,
                "High °C": d.temp_max_c,
                "Low °C": d.temp_min_c,
                "Rain %": d.precipitation_probability_pct,
                "Rain mm": d.precipitation_mm,
                "Wind km/h": d.wind_speed_kmh,
            }
            for d in daily
        ])
        st.dataframe(df, width="stretch", hide_index=True)

# ── Charts ───────────────────────────────────────────────────────────────────
if daily:
    col_temp, col_rain = st.columns(2)

    with col_temp:
        st.markdown(
            '<div class="wg-chart-box">',
            unsafe_allow_html=True,
        )
        st.markdown(render_section_title("24h Temperature"), unsafe_allow_html=True)
        hourly = hourly_temperature_series(city.lat, city.lon, hours=24)
        if hourly:
            df_temp = pd.DataFrame(hourly, columns=["Hour", "Temp °C"])
            st.line_chart(df_temp.set_index("Hour"), width="stretch")
        st.markdown("</div>", unsafe_allow_html=True)

    with col_rain:
        st.markdown(
            '<div class="wg-chart-box">',
            unsafe_allow_html=True,
        )
        st.markdown(render_section_title("7-day precipitation"), unsafe_allow_html=True)
        df_rain = pd.DataFrame({
            "Day": [d.date[5:] for d in daily],
            "Rain mm": [d.precipitation_mm for d in daily],
        })
        st.bar_chart(df_rain.set_index("Day"), width="stretch", color="#0284C7")
        st.markdown("</div>", unsafe_allow_html=True)

# ── Broadcast history table ──────────────────────────────────────────────────
broadcasts = st.session_state.get("wg_broadcasts", [])
if broadcasts:
    st.markdown(render_section_title("Emergency broadcast history"), unsafe_allow_html=True)
    df_bc = pd.DataFrame([
        {
            "Time": b["timestamp"],
            "Alert": b["alert_title"],
            "Location": b["location"],
            "Channels": ", ".join(b["channels"]),
            "Subscribers": b["subscriber_count"],
        }
        for b in broadcasts
    ])
    st.dataframe(df_bc, width="stretch", hide_index=True)
else:
    st.caption("No broadcasts sent yet.")