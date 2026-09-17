"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { AlertItem } from "@/lib/weather";
import { GlassCard, SectionHeading } from "./ui";

export default function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) {
    return (
      <GlassCard className="flex items-center gap-3 p-5">
        <ShieldCheck className="h-5 w-5 text-fresh" strokeWidth={1.8} />
        <div>
          <div className="text-sm font-semibold text-ink">No active alerts</div>
          <div className="text-xs text-faint">Conditions are within normal ranges for now.</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeading icon={<ShieldAlert className="h-4 w-4" />}>
        Advisory watch · {alerts.length} active
      </SectionHeading>
      {alerts.map((a, i) => {
        const warning = a.severity === "warning";
        return (
          <motion.div
            key={a.title + i}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
            className={`rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-xl ${
              warning ? "border-danger/30" : "border-amber/25"
            }`}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: warning ? "var(--color-danger)" : "var(--color-amber)",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-base leading-none">{warning ? "🔴" : "🟠"}</span>
              <div className="min-w-0">
                <div
                  className={`display font-semibold text-[13px] ${warning ? "text-[var(--color-warn-bold)]" : "text-[var(--color-watch-bold)]"}`}
                >
                  {a.title}
                  {a.day ? (
                    <span className="ml-2 text-[11px] font-normal text-faint">{a.day}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-mist">{a.message}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}