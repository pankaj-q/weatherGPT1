import { NextRequest, NextResponse } from "next/server";
import { GROQ_BASE_URL, GROQ_MODEL } from "../../../lib/constants";
import type { AiMessage, LocationMeta, WeatherPayload } from "../../../lib/weather";
import { weatherContext } from "../../../lib/weather";

export const dynamic = "force-dynamic";

const CHAT_SYSTEM = `You are WeatherGPT, a trusted multilingual weather assistant for India.

Rules
1. ALWAYS reply in the same language the user writes in (English or Hindi).
2. Use ONLY the live weather data provided below. Never make up data.
3. Format answers with short, practical bullet points. Prefix each with an emoji. Farmers and rural users should be able to scan them quickly.
4. Flag dangerous conditions (heatwave, heavy rain, high wind, storm) with a clearly visible warning.
5. Be concise. If the data is missing, say so honestly.
6. Never output raw JSON. Rephrase everything into a natural, human answer.`;

function advisorySystem(city: string, lang: string): string {
  return `You are WeatherGPT Advisor. Using the live weather data provided below for ${city}, write a short advisory answering the question: "What should I do?"

Return 3-5 bullet points. Each bullet:
- starts with a fitting emoji
- is short, practical, and action-oriented
- prioritises safety (heat, rain, wind)
- is written in ${lang}

Do NOT invent data; only use what is given.`;
}

interface AiBody {
  location: LocationMeta;
  weather: WeatherPayload;
  lang: string;
  action: { kind: "advisory" } | { kind: "chat"; messages: AiMessage[] };
}

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set. Add it to frontend/.env.local to enable the AI assistant." },
      { status: 501 },
    );
  }

  let body: AiBody;
  try {
    body = (await req.json()) as AiBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lang = body.lang === "Hindi" ? "Hindi" : "English";
  const context = weatherContext(body.location, body.weather);

  let messages: { role: string; content: string }[];
  if (body.action.kind === "advisory") {
    messages = [
      {
        role: "system",
        content:
          advisorySystem(body.location.name, lang) + "\n\n=== LIVE WEATHER DATA ===\n" + context,
      },
      {
        role: "user",
        content: "What should I do?",
      },
    ];
  } else {
    const history: { role: string; content: string }[] = body.action.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
    messages = [
      {
        role: "system",
        content: CHAT_SYSTEM + "\n\n=== LIVE WEATHER DATA ===\n" + context,
      },
      ...history,
    ];
  }

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
        temperature: 0.7,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `AI provider error (${res.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("Empty response from AI model");
    }

    return NextResponse.json({ text, lang });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 502 });
  }
}