# WeatherGPT — Premium Web UI

A self-contained demo UI for **WeatherGPT** — live weather, IMD colour-coded
warnings, and an AI advisor/chat in clean English, Hindi, or Hinglish. Built
with a dark aurora + glassmorphism design system and polished motion.

![stack](https://img.shields.io/badge/Next.js-16-black)
![stack](https://img.shields.io/badge/React-19-blue)
![stack](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![stack](https://img.shields.io/badge/Framer%20Motion-13-818cf8)

## Features

- **Live conditions + 12-hour & 7-day forecast** — proxied from Open-Meteo with
  retries and an IPv4-safe fallback (handles NAT64 networks).
- **IMD weather warnings** — colour-coded panels: YELLOW · Be updated,
  ORANGE · Be prepared, RED · Take action; GREEN when all clear.
- **AI advisory** — auto-generated "What should I do?" card (English ↔ Hindi
  toggle) powered by Groq.
- **Bilingual chat** — answers in the same language you type (Hindi auto-detect),
  with clean formatting and honest replies about the preset cities.
- **Preset cities** — Varanasi, Delhi, Mumbai, Chennai, Bengaluru, Lucknow, plus
  free-text search with geocoding.
- **Live local clock** — per-city time in the header, updates every second.
- **Fully responsive** — mobile header with slide-in sidebar drawer.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Framer Motion 13 · lucide-react · `server-only` (keys stay on the server).
Fonts: **Sora** (display) + **Inter** (body) via `next/font/google`.

## Getting started

```bash
npm install

# AI features need a Groq key — kept server-side, never sent to the browser.
# If a root ../.env exists, reuse it:
cp ../.env .env.local
echo "GROQ_MODEL=qwen/qwen3.8-27b" >> .env.local
```

`.env.local` variables:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | Yes (for AI) | — | Server-side key for Groq (`/api/ai`) |
| `GROQ_MODEL` | No | `qwen/qwen3.8-27b` | Groq chat-completions model |

Weather and geocoding work with **no key**.

### Scripts

```bash
npm run dev         # http://localhost:3000 (hot reload)
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint
```

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/weather` | GET | `lat`, `lon` (+ `name`, `country`, `admin1`) → current + hourly + 7-day + computed IMD alerts |
| `/api/geocode` | GET | `q` → first preset-city match, else Open-Meteo geocoding (falls back to Varanasi) |
| `/api/ai` | POST | `{ location, weather, lang, action }` → Groq advisory (`kind: "advisory"`) or chat (`kind: "chat"` + message history) |

The AI endpoint builds a compact, unit-correct weather context, injects preset
and language rules, and strips stray model artefacts before responding.

## Project structure

```
src/
├── app/
│   ├── layout.tsx        # Sora + Inter fonts, metadata
│   ├── page.tsx          # state, auto-advisory, desktop + mobile layout
│   ├── globals.css       # @theme tokens, aurora/glass/shimmer animation
│   └── api/
│       ├── weather/      # Open-Meteo proxy (+ IPv4 fallback)
│       ├── geocode/      # preset + Open-Meteo geocoding
│       └── ai/           # Groq proxy
├── components/
│   ├── AdvisoryPanel.tsx  # AI "What should I do?" card, EN/HI toggle
│   ├── AlertPanel.tsx     # IMD colour-coded warning cards
│   ├── AuroraBackground.tsx
│   ├── ChatPanel.tsx      # bilingual chat with quick prompts
│   ├── ConditionIcon.tsx  # WMO-code → animated icon
│   ├── CountUp.tsx        # animated numeric counter
│   ├── CurrentHero.tsx    # big live temp + 6 metrics
│   ├── ForecastStrip.tsx  # 12-hour bars + 7-day cards
│   ├── FormatText.tsx     # clean answer renderer (bullets, headings, bold)
│   ├── LiveClock.tsx      # per-city live clock (hydration-safe)
│   ├── Sidebar.tsx        # search, presets, simulated emergency broadcast
│   └── ui.tsx             # GlassCard, SectionHeading, Spinner
└── lib/
    ├── ai.ts             # prompts + Groq call (server-only)
    ├── constants.ts      # presets, thresholds, model, quick prompts
    ├── conditions.ts     # WMO codes → labels/icons
    └── weather.ts        # types, IMD alert engine, client fetchers
```

## Design notes

- **Palette** — `@theme` tokens in `globals.css`: deep `void`/`abyss` surfaces,
  sky–indigo–violet gradient accents, fresh green for good conditions, and
  amber/orange/red reserved **only** for IMD Yellow/Orange/Red alerts.
- **Surfaces** — `.glass` / `.glass-strong` use `@apply backdrop-blur-*` so the
  frosted effect is emitted correctly by the compiler.
- **Motion** — Framer Motion staggers sections in; `LiveClock` and numeric
  values animate without hydration errors.

## Deployment

Any Next.js host works (e.g. Vercel):

```bash
npm run build
```

Set `GROQ_API_KEY` (and optionally `GROQ_MODEL`) as environment variables on
the host — the `/api/*` routes are `force-dynamic`, so no static export build
config is needed.