"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { IMD_LEVELS, type AlertItem } from "@/lib/weather";
import { GlassCard, SectionHeading } from "./ui";

const CARD = {
  red: { border: "border-danger/30", left: "var(--color-danger)", pill: "bg-danger/15 text-danger", bar: "from-danger/60" },
  orange: { border: "border-orange/30", left: "var(--color-orange)", pill: "bg-orange/15 text-orange", bar: "from-orange/60" },
  yellow: { border: "border-amber/30", left: "var(--color-amber)", pill: "bg-amber/15 text-amber", bar: "from-amber/60" },
} as const;

function SeverityPill({ severity }: { severity: AlertItem["severity"] }) {
  const meta = IMD_LEVELS[severity];
  const style = CARD[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.pill}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.code} · {meta.label}
    </span>
  );
}

export default function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) {
    return (
      <GlassCard className="flex items-center gap-3 p-5">
        <ShieldCheck className="h-5 w-5 text-fresh" strokeWidth={1.8} />
        <div>
          <div className="text-sm font-semibold text-ink">No active alerts · IMD GREEN</div>
          <div className="text-xs text-faint">Conditions are within normal ranges for now.</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeading icon={<ShieldAlert className="h-4 w-4" />}>
        IMD weather warnings · {alerts.length} active
      </SectionHeading>
      {alerts.map((a, i) => {
        const style = CARD[a.severity];
        return (
          <motion.div
            key={a.title + i}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
            className={`rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-xl ${style.border}`}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: style.left,
            }}
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 text-base leading-none">
                {a.severity === "red" ? "🚨" : a.severity === "orange" ? "⚠️" : "☀️"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                  <SeverityPill severity={a.severity} />
                  {a.day ? (
                    <span className="text-[11px] text-faint">
                      {new Date(`${a.day}T00:00:00Z`).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-mist">{a.message}</p>
                <div className={`mt-3 h-1 w-full max-w-[120px] rounded-full bg-gradient-to-r to-transparent ${style.bar}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}