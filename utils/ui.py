"""Shared CSS tokens and HTML render helpers for WeatherGPT.

All styling is injected once via st.markdown at app start.  Render functions
return raw HTML strings so the Streamlit page files stay clean and declarative.
Theme-aware via CSS custom properties + prefers-color-scheme media query.
"""

from __future__ import annotations

import math
from typing import Optional

from utils.alerts import Alert
from utils.weather_api import CurrentWeather, ForecastDay

# ---------------------------------------------------------------------------
# Design tokens (single source of truth)
# ---------------------------------------------------------------------------
CONDITION_EMOJI: dict[int, str] = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    56: "🌧️", 57: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    66: "🌧️", 67: "🌧️",
    71: "🌨️", 73: "❄️", 75: "❄️", 77: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    85: "🌨️", 86: "🌨️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
}


def _weather_emoji(code: int) -> str:
    return CONDITION_EMOJI.get(code, "🌡️")


def _day_label(date_str: str) -> str:
    """Convert 'YYYY-MM-DD' to short weekday + month-day, e.g. 'Tue 16/09'."""
    from datetime import datetime
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%a %d/%m")
    except ValueError:
        return date_str[5:]


# ---------------------------------------------------------------------------
# Global CSS injected once at app start — theme-aware via CSS variables
# ---------------------------------------------------------------------------
CSS = """
<style>
/* ── CSS Custom Properties ────────────────────────────────────────────
   Streamlit's theme menu (Settings → Theme) is independent of the OS
   color-scheme, but Streamlit sets `color-scheme: light|dark` on
   .stApp — a property that INHERITS.  So light-dark() resolves against
   the real Streamlit theme for every element inside .stApp, and
   updates live when the user toggles the theme.  No JS required. */
:root {
  --wg-blue:       #0284C7;
  --wg-sky:        light-dark(#E0F2FE, #075985);
  --wg-bg:         light-dark(#F8FAFC, #0F172A);
  --wg-card:       light-dark(#FFFFFF, #1E293B);
  --wg-ink:        light-dark(#0F172A, #F1F5F9);
  --wg-muted:      light-dark(#64748B, #94A3B8);
  --wg-amber:      light-dark(#B45309, #FBBF24);
  --wg-red:        light-dark(#DC2626, #F87171);
  --wg-green:      light-dark(#059669, #34D399);
  --wg-border:     light-dark(#E2E8F0, #334155);
  --wg-amber-bg:   light-dark(#FFF7DF, #78350F);
  --wg-red-bg:     light-dark(#FEE2E2, #7F1D1D);
  --wg-green-bg:   light-dark(#ECFDF5, #052E16);
  --wg-sidebar-bg: light-dark(#FFFFFF, #0F172A);
  --wg-sidebar-text: light-dark(#334155, #CBD5E1);
  --wg-sidebar-strong: light-dark(#0F172A, #FFFFFF);
  --wg-input-bg:   light-dark(#F8FAFC, #1E293B);
  --wg-input-border: light-dark(#CBD5E1, #475569);
}

/* Fallback for browsers without light-dark() — static light palette. */
@supports not (color: light-dark(#000, #fff)) {
  :root {
    --wg-sky:        #E0F2FE;
    --wg-bg:         #F8FAFC;
    --wg-card:       #FFFFFF;
    --wg-ink:        #0F172A;
    --wg-muted:      #64748B;
    --wg-amber:      #B45309;
    --wg-red:        #DC2626;
    --wg-green:      #059669;
    --wg-border:     #E2E8F0;
    --wg-amber-bg:   #FFF7DF;
    --wg-red-bg:     #FEE2E2;
    --wg-green-bg:   #ECFDF5;
    --wg-sidebar-bg: #FFFFFF;
    --wg-sidebar-text: #334155;
    --wg-sidebar-strong: #0F172A;
    --wg-input-bg:   #F8FAFC;
    --wg-input-border: #CBD5E1;
  }
}

/* ── Reset & base ───────────────────────────────────────────────────── */
.stApp {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--wg-ink);
  letter-spacing: -0.01em;
}
header[data-testid="stHeader"] { background: var(--wg-bg); }

/* ── Sidebar ────────────────────────────────────────────────────────────
   Streamlit pins its own `color-scheme` onto the sidebar element, which
   is independent of the app theme, so light-dark() would resolve against
   the wrong palette there.  Forcing the sidebar to INHERIT the app's
   color-scheme makes light-dark() track the real theme (and the Settings
   toggle) just like the main content.  No JS / rerun required. */
section[data-testid="stSidebar"] { color-scheme: inherit !important; }
section[data-testid="stSidebar"] {
  background: var(--wg-sidebar-bg) !important;
  border-right: 1px solid var(--wg-border);
}
section[data-testid="stSidebar"] * { color: var(--wg-sidebar-text) !important; }
section[data-testid="stSidebar"] .stMarkdown h2,
section[data-testid="stSidebar"] .stMarkdown h3 { color: var(--wg-sidebar-strong) !important; }
section[data-testid="stSidebar"] input[type="text"],
section[data-testid="stSidebar"] select {
  background: var(--wg-input-bg) !important;
  color: var(--wg-sidebar-text) !important;
  border: 1px solid var(--wg-input-border) !important;
  border-radius: 8px;
}

/* ── Cards ──────────────────────────────────────────────────────────── */
.wg-card {
  background: var(--wg-card);
  border: 1px solid var(--wg-border);
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 1px 3px rgba(15,23,42,.08), 0 6px 24px rgba(15,23,42,.06);
  transition: transform .15s ease, box-shadow .15s ease;
}
.wg-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15,23,42,.12), 0 8px 32px rgba(15,23,42,.08);
}
.wg-section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wg-muted);
  margin-bottom: 12px;
}

/* ── Hero current temperature ───────────────────────────────────────── */
.wg-hero-temp {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  color: var(--wg-ink);
}
.wg-hero-condition {
  font-size: 22px;
  font-weight: 600;
  color: var(--wg-ink);
}
.wg-hero-sub {
  font-size: 14px;
  color: var(--wg-muted);
}

/* ── Mini metrics row ───────────────────────────────────────────────── */
.wg-metric-box {
  display: inline-flex;
  flex-direction: column;
  min-width: 110px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--wg-bg);
  border: 1px solid var(--wg-border);
}
.wg-metric-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--wg-muted);
}
.wg-metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--wg-ink);
}

/* ── Day forecast card ──────────────────────────────────────────────── */
.wg-day-card {
  background: var(--wg-card);
  border: 1px solid var(--wg-border);
  border-radius: 14px;
  padding: 14px 8px;
  text-align: center;
  transition: transform .15s ease, box-shadow .15s ease;
  box-shadow: 0 1px 2px rgba(15,23,42,.05);
  min-width: 86px;
}
.wg-day-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(15,23,42,.12);
}
.wg-day-label { font-size: 11px; color: var(--wg-muted); font-weight: 600; margin-bottom: 6px; }
.wg-day-emoji { font-size: 26px; margin: 4px 0; }
.wg-day-high  { font-size: 16px; font-weight: 700; color: var(--wg-ink); }
.wg-day-low   { font-size: 12px; color: var(--wg-muted); }
.wg-day-rain  { font-size: 11px; color: var(--wg-blue); margin-top: 4px; }

/* ── Alert banners ──────────────────────────────────────────────────── */
.wg-alert {
  border-radius: 12px;
  padding: 14px 18px;
  border-left: 4px solid;
  font-size: 14px;
  font-weight: 500;
  animation: slideDown .3s ease;
}
.wg-alert-warning { background: var(--wg-red-bg); border-color: var(--wg-red); color: var(--wg-ink); }
.wg-alert-warning strong { color: var(--wg-red); }
.wg-alert-watch   { background: var(--wg-amber-bg); border-color: var(--wg-amber); color: var(--wg-ink); }
.wg-alert-watch strong { color: var(--wg-amber); }

/* ── Emergency broadcast button ─────────────────────────────────────── */
.wg-btn-emergency {
  display: block;
  width: 100%;
  padding: 12px 0;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #F43F5E, #DC2626);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: transform .15s ease, box-shadow .15s ease;
  box-shadow: 0 2px 8px rgba(220,38,38,.3);
}
.wg-btn-emergency:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(220,38,38,.45);
}

/* ── Chat bubbles ───────────────────────────────────────────────────── */
.wg-chat-user {
  background: var(--wg-sky);
  border-radius: 14px 14px 4px 14px;
  padding: 12px 16px;
  margin: 8px 0 4px auto;
  max-width: 82%;
  font-size: 14px;
  color: var(--wg-ink);
}
.wg-chat-assistant {
  background: var(--wg-card);
  border: 1px solid var(--wg-border);
  border-radius: 14px 14px 14px 4px;
  padding: 14px 18px;
  margin: 4px 0 8px 0;
  max-width: 88%;
  font-size: 14px;
  color: var(--wg-ink);
}

/* ── Status bar (summary strip) ─────────────────────────────────────── */
.wg-status-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: var(--wg-muted);
  padding: 10px 16px;
  background: var(--wg-card);
  border: 1px solid var(--wg-border);
  border-radius: 12px;
  margin-bottom: 16px;
}
.wg-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.wg-status-pill-amber { background: var(--wg-amber-bg); color: var(--wg-amber); }
.wg-status-pill-red   { background: var(--wg-red-bg);   color: var(--wg-red); }
.wg-status-pill-green { background: var(--wg-green-bg); color: var(--wg-green); }

/* ── Skeleton loader (advisory shimmer) ─────────────────────────────── */
.wg-skeleton {
  background: linear-gradient(90deg, var(--wg-border) 25%, var(--wg-bg) 50%, var(--wg-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite;
  border-radius: 10px;
  height: 90px;
}

/* ── Animation keyframes ────────────────────────────────────────────── */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.wg-fade-in { animation: fadeUp .3s ease; }

/* ── Quick prompt chips ─────────────────────────────────────────────── */
.wg-chip {
  display: inline-block;
  padding: 6px 14px;
  margin: 4px;
  border-radius: 20px;
  background: var(--wg-sky);
  color: var(--wg-blue);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease;
  border: 1px solid var(--wg-border);
}
.wg-chip:hover { background: var(--wg-blue); color: white; }

/* ── Charts ─────────────────────────────────────────────────────────── */
.wg-chart-box {
  border-radius: 14px;
  padding: 16px;
  border: 1px solid var(--wg-border);
  background: var(--wg-card);
}
</style>
"""


