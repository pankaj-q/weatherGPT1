"""Weather alert engine and simulated emergency broadcast system.

Thresholds derived from NDMA/IMD guidelines. Broadcast is purely simulated
(SMS / email / push log entries) so the demo is safe to run without live
messaging infrastructure.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from config import (
    HEAVY_RAIN_MM,
    HEATWAVE_TEMP_C,
    HIGH_UV_INDEX,
    HIGH_WIND_KMH,
    SIMULATED_SUBSCRIBERS,
    STORM_HUMIDITY_PCT,
)

from utils.weather_api import CurrentWeather, ForecastDay


@dataclass
class Alert:
    """A single weather alert raised by the threshold engine."""

    severity: str          # "warning" | "watch"
    title: str             # short label
    message: str           # longer explanation
    day: str | None = None  # date str if daily, None if live

    def to_dict(self) -> dict:
        return {"severity": self.severity, "title": self.title,
                "message": self.message, "day": self.day}

    @property
    def color(self) -> str:
        return "red" if self.severity == "warning" else "amber"

    @property
    def emoji(self) -> str:
        return {"warning": "🔴", "watch": "🟠"}.get(self.severity, "🟡")


@dataclass
class BroadcastLog:
    """An entry in the emergency broadcast history."""

    timestamp: str
    alert_title: str
    location: str
    channels: list[str]
    subscriber_count: int

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "alert_title": self.alert_title,
            "location": self.location,
            "channels": self.channels,
            "subscriber_count": self.subscriber_count,
        }

    @property
    def channels_str(self) -> str:
        return ", ".join(self.channels)


def check_thresholds(
    current: CurrentWeather,
    daily: list[ForecastDay],
) -> list[Alert]:
    """Run live + daily conditions against IMD-style thresholds.

    Returns alerts sorted by severity (warnings first) then by date.
    """
    alerts: list[Alert] = []

    # --- Live condition alerts ---
    if current.temperature_c >= HEATWAVE_TEMP_C:
        alerts.append(Alert(
            severity="warning",
            title="Heatwave active",
            message=(
                f"Current temperature is {current.temperature_c:.0f}C "
                f"(feels {current.feels_like_c:.0f}C), exceeding the "
                f"{HEATWAVE_TEMP_C:.0f}C heatwave threshold."
            ),
        ))

    if current.wind_speed_kmh >= HIGH_WIND_KMH:
        alerts.append(Alert(
            severity="warning",
            title="High wind alert",
            message=f"Wind speed is {current.wind_speed_kmh:.0f} km/h.",
        ))

    if current.uv_index >= HIGH_UV_INDEX:
        alerts.append(Alert(
            severity="watch",
            title="Extreme UV index",
            message=f"UV index is {current.uv_index:.0f}. Limit sun exposure 10am-4pm.",
        ))

    # --- Daily forecast alerts ---
    for day in daily:
        label = f"{day.date[5:]}"  # MM-DD short label

        if day.temp_max_c >= HEATWAVE_TEMP_C:
            alerts.append(Alert(
                severity="warning" if day.temp_max_c >= 42.0 else "watch",
                title=f"Heatwave on {label}",
                message=f"Max {day.temp_max_c:.0f}C forecast (threshold {HEATWAVE_TEMP_C:.0f}C).",
                day=day.date,
            ))

        if day.precipitation_mm >= HEAVY_RAIN_MM:
            alerts.append(Alert(
                severity="warning" if day.precipitation_mm >= 25.0 else "watch",
                title=f"Heavy rain on {label}",
                message=f"Expected {day.precipitation_mm:.0f} mm precipitation (threshold {HEAVY_RAIN_MM:.0f} mm).",
                day=day.date,
            ))

        if day.wind_speed_kmh >= HIGH_WIND_KMH:
            alerts.append(Alert(
                severity="warning" if day.wind_speed_kmh >= 80.0 else "watch",
                title=f"High wind on {label}",
                message=f"Wind up to {day.wind_speed_kmh:.0f} km/h.",
                day=day.date,
            ))

        if (
            day.precipitation_probability_pct >= 60.0
            and day.precipitation_mm >= 10.0
            and current.relative_humidity_pct >= STORM_HUMIDITY_PCT
        ):
            alerts.append(Alert(
                severity="watch",
                title=f"Storm risk on {label}",
                message=f"High humidity ({current.relative_humidity_pct:.0f}%) with rain expected.",
                day=day.date,
            ))

    _priority = {"warning": 0, "watch": 1}
    alerts.sort(key=lambda a: (_priority.get(a.severity, 2), a.day or ""))
    return alerts


def simulate_broadcast(
    location_label: str,
    alert: Alert | None,
) -> BroadcastLog:
    """Return a simulated emergency broadcast log entry.

    No real messages are sent; the log is for demo / educational purposes.
    """
    now = datetime.now().strftime("%H:%M:%S")
    title = alert.title if alert else "Weather Bulletin"
    channels = ["SMS", "Email", "Push"]
    return BroadcastLog(
        timestamp=now,
        alert_title=title,
        location=location_label,
        channels=channels,
        subscriber_count=SIMULATED_SUBSCRIBERS,
    )