"use client";

import { useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}

function getNow() {
  return Date.now();
}

function getServerSnapshot() {
  return null;
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
  const now = useSyncExternalStore(subscribe, getNow, getServerSnapshot);
  const utc = now ?? 0;

  if (now === null) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm backdrop-blur-none lg:backdrop-blur-xl">
        <span className="h-2 w-2 rounded-full bg-fresh/40" />
        <span className="font-mono text-ink">--:--:--</span>
      </div>
    );
  }

  const local = new Date(utc + utcOffsetSeconds * 1000);
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