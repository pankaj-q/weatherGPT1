"use client";

import { Languages, RefreshCw, Sparkles } from "lucide-react";
import { GROQ_MODEL } from "@/lib/constants";
import type { LocationMeta } from "@/lib/weather";
import { GlassCard, SectionHeading, Spinner } from "./ui";
import FormatText from "./FormatText";

export default function AdvisoryPanel({
  location,
  advisory,
  loading,
  error,
  lang,
  onLanguage,
  onGenerate,
}: {
  location: LocationMeta;
  advisory: string | null;
  loading: boolean;
  error: string | null;
  lang: "English" | "Hindi";
  onLanguage: (lang: "English" | "Hindi") => void;
  onGenerate: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading icon={<Sparkles className="h-4 w-4" />}>
          What should I do?
        </SectionHeading>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
          <Languages className="ml-2 h-3.5 w-3.5 text-faint" />
          {(["English", "Hindi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLanguage(l)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                lang === l ? "bg-gradient-to-r from-sky to-indigo text-white" : "text-mist hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <GlassCard className="p-7">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-4 rounded-full" style={{ width: `${95 - i * 17}%` }} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-faint">
            <Spinner className="h-3.5 w-3.5" />
            Generating advisory with {GROQ_MODEL}…
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard className="border-l-4 border-l-amber p-6">
          <div className="text-sm text-mist">{error}</div>
          <button
            onClick={onGenerate}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-ink transition hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </GlassCard>
      ) : advisory ? (
        <GlassCard className="relative overflow-hidden p-7">
          <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.20),transparent_70%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo">
              <Sparkles className="h-3.5 w-3.5" />
              AI Advisory · {location.name}
            </div>
            <div className="mt-4 text-[14px] text-ink/90">
              <FormatText text={advisory} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
              <span className="text-[11px] text-faint">
                {location.name} · {lang} · {GROQ_MODEL}
              </span>
              <button
                onClick={onGenerate}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-mist transition hover:text-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </section>
  );
}