import { NextRequest, NextResponse } from "next/server";
import { PRESET_CITIES } from "../../../lib/constants";
import type { LocationMeta } from "../../../lib/weather";

export const dynamic = "force-dynamic";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FALLBACK = { name: "Varanasi", lat: 25.3176, lon: 82.9739, country: "India" };

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!res.ok) throw new Error(`Geocoding responded ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw new Error(lastErr?.message ?? "Geocoding request failed");
}

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const preset = PRESET_CITIES.find(
    (c) => c.name.toLowerCase() === query.toLowerCase(),
  );
  if (preset) {
    const loc: LocationMeta = {
      name: preset.name,
      lat: preset.lat,
      lon: preset.lon,
      country: "India",
      label: `${preset.name}, India`,
    };
    return NextResponse.json(loc);
  }

  try {
    const q = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json",
    });
    const data = await fetchJson(`${GEOCODE_URL}?${q.toString()}`);
    const results = (data.results ?? []) as Record<string, unknown>[];
    if (results.length) {
      const hit = results[0];
      const loc: LocationMeta = {
        name: String(hit.name ?? query),
        lat: Number(hit.latitude),
        lon: Number(hit.longitude),
        country: String(hit.country ?? ""),
        admin1: hit.admin1 ? String(hit.admin1) : undefined,
        label: [hit.name, hit.admin1, hit.country]
          .filter(Boolean)
          .map(String)
          .join(", "),
      };
      return NextResponse.json(loc);
    }
    const loc: LocationMeta = {
      name: FALLBACK.name,
      lat: FALLBACK.lat,
      lon: FALLBACK.lon,
      country: FALLBACK.country,
      label: `${FALLBACK.name}, ${FALLBACK.country}`,
    };
    return NextResponse.json(loc);
  } catch {
    return NextResponse.json(
      { error: "Geocoding temporarily unavailable" },
      { status: 502 },
    );
  }
}