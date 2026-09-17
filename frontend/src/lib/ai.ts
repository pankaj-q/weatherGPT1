import "server-only";

import { GROQ_BASE_URL, GROQ_MODEL, PRESET_CITIES } from "./constants";
import { weatherContext, type AiAction, type LocationMeta, type WeatherPayload } from "./weather";

const PRESET_NAMES = PRESET_CITIES.map((c) => c.name).join(", ");

type ChatMessage = { role: string; content: string };

function languageRules(lang: string): string {
  if (lang === "Hindi") {
    return (
      "LANGUAGE: Reply entirely in clean, correct Devanagari Hindi (मौसम, तापमान, बारिश, " +
      "सलाह). Write simple Hindi with no spelling or grammar mistakes. Keep numbers and units " +
      "(°C, km/h, %) as symbols. You may keep a common English word only where Hindi speakers " +
      "naturally use it (like 'temperature'); never switch to English sentences."
    );
  }
  return (
    "LANGUAGE: Match the user's style — either proper English or Hinglish (Roman-script Hindi " +
    "such as 'kal ka mausam kaisa rahega'). Write correct words with no spelling or grammar " +
    "mistakes. Never mix unrelated languages inside one sentence."
  );
}

const SHARED_RULES = `4. FORMAT: Use short paragraphs or bullet lines. Start each bullet with a fitting emoji.
   Plain text only — NO Markdown symbols (*, **, #, backticks), NO JSON, NO numbered lists with
   "1." — use "- " or "• " for bullets. Use real symbols: °C, km/h, %, mm.
5. If any IMD alert is present in the data, open your answer with the alert level and the single
   most important action, e.g. "IMD ★ RED — धूप में मत निकलें" or "IMD Orange — be prepared".
6. Reproduce numbers exactly as given — do not invent or round rain or temperature values.
7. Be concise and accurate. If anything in the data is missing, say so honestly.`;

function buildChatSystem(city: string, lang: string): string {
  return `You are WeatherGPT, a trusted multilingual weather assistant for India.

The live weather below is ONLY for ${city}.

1. Always answer about ${city} and use ONLY the data provided. Never invent numbers.
2. If the user asks about a place outside the presets (${PRESET_NAMES}), tell them briefly that
   live data is currently available for ${city}, and summarise ${city}'s weather instead.
3. ${languageRules(lang)}
${SHARED_RULES}
8. Keep answers to 3-6 short points so farmers and rural users can scan them quickly.`;
}

function buildAdvisorySystem(city: string, lang: string): string {
  return `You are WeatherGPT Advisor. Using the live data below for ${city}, write a short advisory answering: "What should I do today?"

Write 3-5 bullet lines, each starting with an emoji. Start with the highest-priority safety step
(heat, rain, or wind). Keep every bullet short, practical and action-oriented.

1. ${languageRules(lang)}
${SHARED_RULES}`;
}

function buildMessages(action: AiAction, city: string, lang: string, context: string): ChatMessage[] {
  if (action.kind === "advisory") {
    return [
      {
        role: "system",
        content: `${buildAdvisorySystem(city, lang)}\n\n=== LIVE WEATHER DATA (${city}) ===\n${context}`,
      },
      { role: "user", content: "What should I do today?" },
    ];
  }

  const history: ChatMessage[] = action.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  return [
    {
      role: "system",
      content: `${buildChatSystem(city, lang)}\n\n=== LIVE WEATHER DATA (${city}) ===\n${context}`,
    },
    ...history,
  ];
}

export interface GroqInput {
  action: AiAction;
  location: LocationMeta;
  weather: WeatherPayload;
  lang: "English" | "Hindi";
}

export async function runAi(input: GroqInput): Promise<{ text: string; lang: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set. Add it to frontend/.env.local to enable the AI assistant.");
  }

  const lang = input.lang === "Hindi" ? "Hindi" : "English";
  const context = weatherContext(input.location, input.weather);
  const messages = buildMessages(input.action, input.location.name, lang, context);
  const text = await callGroq(messages);
  return { text, lang };
}

async function callGroq(messages: ChatMessage[]): Promise<string> {
  const key = process.env.GROQ_API_KEY as string;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || GROQ_MODEL,
          messages,
          temperature: 0.6,
          max_tokens: 700,
        }),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`AI provider error (${res.status}): ${detail.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content ?? "";
      if (!raw) throw new Error("Empty response from AI model");
      return cleanModelText(raw);
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/* Strip accidental model artefacts while keeping emoji + bullet characters. */
function cleanModelText(raw: string): string {
  let t = raw
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n");

  /* If the model stubbornly wrapped the whole reply as a JSON object, unwrap it. */
  const trimmed = t.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const value = JSON.parse(trimmed);
      if (value && typeof value.text === "string") {
        t = value.text;
      } else if (Array.isArray(value?.points)) {
        t = (value.points as unknown[])
          .filter((p): p is string => typeof p === "string")
          .map((p) => `- ${p}`)
          .join("\n");
      }
    } catch {
      /* not JSON — keep as-is */
    }
  }

  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}