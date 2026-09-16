"""Open-Meteo client: geocoding, current conditions, and 7-day forecast.

Pure data layer. No UI or LLM logic here; all calls return simple dataclasses
or plain dicts so the rest of the app stays decoupled from the API shape.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import time

import requests

from config import (
    DEFAULT_CITY,
    DEFAULT_LAT,
    DEFAULT_LON,
    DEFAULT_TIMEZONE,
    OPEN_METEO_FORECAST_URL,
    OPEN_METEO_GEOCODE_URL,
    PRESET_CITIES,
)

# WMO weather interpretation codes -> human readable text.
WMO_CONDITIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Rain showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm, hail",
    99: "Thunderstorm, hail",
}

_TIME_FORMAT = "%Y-%m-%dT%H:%M"


@dataclass
class CurrentWeather:
    """Live conditions for a location at fetch time."""

    time: str
    temperature_c: float
    feels_like_c: float
    relative_humidity_pct: float
    wind_speed_kmh: float
    weather_code: int
    precipitation_mm: float
    uv_index: float
    is_day: bool

    @property
    def condition_text(self) -> str:
        return WMO_CONDITIONS.get(self.weather_code, "Unknown")


@dataclass
class ForecastDay:
    """A single daily forecast entry."""

    date: str
    weather_code: int
    temp_max_c: float
    temp_min_c: float
    precipitation_probability_pct: float
    precipitation_mm: float
    wind_speed_kmh: float
    sunrise: str
    sunset: str

    @property
    def condition_text(self) -> str:
        return WMO_CONDITIONS.get(self.weather_code, "Unknown")


@dataclass
class Location:
    """A resolved place (from geocoding or a preset)."""

    name: str
    lat: float
    lon: float
    country: str = ""
    admin1: str = ""

    @property
    def label(self) -> str:
        parts = [p for p in (self.name, self.admin1, self.country) if p]
        return ", ".join(parts)


def _get_json(
    url: str,
    params: dict,
    timeout: int = 25,
    retries: int = 3,
) -> dict:
    """GET a JSON payload with retry-on-timeout, raising a readable error.

    Open-Meteo occasionally stalls under load; retry with a short backoff
    before giving up so a single slow response doesn't blank the page.
    """
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            last_err = exc
            if attempt < retries - 1:
                time.sleep(1.0 * (attempt + 1))
    raise ConnectionError(f"Open-Meteo request failed: {last_err}") from last_err


def _find_preset(name: str) -> dict | None:
    """Return a preset city if the given name matches (case-insensitive)."""
    target = name.strip().lower()
    for city in PRESET_CITIES:
        if city["name"].lower() == target:
            return city
    return None


def geocode_location(query: str) -> Location:
    """Resolve a free-text place name to coordinates via Open-Meteo.

    Falls back to the preset table (offline-safe for known demo cities) before
    hitting the network, then to Varanasi as a final safety net.
    """
    preset = _find_preset(query)
    if preset:
        return Location(preset["name"], preset["lat"], preset["lon"], country="India")

    if query.strip():
        payload = _get_json(
            OPEN_METEO_GEOCODE_URL,
            {"name": query.strip(), "count": 1, "language": "en", "format": "json"},
        )
        results = payload.get("results") or []
        if results:
            hit = results[0]
            return Location(
                name=hit.get("name", query.strip()),
                lat=hit["latitude"],
                lon=hit["longitude"],
                country=hit.get("country", ""),
                admin1=hit.get("admin1", ""),
            )

    return Location(DEFAULT_CITY, DEFAULT_LAT, DEFAULT_LON, country="India")


def fetch_current_weather(lat: float, lon: float) -> CurrentWeather:
    """Fetch live conditions for coordinates."""
    payload = _get_json(
        OPEN_METEO_FORECAST_URL,
        {
            "latitude": lat,
            "longitude": lon,
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,"
                "precipitation,weather_code,wind_speed_10m,is_day,uv_index"
            ),
            "timezone": "auto",
        },
    )
    current = payload["current"]
    raw_time = current.get("time", "")
    try:
        display_time = datetime.fromisoformat(raw_time).strftime("%H:%M")
    except ValueError:
        display_time = raw_time

    return CurrentWeather(
        time=display_time,
        temperature_c=current["temperature_2m"],
        feels_like_c=current["apparent_temperature"],
        relative_humidity_pct=current["relative_humidity_2m"],
        wind_speed_kmh=current["wind_speed_10m"],
        weather_code=current["weather_code"],
        precipitation_mm=current["precipitation"],
        uv_index=current["uv_index"],
        is_day=bool(current.get("is_day", 1)),
    )


def fetch_daily_forecast(lat: float, lon: float, days: int = 7) -> list[ForecastDay]:
    """Fetch a multi-day daily forecast (1-16 days, default 7)."""
    payload = _get_json(
        OPEN_METEO_FORECAST_URL,
        {
            "latitude": lat,
            "longitude": lon,
            "daily": (
                "weather_code,temperature_2m_max,temperature_2m_min,"
                "precipitation_probability_max,precipitation_sum,"
                "wind_speed_10m_max,sunrise,sunset"
            ),
            "timezone": DEFAULT_TIMEZONE,
            "forecast_days": days,
            "models": "best_match",
        },
    )
    daily = payload["daily"]
    return [
        ForecastDay(
            date=item,
            weather_code=daily["weather_code"][i],
            temp_max_c=daily["temperature_2m_max"][i],
            temp_min_c=daily["temperature_2m_min"][i],
            precipitation_probability_pct=daily["precipitation_probability_max"][i],
            precipitation_mm=daily["precipitation_sum"][i],
            wind_speed_kmh=daily["wind_speed_10m_max"][i],
            sunrise=daily["sunrise"][i].split("T")[-1] if "T" in daily["sunrise"][i] else "",
            sunset=daily["sunset"][i].split("T")[-1] if "T" in daily["sunset"][i] else "",
        )
        for i, item in enumerate(daily["time"])
    ]


def hourly_temperature_series(lat: float, lon: float, hours: int = 24) -> list[tuple[str, float]]:
    """Return (time_label, temperature) tuples for the next N hours."""
    payload = _get_json(
        OPEN_METEO_FORECAST_URL,
        {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m",
            "timezone": DEFAULT_TIMEZONE,
            "forecast_hours": hours,
        },
    )
    hourly = payload["hourly"]
    return [
        (t.split("T")[-1], round(temp, 1))
        for t, temp in zip(hourly["time"], hourly["temperature_2m"], strict=True)
    ]


def weather_context_for_prompt(
    location: Location,
    current: CurrentWeather,
    daily: list[ForecastDay],
) -> str:
    """Compact canonical weather summary handed to the LLM (tool result)."""
    lines = [
        f"Location: {location.label} ({location.lat:.2f}, {location.lon:.2f})",
        (
            f"Now ({current.time}): {current.condition_text}, "
            f"{current.temperature_c:.0f}C (feels {current.feels_like_c:.0f}C), "
            f"humidity {current.relative_humidity_pct:.0f}%, "
            f"wind {current.wind_speed_kmh:.0f} km/h, "
            f"precipitation {current.precipitation_mm:.1f} mm, "
            f"UV index {current.uv_index:.0f}"
        ),
    ]
    days = ", ".join(
        (
            f"{day.date[5:]} {day.condition_text} "
            f"{day.temp_max_c:.0f}/{day.temp_min_c:.0f}C "
            f"rain {day.precipitation_probability_pct:.0f}% "
            f"wind {day.wind_speed_kmh:.0f} km/h"
        )
        for day in daily
    )
    lines.append(f"7-day: {days}")
    return "\n".join(lines)