# 🌤️ WeatherGPT

**Conversational AI for Weather Forecasting, Alerts & Climate Information**

A Streamlit-based prototype that answers three questions on the landing screen:

1. **What's happening now?** — live current conditions (Open-Meteo)
2. **What might happen next?** — 7-day forecast + IMD/NDMA-style alerts
3. **What should I do?** — AI-generated advisory via Groq

Plus a conversational chat (English + Hindi auto-detect) and a simulated
emergency broadcast system for disaster-warning demos.

---

## Quick start

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

> Weather data alone works without any API key. Only the AI advisory and
> chat features need `GROQ_API_KEY`.

---

## Project structure

```
weatherGPT1/
├── app.py                  # Main page: zones ①②③ + chat
├── config.py               # All constants (cities, thresholds, model, tokens)
├── requirements.txt
├── .env.example            # GROQ_API_KEY template
├── PRD.md                  # Product requirements document
├── techstack.md            # Technology stack decisions
├── utils/
│   ├── weather_api.py      # Open-Meteo client (geocoding, current, forecast)
│   ├── alerts.py           # Threshold engine + simulated broadcast
│   ├── grok_client.py      # Groq LLM (function calling, advisory, language)
│   ├── prompts.py          # Centralised prompts + tool schema
│   └── ui.py               # CSS tokens + HTML render helpers
└── pages/
    ├── 1_📍_Dashboard.py   # Data-dense dashboard with charts
    └── 2_💬_Chat.py        # Full-screen conversation
```

---

## Demo scenarios

| # | Do this | Expected |
|---|---|---|
| 1 | Open the app | Varanasi loads instantly — zones ①②③ render |
| 2 | Sidebar → search "Mumbai" | Current weather + 7-day forecast swap to Mumbai |
| 3 | Chat: "Weather in Delhi today" | Groq calls `get_weather` and answers from live data |
| 4 | Chat: "मुंबई का मौसम बताओ" | Hindi reply (language auto-detect) |
| 5 | Chat: "Will it rain this week?" | 7-day forecast with rainy days highlighted |
| 6 | Sidebar → 🚨 Send emergency broadcast | Toast + log entry shown (simulated SMS/email/push) |
| 7 | Dashboard page | Charts + detailed table + broadcast history |

---

## Data & privacy

- **Open-Meteo** — free, no API key, up to 10,000 calls/day (CC BY 4.0).
- **Groq** — your key is read from `.env` only, never committed.
- The emergency broadcast is **simulated** — no real messages are sent.

---

## Future path (post-MVP)

FastAPI backend, WIS2.0/MQTT ingestion, PostgreSQL/MongoDB, WebSockets,
Docker/K8s, voice I/O, more Indian languages. See `techstack.md` for details.