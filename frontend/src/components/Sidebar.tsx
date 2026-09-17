"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CloudSun,
  MapPin,
  RadioTower,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { PRESET_CITIES } from "@/lib/constants";
import { geocode, type LocationMeta } from "@/lib/weather";
import { Spinner } from "./ui";

export interface BroadcastEntry {
  time: string;
  title: string;
  channels: string;
  count: number;
}

export default function Sidebar({
  open,
  onClose,
  location,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  location: LocationMeta;
  onSelect: (loc: LocationMeta) => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searching) return;
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) return;
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await geocode(query);
        if (found) onSelect(found);
      } catch {
        /* keep current selection */
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sendBroadcast = () => {
    const entry: BroadcastEntry = {
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      title: "Emergency weather bulletin",
      channels: "SMS · Email · Push",
      count: 2438,
    };
    setBroadcasts((prev) => [entry, ...prev]);
    setToast(`Broadcast sent to ${entry.count.toLocaleString()} subscribers via ${entry.channels}`);
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <>
      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-[300px] p-3 lg:hidden"
          >
            <SidebarBody location={location} onSelect={onSelect} query={query} setQuery={setQuery} searching={searching} broadcasts={broadcasts} onBroadcast={sendBroadcast} onClose={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 p-4 lg:block">
        <div className="glass-strong flex h-full flex-col rounded-3xl p-6">
          <SidebarBody location={location} onSelect={onSelect} query={query} setQuery={setQuery} searching={searching} broadcasts={broadcasts} onBroadcast={sendBroadcast} />
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="glass-strong fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl px-5 py-3.5 text-sm text-ink"
          >
            🚨 {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarBody({
  onClose,
  onSelect,
  query,
  setQuery,
  searching,
  broadcasts,
  onBroadcast,
  location,
}: {
  onClose?: () => void;
  onSelect: (loc: LocationMeta) => void;
  query: string;
  setQuery: (q: string) => void;
  searching: boolean;
  broadcasts: BroadcastEntry[];
  onBroadcast: () => void;
  location: LocationMeta;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky via-indigo to-violet shadow-[0_0_30px_-6px_rgba(56,189,248,0.7)]">
            <CloudSun className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-display text-[17px] font-semibold tracking-tight text-ink">
              Weather<span className="text-sky">GPT</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint">for India</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full p-2 text-mist hover:bg-white/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mt-7">
        <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Search location
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Shimla, Dehradun…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-9 text-sm text-ink outline-none transition placeholder:text-faint/70 focus:border-sky/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-sky/20"
          />
          {searching && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {/* Preset cities */}
      <div className="mt-5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Quick cities
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PRESET_CITIES.map((c) => {
            const active = location.name === c.name;
            return (
              <button
                key={c.name}
                onClick={() => onSelect({ name: c.name, lat: c.lat, lon: c.lon, country: "India", label: `${c.name}, India` })}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] transition ${
                  active
                    ? "border-sky/40 bg-sky/10 text-ink"
                    : "border-white/8 bg-white/[0.03] text-mist hover:border-white/20 hover:text-ink"
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${active ? "text-sky" : "text-faint"}`} />
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current location pill */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[13px] text-mist">
        <Sparkles className="h-3.5 w-3.5 text-indigo" />
        <span className="truncate">{location.label}</span>
      </div>

      <div className="mt-auto space-y-4 pt-8">
        {/* Emergency broadcast */}
        <button
          onClick={onBroadcast}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500/90 to-red-500/90 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(244,63,94,0.8)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <RadioTower className="h-4 w-4" />
          Emergency broadcast
        </button>

        {broadcasts.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              Broadcast log
            </div>
            {broadcasts.slice(0, 4).map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[12px] leading-relaxed"
              >
                <div className="font-medium text-ink">🚨 {b.title}</div>
                <div className="text-faint">
                  {b.time} · {b.channels} · {b.count.toLocaleString()} subs
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="border-t border-white/8 pt-4">
          <div className="flex items-center gap-1.5 text-[10px] text-faint">
            <Sparkles className="h-3 w-3 text-sky" />
            Live data: Open-Meteo · AI: Groq
          </div>
          <div className="mt-1 text-[10px] text-faint/60">EN 🇬🇧 · HI 🇮🇳 auto-detect</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-faint">
          <Sparkles className="h-3 w-3 text-violet" />
          Simulated alerts — no real messages sent
        </div>
      </div>
    </>
  );
}