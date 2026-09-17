import { NextRequest, NextResponse } from "next/server";
import { get as httpsGet } from "node:https";
import { get as httpGet } from "node:http";
import { conditionFor } from "../../../lib/conditions";
import {
  computeAlerts,
  type CurrentWeather,
  type DailyDay,
  type HourPoint,
  type LocationMeta,
  type WeatherPayload,
} from "../../../lib/weather";

export const dynamic = "force-dynamic";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

interface DailyInput {
  date: string;
  tMax: number;
  rain: number;
  wind: number;
  rainProb: number;
}

/* Some networks hand out a NAT64 AAAA address for api.open-meteo.com that
   Node's fetch (undici) black-holes on. Pin the connection to IPv4 via the
   node:https stack as a reliable fallback. */
function secureRequestJson(
  url: string,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === "https:" ? httpsGet : httpGet;
    const req = lib(
      {
        hostname: target.hostname,
        port: target.port || undefined,
        path: target.pathname + target.search,
        family: 4,
        headers: { accept: "application/json" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Open-Meteo responded ${res.statusCode}`));
          } else {
            try {
              resolve(JSON.parse(body) as Record<string, unknown>);
            } catch {
              reject(new Error("Invalid JSON from Open-Meteo"));
            }
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Open-Meteo request timed out")));
    req.on("error", (err) => reject(err));
  });
}

async function fetchWithFallback(
  url: string,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo responded ${res.status}`);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return secureRequestJson(url, timeoutMs);
  }
}

async function fetchJson(url: string, timeoutMs = 25000): Promise<Record<string, unknown>> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchWithFallback(url, timeoutMs);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Open-Meteo request failed: ${lastErr?.message}`);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number.parseFloat(sp.get("lat") ?? "");
  const lon = Number.parseFloat(sp.get("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const location: LocationMeta = {
    name: sp.get("name") || "Unknown",
    lat,
    lon,
    country: sp.get("country") || "",
    admin1: sp.get("admin1") || undefined,
    label: [sp.get("name") || "Unknown", sp.get("admin1"), sp.get("country")]
      .filter(Boolean)
      .join(", "),
  };

  try {
    const q = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day,uv_index",
      hourly: "temperature_2m,precipitation_probability",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: "7",
    });
    const data = await fetchJson(`${FORECAST_URL}?${q.toString()}`);

    const currentRaw = (data.current ?? {}) as Record<string, unknown>;
    const dailyRaw = (data.daily ?? {}) as Record<string, unknown>;
    const hourlyRaw = (data.hourly ?? {}) as Record<string, unknown>;

    const code = Number(currentRaw.weather_code ?? 0);
    const time = String(currentRaw.time ?? "");
    const current: CurrentWeather = {
      time: time.includes("T") ? String(time).split("T")[1].slice(0, 5) : time,
      temp: Number(currentRaw.temperature_2m ?? 0),
      feelsLike: Number(currentRaw.apparent_temperature ?? 0),
      humidity: Number(currentRaw.relative_humidity_2m ?? 0),
      wind: Number(currentRaw.wind_speed_10m ?? 0),
      precip: Number(currentRaw.precipitation ?? 0),
      uv: Number(currentRaw.uv_index ?? 0),
      code,
      isDay: Boolean(currentRaw.is_day ?? 1),
      condition: conditionFor(code).label,
    };

    const times = (dailyRaw.time as string[]) ?? [];
    const codes = (dailyRaw.weather_code as number[]) ?? [];
    const tMax = (dailyRaw.temperature_2m_max as number[]) ?? [];
    const tMin = (dailyRaw.temperature_2m_min as number[]) ?? [];
    const rainProb = (dailyRaw.precipitation_probability_max as number[]) ?? [];
    const rain = (dailyRaw.precipitation_sum as number[]) ?? [];
    const wind = (dailyRaw.wind_speed_10m_max as number[]) ?? [];
    const sunrise = (dailyRaw.sunrise as string[]) ?? [];
    const sunset = (dailyRaw.sunset as string[]) ?? [];

    const dayLabel = (date: string) =>
      new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      });

    const daily: DailyDay[] = times.map((date, i) => ({
      date,
      label: dayLabel(date),
      code: codes[i] ?? 0,
      tMax: tMax[i] ?? 0,
      tMin: tMin[i] ?? 0,
      rainProb: rainProb[i] ?? 0,
      rain: rain[i] ?? 0,
      wind: wind[i] ?? 0,
      sunrise: String(sunrise[i] ?? "").split("T")[1]?.slice(0, 5) ?? "",
      sunset: String(sunset[i] ?? "").split("T")[1]?.slice(0, 5) ?? "",
      condition: conditionFor(codes[i] ?? 0).label,
    }));

    const dailyInputs: DailyInput[] = times.map((date, i) => ({
      date,
      tMax: tMax[i] ?? 0,
      rain: rain[i] ?? 0,
      wind: wind[i] ?? 0,
      rainProb: rainProb[i] ?? 0,
    }));

    const hTimes = (hourlyRaw.time as string[]) ?? [];
    const hTemps = (hourlyRaw.temperature_2m as number[]) ?? [];
    const nowIdx = Math.max(
      0,
      hTimes.findIndex((t) => String(t).slice(11, 13) >= current.time.slice(0, 2)),
    );
    const hourly: HourPoint[] = hTimes.slice(nowIdx, nowIdx + 24).map((t, i) => ({
      time: String(t).slice(11, 16),
      temp: hTemps[nowIdx + i] ?? 0,
      label: String(t).slice(11, 16),
    }));

    const utcOffsetSeconds = Number(data.utc_offset_seconds ?? 0);
    const local = new Date(Date.now() + utcOffsetSeconds * 1000);
    const localTime = local
      .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
      .replace(" AM", "")
      .replace(" PM", "");

    const payload: WeatherPayload = {
      location,
      tz: String(data.timezone ?? "auto"),
      localTime,
      utcOffsetSeconds,
      current,
      hourly,
      daily,
      alerts: computeAlerts(
        {
          temp: current.temp,
          feelsLike: current.feelsLike,
          humidity: current.humidity,
          wind: current.wind,
          uv: current.uv,
        },
        dailyInputs,
      ),
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Couldn't reach weather data: ${msg}` },
      { status: 502 },
    );
  }
}