"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudSun, Menu } from "lucide-react";
import AuroraBackground from "@/components/AuroraBackground";
import ChatPanel from "@/components/ChatPanel";
import CurrentHero from "@/components/CurrentHero";
import ForecastStrip from "@/components/ForecastStrip";
import AlertPanel from "@/components/AlertPanel";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import Sidebar from "@/components/Sidebar";
import LiveClock from "@/components/LiveClock";
import { GlassCard } from "@/components/ui";
import { DEFAULT_LAT, DEFAULT_LON } from "@/lib/constants";
import {
  callAi,
  fetchWeather,
  type LocationMeta,
  type WeatherPayload,
} from "@/lib/weather";

const DEFAULT_LOC: LocationMeta = {
  name: "Varanasi",
  lat: DEFAULT_LAT,
  lon: DEFAULT_LON,
  country: "India",
  label: "Varanasi, India",
};

function WeatherSkeleton() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-10">
        <div className="shimmer h-6 w-36 rounded-full" />
        <div className="mt-8 flex items-center gap-6">
          <div className="shimmer h-20 w-20 rounded-3xl" />
          <div className="space-y-3">
            <div className="shimmer h-14 w-40 rounded-xl" />
            <div className="shimmer h-4 w-52 rounded-full" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
      </GlassCard>
      <div className="shimmer h-40 rounded-3xl" />
    </div>
  );
}

export default function Home() {
  const [loc, setLoc] = useState<LocationMeta>(DEFAULT_LOC);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [advisory, setAdvisory] = useState<string | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryErr, setAdvisoryErr] = useState<string | null>(null);
  const [advisoryLang, setAdvisoryLang] = useState<"English" | "Hindi">("English");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadLocation = useCallback(
    async (target: LocationMeta) => {
      try {
        const p = await fetchWeather(target);
        setWeather(p);
        setFetchError(null);
        setAdvisory(null);
        setAdvisoryErr(null);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : String(err));
        setWeather(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void loadLocation(loc);
    }, 0);
    return () => clearTimeout(t);
  }, [loc, loadLocation]);

  const generateAdvisory = useCallback(
    async (lang: "English" | "Hindi", w: WeatherPayload) => {
      /* Schedule the loading flags on a microtask so the live data fetch
         effect never calls setState synchronously (avoids cascading renders). */
      queueMicrotask(() => {
        setAdvisoryLoading(true);
        setAdvisoryErr(null);
      });
      try {
        const res = await callAi(loc, w, { kind: "advisory" }, lang);
        setAdvisory(res.text);
      } catch (err) {
        setAdvisoryErr(err instanceof Error ? err.message : String(err));
      } finally {
        setAdvisoryLoading(false);
      }
    },
    [loc],
  );

  /* Auto-generate the advisory once live weather is ready. */
  useEffect(() => {
    if (weather && !advisory && !advisoryErr && !advisoryLoading) {
      const t = setTimeout(() => {
        void generateAdvisory(advisoryLang, weather);
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [weather, advisory, advisoryErr, advisoryLoading, advisoryLang, generateAdvisory]);

  const switchLang = (l: "English" | "Hindi") => {
    setAdvisoryLang(l);
    if (weather) void generateAdvisory(l, weather);
  };

  const refresh = () => {
    setRefreshing(true);
    void loadLocation(loc).finally(() => setRefreshing(false));
  };

  const selectLocation = (next: LocationMeta) => {
    setLoc(next);
    setLoading(true);
    setSidebarOpen(false);
  };

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-void/90 px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ink"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-indigo">
            <CloudSun className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-[15px] font-semibold text-ink">
            Weather<span className="text-sky">GPT</span>
          </span>
        </div>
        <LiveClock
          tz={weather?.tz ?? "Asia/Kolkata"}
          utcOffsetSeconds={weather?.utcOffsetSeconds ?? 19800}
          onRefresh={refresh}
          refreshing={refreshing}
        />
      </header>

      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} location={loc} onSelect={selectLocation} />

        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {/* Desktop header */}
          <div className="mb-8 hidden items-center justify-between lg:flex">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {loc.name}{" "}
                <span className="text-faint">· {loc.label.split(",").slice(1).join(",")}</span>
              </h1>
              <p className="mt-1 text-sm text-faint">Live conditions, forecast & AI advisory — refreshed live.</p>
            </div>
            <LiveClock
              tz={weather?.tz ?? "Asia/Kolkata"}
              utcOffsetSeconds={weather?.utcOffsetSeconds ?? 19800}
              onRefresh={refresh}
              refreshing={refreshing}
            />
          </div>

          {weather && !loading ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
              className="space-y-10"
            >
              <CurrentHero weather={weather} />
              <ForecastStrip weather={weather} />
              <AlertPanel alerts={weather.alerts} />
              <AdvisoryPanel
                location={loc}
                advisory={advisory}
                loading={advisoryLoading}
                error={advisoryErr}
                lang={advisoryLang}
                onLanguage={switchLang}
                onGenerate={() => void generateAdvisory(advisoryLang, weather)}
              />
              <ChatPanel weather={weather} location={loc} />
            </motion.div>
          ) : loading ? (
            <WeatherSkeleton />
          ) : (
            <GlassCard className="p-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-base font-semibold text-ink">Weather data unavailable</div>
                  <p className="mt-1 text-sm text-mist">{fetchError}</p>
                </div>
                <button
                  onClick={refresh}
                  className="ml-auto rounded-2xl bg-gradient-to-br from-sky to-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Retry
                </button>
              </div>
            </GlassCard>
          )}

          <footer className="mt-16 border-t border-white/5 pb-2 pt-6 text-center text-[11px] text-faint">
            WeatherGPT · Data: Open-Meteo (CC BY 4.0) · AI: Groq — qwen/qwen3.8-27b · Simulated emergency broadcasts
          </footer>
        </main>
      </div>
    </div>
  );
}