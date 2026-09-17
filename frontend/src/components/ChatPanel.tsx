"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, SendHorizonal, Languages } from "lucide-react";
import { QUICK_PROMPTS } from "@/lib/constants";
import {
  callAi,
  detectLanguage,
  type AiMessage,
  type LocationMeta,
  type WeatherPayload,
} from "@/lib/weather";
import { GlassCard, SectionHeading } from "./ui";
import FormatText from "./FormatText";

function Bubble({ msg }: { msg: AiMessage }) {
  const user = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`wg-msg flex ${user ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[82%] rounded-3xl px-4 py-3 text-[14px] leading-relaxed sm:max-w-[72%] ${
          user
            ? "rounded-br-md bg-gradient-to-br from-sky to-indigo text-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.7)]"
            : "glass rounded-bl-md rounded-3xl text-ink/90"
        }`}
      >
        {user ? msg.content : <FormatText text={msg.content} />}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="glass flex items-center gap-1.5 rounded-3xl rounded-bl-md px-4 py-3.5" style={{ width: "fit-content" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-mist"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export default function ChatPanel({
  weather,
  location,
}: {
  weather: WeatherPayload;
  location: LocationMeta;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"English" | "Hindi">("English");

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setLang(detectLanguage(content));
    const userMsg: AiMessage = { role: "user", content };
    const history: AiMessage[] = [...messages, userMsg];
    setMessages(history);
    setBusy(true);
    try {
      const res = await callAi(
        location,
        weather,
        { kind: "chat", messages: history },
        detectLanguage(content),
      );
      setMessages((prev) => [...prev, { role: "assistant", content: res.text }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading icon={<MessageSquare className="h-4 w-4" />}>
          Ask WeatherGPT
        </SectionHeading>
        <div className="flex items-center gap-2 text-[11px] text-faint">
          <Languages className="h-3.5 w-3.5" />
          Detected: {lang} {lang === "Hindi" ? "🇮🇳" : "🇬🇧"}
        </div>
      </div>

      <GlassCard className="flex flex-col p-6">
        <div className="flex min-h-[180px] flex-1 flex-col gap-3">
          {messages.length === 0 && !busy ? (
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] text-mist transition hover:border-sky/40 hover:text-ink"
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {busy && <TypingDots />}
            </>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any place… English or Hindi"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink outline-none transition placeholder:text-faint/70 focus:border-sky/50 focus:ring-2 focus:ring-sky/20"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky to-indigo text-white shadow-[0_8px_24px_-10px_rgba(56,189,248,0.8)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <SendHorizonal className="h-4.5 w-4.5" />
          </button>
        </form>
      </GlassCard>
    </section>
  );
}