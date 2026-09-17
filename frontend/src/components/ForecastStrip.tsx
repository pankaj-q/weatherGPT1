"use client";

import { motion } from "framer-motion";
import { CalendarDays, Clock3 } from "lucide-react";
import type { WeatherPayload } from "@/lib/weather";
import ConditionIcon from "./ConditionIcon";
import { GlassCard, SectionHeading } from "./ui";

export default function ForecastStrip({ weather }: { weather: WeatherPayload }) {
  const daily = weather.daily;
  const hourly = weather.hourly.slice(0, 12);
  const maxTemp = Math.max(...hourly.map((h) => h.temp), 1);

  return (
    <section className="space-y-6">
      {/* Hourly band */}
      <div>
        <SectionHeading icon={<Clock3 className="h-4 w-4" />}>Next 12 hours</SectionHeading>
        <GlassCard className="p-5">
          <div className="flex items-end justify-between gap-2 overflow-x-auto hide-scrollbar">
            {hourly.map((h, i) => {
              const hRatio = Math.max(0.15, h.temp / maxTemp);
              return (
                <motion.div
                  key={h.time + i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.4, ease: "easeOut" }}
                  className="flex min-w-[44px] flex-1 flex-col items-center gap-2.5 py-2"
                >
                  <span className="font-mono text-[11px] tabular-nums text-faint">{h.time}</span>
                  <div className="flex h-16 w-full items-end justify-center">
                    <div
                      className={`w-1.5 rounded-full ${
                        i === 0
                          ? "bg-gradient-to-t from-sky to-violet"
                          : "bg-gradient-to-t from-white/15 to-white/35"
                      }`}
                      style={{ height: `${Math.round(hRatio * 62)}px` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums text-ink">
                    {Math.round(h.temp)}°
                  </span>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* 7-day */}
      <div>
        <SectionHeading icon={<CalendarDays className="h-4 w-4" />}>7-day forecast · {weather.location.name}</SectionHeading>
        <GlassCard className="p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-7">
            {daily.map((d, i) => (
              <motion.div
                key={d.date}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="flex min-w-[104px] flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] lg:min-w-0"
              >
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-mist">
                  {d.label}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky/20 via-indigo/15 to-violet/20 text-ink ring-1 ring-white/10">
                  <ConditionIcon code={d.code} className="h-6 w-6" />
                </div>
                <span className="font-display text-lg font-semibold tabular-nums text-ink">
                  {Math.round(d.tMax)}°
                </span>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {Math.round(d.tMin)}° low
                </span>
                <span className="mt-1 rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-medium text-sky">
                  🌧 {Math.round(d.rainProb)}%
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}