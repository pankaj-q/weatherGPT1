"use client";

import { motion } from "framer-motion";
import { CloudRain, Droplets, Gauge, Sunrise, Sunset, Wind } from "lucide-react";
import type { WeatherPayload } from "@/lib/weather";
import ConditionIcon from "./ConditionIcon";
import CountUp from "./CountUp";
import { GlassCard } from "./ui";

const Metric = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.05]">
    <div className="flex items-center gap-2 text-faint">
      {icon}
      <span className="text-[11px] uppercase tracking-[0.12em]">{label}</span>
    </div>
    <div className="mt-2 font-display text-xl font-semibold tabular-nums text-ink">{value}</div>
    {hint ? <div className="text-[11px] text-faint">{hint}</div> : null}
  </div>
);

export default function CurrentHero({ weather }: { weather: WeatherPayload }) {
  const c = weather.current!;
  const today = weather.daily[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className="relative overflow-hidden p-6 lg:p-10">
        <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.20),transparent_70%)]" />

        <div className="relative flex flex-col items-start gap-10 lg:flex-row lg:items-center">
          {/* Identity + temperature */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky/30 bg-sky/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky">
                Now · {c.time}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-mist">
                {c.isDay ? "Day" : "Night"} · {c.condition}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-6">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky/30 via-indigo/25 to-violet/30 text-ink ring-1 ring-white/10">
                  <ConditionIcon code={c.code} isDay={c.isDay} className="h-10 w-10" />
                </div>
              </div>
              <div>
                <div className="font-display text-[72px] font-semibold leading-none tracking-tight text-ink lg:text-[92px]">
                  <CountUp value={Math.round(c.temp)} />
                  <span className="align-top text-3xl text-mist">°C</span>
                </div>
                <div className="mt-1 text-sm text-mist">
                  Feels like <span className="font-semibold text-ink">{Math.round(c.feelsLike)}°</span>
                  {today ? (
                    <span className="ml-2">
                      H <span className="font-semibold text-ink">{Math.round(today.tMax)}°</span>
                      <span className="mx-1 text-faint">/</span>
                      L <span className="font-semibold text-ink">{Math.round(today.tMin)}°</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
              {weather.location.name}
              {weather.location.admin1 ? (
                <span className="text-faint"> · {weather.location.admin1}</span>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-faint">{weather.location.label}</p>
          </div>

          {/* Metrics */}
          <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric
              icon={<Droplets className="h-4 w-4" />}
              label="Humidity"
              value={`${Math.round(c.humidity)}%`}
            />
            <Metric
              icon={<Wind className="h-4 w-4" />}
              label="Wind"
              value={`${Math.round(c.wind)} km/h`}
            />
            <Metric icon={<Gauge className="h-4 w-4" />} label="UV index" value={`${c.uv.toFixed(1)}`} />
            <Metric
              icon={<CloudRain className="h-4 w-4" />}
              label="Precip"
              value={`${c.precip.toFixed(1)} mm`}
            />
            <Metric icon={<Sunrise className="h-4 w-4" />} label="Sunrise" value={today?.sunrise || "—"} />
            <Metric icon={<Sunset className="h-4 w-4" />} label="Sunset" value={today?.sunset || "—"} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}