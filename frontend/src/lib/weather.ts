import { THRESHOLDS } from "./constants";
import { conditionFor } from "./conditions";

export interface LocationMeta {
  name: string;
  lat: number;
  lon: number;
  country: string;
  admin1?: string;
  label: string;
}

export interface CurrentWeather {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  precip: number;
  uv: number;
  code: number;
  isDay: boolean;
  condition: string;
}

export interface DailyDay {
  date: string;
  label: string;
  code: number;
  tMax: number;
  tMin: number;
  rainProb: number;
  rain: number;
  wind: number;
  sunrise: string;
  sunset: string;
  condition: string;
}

export interface HourPoint {
  time: string;
  temp: number;
  label: string;
}

export interface AlertItem {
  severity: "warning" | "watch";
  title: string;
  message: string;
  day?: string;
}

export interface WeatherPayload {
  location: LocationMeta;
  tz: string;
  localTime: string;
  utcOffsetSeconds: number;
  current: CurrentWeather | null;
  hourly: HourPoint[];
  daily: DailyDay[];
  alerts: AlertItem[];
  fetchedAt: string;
}

export function detectLanguage(text: string): "English" | "Hindi" {
  return /[\u0900-\u097F]/.test(text) ? "Hindi" : "English";
}

interface LiveInput {
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  uv: number;
}

interface DailyInput {
  date: string;
  tMax: number;
  rain: number;
  wind: number;
  rainProb: number;
}

/* IMD/NDMA-style threshold engine (mirror of utils/alerts.py) */
export function computeAlerts(
  current: LiveInput,
  daily: DailyInput[],
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (current.temp >= THRESHOLDS.heatwave) {
    alerts.push({
      severity: "warning",
      title: "Heatwave active",
      message: `Current temperature is ${current.temp.toFixed(0)}C (feels ${current.feelsLike.toFixed(0)}C), above the ${THRESHOLDS.heatwave}C heatwave threshold.`,
    });
  }

  if (current.wind >= THRESHOLDS.highWind) {
    alerts.push({
      severity: "warning",
      title: "High wind alert",
      message: `Wind speed is ${current.wind.toFixed(0)} km/h.`,
    });
  }

  if (current.uv >= THRESHOLDS.highUV) {
    alerts.push({
      severity: "watch",
      title: "Extreme UV index",
      message: `UV index is ${current.uv.toFixed(0)}. Limit sun exposure 10am-4pm.`,
    });
  }

  for (const d of daily) {
    const label = d.date;

    if (d.tMax >= THRESHOLDS.heatwave) {
      alerts.push({
        severity: d.tMax >= 42 ? "warning" : "watch",
        title: `Heatwave on ${label}`,
        message: `Max ${d.tMax.toFixed(0)}C forecast (threshold ${THRESHOLDS.heatwave}C).`,
        day: d.date,
      });
    }

    if (d.rain >= THRESHOLDS.heavyRain) {
      alerts.push({
        severity: d.rain >= 25 ? "warning" : "watch",
        title: `Heavy rain on ${label}`,
        message: `Expected ${d.rain.toFixed(0)} mm precipitation (threshold ${THRESHOLDS.heavyRain} mm).`,
        day: d.date,
      });
    }

    if (d.wind >= THRESHOLDS.highWind) {
      alerts.push({
        severity: d.wind >= 80 ? "warning" : "watch",
        title: `High wind on ${label}`,
        message: `Wind up to ${d.wind.toFixed(0)} km/h.`,
        day: d.date,
      });
    }

    if (d.rainProb >= 60 && d.rain >= 10 && current.humidity >= THRESHOLDS.stormHumidity) {
      alerts.push({
        severity: "watch",
        title: `Storm risk on ${label}`,
        message: `High humidity (${current.humidity.toFixed(0)}%) with rain expected.`,
        day: d.date,
      });
    }
  }

  return alerts.sort(
    (a, b) =>
      (a.severity === "warning" ? 0 : 1) - (b.severity === "warning" ? 0 : 1) ||
      (a.day ?? "").localeCompare(b.day ?? ""),
  );
}

/* --- Client-side fetchers ------------------------------------------------- */

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWeather(loc: LocationMeta): Promise<WeatherPayload> {
  const q = new URLSearchParams({
    lat: String(loc.lat),
    lon: String(loc.lon),
    name: loc.name,
    country: loc.country,
    admin1: loc.admin1 ?? "",
  });
  return getJSON<WeatherPayload>(`/api/weather?${q.toString()}`);
}

export async function geocode(query: string): Promise<LocationMeta | null> {
  const q = new URLSearchParams({ q: query.trim() });
  return getJSON<LocationMeta | null>(`/api/geocode?${q.toString()}`);
}

export interface AiResponse {
  text: string;
  lang: string;
  cached?: boolean;
}

export type AiAction = { kind: "advisory" } | { kind: "chat"; messages: AiMessage[] };

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callAi(
  location: LocationMeta,
  weather: WeatherPayload,
  action: AiAction,
  lang: string,
): Promise<AiResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, weather, lang, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `AI request failed (${res.status})`);
  }
  return res.json() as Promise<AiResponse>;
}

/* Build the compact canonical context handed to the LLM (mirror of
   weather_context_for_prompt). */
export function weatherContext(loc: LocationMeta, w: WeatherPayload): string {
  const lines: string[] = [];
  const cur = w.current;
  if (cur) {
    lines.push(
      `Location: ${loc.label} (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)})`,
      `Now (${cur.time}): ${cur.condition}, ${cur.temp.toFixed(0)}C (feels ${cur.feelsLike.toFixed(0)}C), humidity ${cur.humidity.toFixed(0)}%, wind ${cur.wind.toFixed(0)} km/h, precipitation ${cur.precip.toFixed(1)} mm, UV index ${cur.uv.toFixed(0)}`,
    );
  }
  if (w.daily.length) {
    const days = w.daily
      .map(
        (d) =>
          `${d.date} ${d.condition} ${d.tMax.toFixed(0)}/${d.tMin.toFixed(0)}C rain ${d.rainProb.toFixed(0)}% wind ${d.wind.toFixed(0)} km/h`,
      )
      .join(", ");
    lines.push(`7-day: ${days}`);
  }
  if (w.alerts.length) {
    const alertLines = w.alerts
      .map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.message}`)
      .join("\n");
    lines.push(`\nActive alerts:\n${alertLines}`);
  }
  return lines.join("\n");
}

export const wmoEmoji = (code: number, isDay = true): string => {
  const kind = conditionFor(code).kind;
  switch (kind) {
    case "clear":
      return isDay ? "☀️" : "🌙";
    case "partly":
      return isDay ? "🌤️" : "🌥️";
    case "cloud":
      return "☁️";
    case "fog":
      return "🌫️";
    case "drizzle":
      return "🌦️";
    case "rain":
      return "🌧️";
    case "storm":
      return "⛈️";
    case "snow":
      return "❄️";
  }
};