def inject_css() -> None:
    """Inject the global stylesheet once.  Call at the top of every page.

    All theming is pure CSS via light-dark() plus forcing the sidebar to
    inherit the app's color-scheme, so it follows the Streamlit theme
    toggle live without any rerun or JavaScript.
    """
    import streamlit as st
    st.markdown(CSS, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Render helpers — return HTML strings for Streamlit unsafe_allow_html=True
# ---------------------------------------------------------------------------

def render_section_title(text: str) -> str:
    return f'<div class="wg-section-title">{text}</div>'


def render_alert_banner(alert: Alert) -> str:
    cls = "wg-alert-warning" if alert.severity == "warning" else "wg-alert-watch"
    icon = alert.emoji
    day_tag = f"<span style='font-size:12px;opacity:.7;margin-left:8px;'>{alert.day or ''}</span>" if alert.day else ""
    return (
        f'<div class="wg-alert {cls}">'
        f"{icon} <strong>{alert.title}</strong>{day_tag}"
        f"<br><span style='font-size:13px;opacity:.85;'>{alert.message}</span>"
        f"</div>"
    )


def render_status_bar(
    current: CurrentWeather,
    alerts: list[Alert],
    city_label: str,
    updated_label: str,
) -> str:
    """A single summary line tying ①②③ together."""
    top = next(iter(alerts), None)
    if top and top.severity == "warning":
        pill = f'<span class="wg-status-pill wg-status-pill-red">{top.emoji} {top.title}</span>'
    elif top and top.severity == "watch":
        pill = f'<span class="wg-status-pill wg-status-pill-amber">{top.emoji} {top.title}</span>'
    else:
        pill = '<span class="wg-status-pill wg-status-pill-green">✅ No alerts</span>'

    return (
        f'<div class="wg-status-bar">'
        f"<span><strong>{city_label}</strong></span>"
        f"<span>Now: {_weather_emoji(current.weather_code)} {current.temperature_c:.0f}C "
        f"· Wind {current.wind_speed_kmh:.0f} km/h</span>"
        f"{pill}"
        f"<span style='margin-left:auto;font-size:12px;'>Updated {updated_label}</span>"
        f"</div>"
    )


def render_hero_current(current: CurrentWeather) -> str:
    """Zone 1 — big hero card with temperature + mini-metrics."""
    emoji = _weather_emoji(current.weather_code)
    return (
        '<div class="wg-card">'
        f'{render_section_title("What\'s happening now")}'
        f'<div class="wg-hero-condition">{emoji} {current.condition_text}</div>'
        f'<div class="wg-hero-temp">{current.temperature_c:.0f}°C</div>'
        '<div style="font-size:13px;color:var(--wg-muted);margin-top:2px;">'
        f'Feels like {current.feels_like_c:.0f}°C</div>'
        '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">'
        f'<div class="wg-metric-box"><span class="wg-metric-label">💧 Humidity</span>'
        f'<span class="wg-metric-value">{current.relative_humidity_pct:.0f}%</span></div>'
        f'<div class="wg-metric-box"><span class="wg-metric-label">💨 Wind</span>'
        f'<span class="wg-metric-value">{current.wind_speed_kmh:.0f} km/h</span></div>'
        f'<div class="wg-metric-box"><span class="wg-metric-label">☀️ UV Index</span>'
        f'<span class="wg-metric-value">{current.uv_index:.0f}</span></div>'
        f'<div class="wg-metric-box"><span class="wg-metric-label">🌧 Precip</span>'
        f'<span class="wg-metric-value">{current.precipitation_mm:.1f} mm</span></div>'
        "</div>"
        f'<div class="wg-hero-sub">Updated {current.time} · Is day: {"Yes" if current.is_day else "Night"}</div>'
        "</div>"
    )


def render_day_card(day: ForecastDay) -> str:
    """Single forecast day card (display-only HTML)."""
    emoji = _weather_emoji(day.weather_code)
    rain_pct = day.precipitation_probability_pct
    rain_color = "var(--wg-blue)" if rain_pct >= 40 else "var(--wg-muted)"
    return (
        '<div class="wg-day-card">'
        f'<div class="wg-day-label">{_day_label(day.date)}</div>'
        f'<div class="wg-day-emoji">{emoji}</div>'
        f'<div class="wg-day-high">{day.temp_max_c:.0f}°</div>'
        f'<div class="wg-day-low">{day.temp_min_c:.0f}°</div>'
        f'<div class="wg-day-rain" style="color:{rain_color};">🌧 {rain_pct:.0f}%</div>'
        "</div>"
    )


def render_day_cards_row(daily: list[ForecastDay]) -> str:
    """Wrap all day cards in a flex row."""
    cards = "".join(render_day_card(d) for d in daily)
    return f'<div style="display:flex;gap:10px;overflow-x:auto;padding:8px 0;">{cards}</div>'


def render_advisory_card(title: str, bullets: str, source: str = "") -> str:
    """Zone 3 — AI advisory card."""
    footer = f'<div style="font-size:11px;color:var(--wg-muted);margin-top:12px;">{source}</div>' if source else ""
    return (
        '<div class="wg-card" style="border-left:4px solid var(--wg-blue);">'
        f'{render_section_title(title)}'
        f'<div style="font-size:14px;line-height:1.65;color:var(--wg-ink);">{bullets}</div>'
        f"{footer}"
        "</div>"
    )


def render_user_chat_bubble(text: str) -> str:
    return f'<div class="wg-chat-user wg-fade-in">{text}</div>'


def render_assistant_chat_bubble(text: str) -> str:
    return f'<div class="wg-chat-assistant wg-fade-in">{text}</div>'


def render_skeleton() -> str:
    return '<div class="wg-skeleton"></div>'


def render_broadcast_log_entry(entry: dict) -> str:
    """Single broadcast history line."""
    channels = ", ".join(entry.get("channels", []))
    count = entry.get("subscriber_count", 0)
    return (
        f'<div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--wg-border);">'
        f'<span style="color:var(--wg-muted);">{entry["timestamp"]}</span> '
        f'<strong style="color:var(--wg-ink);">{entry["alert_title"]}</strong> '
        f'<span style="color:var(--wg-muted);">via {channels} → {count:,} subscribers</span>'
        "</div>"
    )