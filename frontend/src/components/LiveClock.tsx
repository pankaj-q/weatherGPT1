
"use client";

import { useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";

/* Stable snapshot store.
   React requires `getSnapshot` to return a *cached* value: if it returns a fresh
   value on every read, React detects a change mid-render and re-renders in a
   loop, which crashes with "Maximum update depth exceeded" (the global error
   page). `Date.now()` changes every millisecond, and on slower devices renders
   straddle that boundary — so the tick is cached here and only updated once per
   second. */
let nowValue = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  nowValue = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (timer === null) timer = setInterval(tick, 1000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return nowValue;
}

function getServerSnapshot() {
  return 0;
}

export default function LiveClock({
  tz,
  utcOffsetSeconds,
  onRefresh,
  refreshing,
}: {
  tz: string;
  utcOffsetSeconds: number;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (now === 0) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm backdrop-blur-none lg:backdrop-blur-xl">
        <span className="h-2 w-2 rounded-full bg-fresh/40" />
        <span className="font-mono text-ink">--:--:--</span>
      </div>
    );
  }

  const local = new Date(now + utcOffsetSeconds * 1000);
  const time = local.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  const date = local.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm backdrop-blur-none lg:backdrop-blur-xl">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fresh opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-fresh" />
      </span>
      <div className="leading-tight">
        <span className="font-mono tabular-nums text-ink">{time}</span>
        <span className="ml-2 hidden text-xs text-faint sm:inline">{date}</span>
      </div>
      <span className="hidden text-xs text-faint lg:inline">{tz.replace("_", " ")}</span>
      <button
        onClick={onRefresh}
        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-mist transition hover:bg-white/5 hover:text-ink sm:h-7 sm:w-7"
        aria-label="Refresh weather"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.8} />
      </button>
    </div>
  );
}
