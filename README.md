# 🌤️ WeatherGPT — Conversational Weather Intelligence for India

**Live weather, IMD colour-coded warnings, and an AI assistant that answers in
English, Hindi, or Hinglish.**

WeatherGPT answers three questions on every screen:

1. **What's happening now?** — live current conditions (Open-Meteo)
2. **What might happen next?** — 12-hour + 7-day forecast with IMD/NDMA-style,
   colour-coded warnings
3. **What should I do?** — AI-generated advisory via Groq (English or Hindi)

The project ships **two UIs** that share the same data source and LLM:

| App | Stack | URL |
|---|---|---|
| **Streamlit app** (root) | Python + Streamlit | `http://localhost:8501` |
| **Premium web UI** (`/frontend`) | Next.js + Framer Motion | `http://localhost:3000` |

---

## Highlights

- **Live data** straight from Open-Meteo — no weather API key required.
- **IMD colour-warning system** — YELLOW · Be updated / ORANGE · Be prepared /
  RED · Take action, plus GREEN when all clear (aligned with IMD conventions).
- **AI advisor & chat (Groq)** — auto-detects Hindi vs English; answers in
  clean Devanagari Hindi, English, or Hinglish with no markdown noise, correct
  numbers, and exact °C/km/h/% units.
- **Preset cities** that load instantly: Varanasi, Delhi, Mumbai, Chennai,
  Bengaluru, Lucknow (plus free-text geocoding for anywhere).
- **Emergency broadcast simulator** (Streamlit) — simulated SMS/email/push
  alerts for disaster-warning demos.
- **Dark aurora / glassmorphism design** (frontend) with Sora + Inter
  typography and Framer Motion animations.

---

## Quick start — Streamlit app

```bash
# 1. Create the virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip3 install -r requirements.txt

# 3. Configure your Groq API key
cp .env.example .env       # then edit .env and paste your GROQ_API_KEY

# 4. Run the app
python3 -m streamlit run app.py
```

Open `http://localhost:8501` in your browser.

## Quick start — Premium web UI

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Point to the same Groq key (kept server-side, never sent to the browser)
cp ../.env .env.local
echo "GROQ_MODEL=qwen/qwen3.8-27b" >> .env.local

# 3. Run (dev) or build + serve (prod)
npm run dev                 # http://localhost:3000
npm run build && npm start  # production
```

> Weather data works with **no API key**. Only the AI advisory and chat
> features need `GROQ_API_KEY`. The model defaults to `qwen/qwen3.8-27b`
> (settable with `GROQ_MODEL` in `frontend/.env.local`).

---

## IMD warning colours

Weather alerts use the India Meteorological Department colour convention:

| Colour | Action | Trigger (examples) |
|---|---|---|
| 🟡 **YELLOW** | Be updated — stay informed | Max ≥ 40°C, rain ≥ 15 mm, wind ≥ 60 km/h, UV ≥ 9 |
| 🟠 **ORANGE** | Be prepared for possible impact | Max ≥ 43°C, rain ≥ 30 mm, wind ≥ 90 km/h |
| 🔴 **RED** | Take action — act now | Max ≥ 45°C, rain ≥ 50 mm, wind ≥ 110 km/h |

Neither app sends real notifications — alerts are shown in-app only.

---

## Project structure

```
weatherGPT1/
├── app.py                  # Streamlit main page: zones ①②③ + chat
├── config.py               # Constants (cities, thresholds, model, tokens)
├── requirements.txt
├── .env.example            # GROQ_API_KEY template
├── PRD.md                  # Product requirements document
├── techstack.md            # Technology stack decisions
├── utils/
│   ├── weather_api.py      # Open-Meteo client (geocoding, current, forecast)
│   ├── alerts.py           # IMD threshold engine + simulated broadcast
│   ├── grok_client.py      # Groq LLM (function calling, advisory, language)
│   ├── prompts.py          # Centralised prompts + tool schema
│   └── ui.py               # CSS tokens (light/dark) + HTML render helpers
├── pages/
│   ├── 1_📍_Dashboard.py   # Data-dense dashboard with charts
│   └── 2_💬_Chat.py        # Full-screen conversation
└── frontend/               # Premium Next.js web UI (see its README)
```

### Frontend (Next.js)

```
frontend/
├── src/app/
│   ├── layout.tsx          # Fonts (Sora, Inter), metadata
│   ├── page.tsx            # Main dashboard: hero, forecast, alerts, AI & chat
│   ├── globals.css         # @theme tokens, aurora/glass/shimmer styles
│   └── api/
│       ├── weather/        # Open-Meteo proxy (current + 12h + 7-day + alerts)
│       ├── geocode/        # city search (presets + Open-Meteo geocoding)
│       └── ai/             # Groq proxy — advisory + chat (autodetect language)
├── src/components/         # AuroraBackground, CurrentHero, ForecastStrip,
│                           # AlertPanel (IMD), AdvisoryPanel, ChatPanel,
│                           # Sidebar, LiveClock, ConditionIcon, CountUp,
│                           # FormatText (clean answer renderer), ui
└── src/lib/
    ├── ai.ts               # prompts + Groq call (server-only)
    ├── constants.ts        # presets, thresholds, model, quick prompts
    ├── conditions.ts       # WMO weather-code → label/icon mapping
    └── weather.ts          # types, IMD alerts, client fetchers
```

---

## Demo scenarios

### Streamlit app

| # | Do this | Expected |
|---|---|---|
| 1 | Open the app | Varanasi loads instantly — zones ①②③ render |
| 2 | Sidebar → search "Mumbai" | Current + 7-day forecast swap to Mumbai |
| 3 | Chat: "Weather in Delhi today" | Groq calls `get_weather` and answers from live data |
| 4 | Chat: "मुंबई का मौसम बताओ" | Hindi reply (Devanagari, clean formatting) |
| 5 | Chat: "Will it rain this week?" | 7-day forecast with rainy days highlighted |
| 6 | Sidebar → 🚨 Send emergency broadcast | Toast + log entry (simulated SMS/email/push) |
| 7 | Dashboard page | Charts + detailed table + broadcast history |

### Premium web UI

| # | Do this | Expected |
|---|---|---|
| 1 | Open `http://localhost:3000` | Varanasi loads live with aurora/glass UI |
| 2 | Pick a quick city or search | Hero, 12-hour + 7-day forecast, alerts update |
| 3 | Watch the advisor | AI advisory auto-generates (English ↔ Hindi) |
| 4 | Chat: "कल का मौसम बताओ" | Clean Devanagari answer with °C/km/h/% |
| 5 | Ask about Mumbai while on Varanasi | Honest reply naming the preset cities |
| 6 | Shrink the window | Mobile layout with slide-in sidebar drawer |

---

## Data & privacy

- **Open-Meteo** — free, no API key, up to 10,000 calls/day (CC BY 4.0).
- **Groq** — your key is read from `.env` / `frontend/.env.local` only and is
  **never committed** (both are gitignored). In the web UI the key stays
  server-side inside the `/api/ai` route.
- The emergency broadcast is **simulated** — no real messages are sent.

---

## Future path (post-MVP)

FastAPI backend, WIS2.0/MQTT ingestion, PostgreSQL/MongoDB, WebSockets,
Docker/K8s, voice I/O, more Indian languages. See `techstack.md` for details.