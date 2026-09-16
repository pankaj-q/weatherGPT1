# WeatherGPT — Technology Stack

## 1. Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend/UI** | Streamlit + custom CSS | Python-native, no build step, fastest to prototype |
| **Backend** | Python 3.10+ (FastAPI-ready structure) | Single language; easy FastAPI migration post-MVP |
| **LLM** | Groq (e.g. `qwen/qwen3.8-27b`) via OpenAI SDK | User-provided key; function calling; OpenAI-compatible base URL |
| **Weather data** | Open-Meteo Forecast + Geocoding API | Free, no auth required, global coverage, 16-day forecast, 10k calls/day |
| **State** | `st.session_state` (in-memory) | Zero-dependency persistence for demo |
| **Deployment** | Local (`streamlit run`) | Demo-first; Docker optional later |

---

## 2. Integration Details

### Groq

```
SDK:  openai Python package (base_url = https://api.groq.com/openai/v1)
Model: qwen/qwen3.8-27b (constant in config.py, swappable)
Auth:  GROQ_API_KEY in .env
Features used:
  - Chat completions (multi-turn)
  - Function calling (get_weather tool)
  - System + user message roles
```

### Open-Meteo

| Endpoint | Purpose |
|---|---|
| `https://api.open-meteo.com/v1/forecast` | Current conditions, hourly & daily forecasts |
| `https://geocoding-api.open-meteo.com/v1/search` | Free-text city → latitude/longitude |

No API key or signup required. CC BY 4.0 attribution required on public-facing UI.

---

## 3. Python Dependencies

```
requirements.txt
───────────────
streamlit>=1.40.0    # Web UI framework (brings pandas, altair)
openai>=1.50.0       # OpenAI-compatible Groq SDK
requests>=2.31.0     # HTTP client for Open-Meteo
python-dotenv>=1.0.0 # .env loading
```

No other dependencies are added.

---

## 4. Project Structure

```
weatherGPT1/
├── app.py                  # Main page: sidebar + zones ①②③ + chat
├── config.py               # All constants: cities, thresholds, model, tokens
├── requirements.txt
├── .env.example            # GROQ_API_KEY template
├── .gitignore
├── PRD.md                  # This file's companion
├── techstack.md            # ← you are here
├── utils/
│   ├── __init__.py
│   ├── weather_api.py      # Open-Meteo: geocoding, current, forecast
│   ├── alerts.py           # Threshold engine + simulated broadcast
│   ├── grok_client.py      # Groq: function calling, advisory, lang detection
│   ├── prompts.py          # Centralized system prompts + tool schema
│   └── ui.py               # CSS tokens + HTML render helpers
└── pages/
    ├── 1_📍_Dashboard.py   # Data-rich dashboard page
    └── 2_💬_Chat.py        # Dedicated chat page
```

**Module responsibilities** (strict separation):

| Module | Owns | Does NOT touch |
|---|---|---|
| `weather_api.py` | Open-Meteo HTTP calls, dataclasses | UI, LLM |
| `alerts.py` | Threshold checks, broadcast log objects | API calls, UI |
| `grok_client.py` | OpenAI SDK wrapper, tool execution | UI rendering |
| `prompts.py` | Prompt strings, tool JSON schema | Any logic |
| `ui.py` | CSS, HTML render functions | Business logic, API calls |
| `app.py` / `pages/` | Streamlit rendering, session wiring | Pure business logic |

---

## 5. Data Flow

```
User types query
      │
      ▼
┌─────────────────────────────────────┐
│  Streamlit (app.py / pages/)        │
│  - Renders sidebar, zones, chat     │
│  - Manages session_state            │
└───────────┬─────────────────────────┘
            │
   ┌────────┴────────┐
   ▼                 ▼
┌──────────┐   ┌──────────────────┐
│ Open-    │   │ Groq LLM         │
│ Meteo    │   │ (function calling)│
│ API      │   │ → get_weather()  │
└────┬─────┘   └────────┬─────────┘
     │                  │
     ▼                  ▼
weather_api.py   grok_client.py
parsing dict     formatting response
     │                  │
     └────────┬─────────┘
              ▼
        User sees response
```

---

## 6. Scalability Path (Post-MVP reference)

Not built in the MVP, but documented for the project deck:

| Layer | Post-MVP upgrade |
|---|---|
| Backend | FastAPI REST + WebSocket / MQTT ingestion (WIS2.0) |
| Database | PostgreSQL (caching, user sessions, broadcast history) |
| Cache | Redis |
| Auth | OAuth2 / JWT for user accounts |
| Deploy | Docker → Kubernetes with horizontal scaling |
| Multilingual | Google Translate API or NLLB for additional Indian languages |
| Voice | Web Speech API or Whisper for STT; LLM TTS for output |
| Real alerts | IMD SMS gateway / FCM push for genuine disaster warnings |

---

## 7. Environment Setup

```bash
# 1. Clone the repo
git clone <repo-url> && cd weatherGPT1

# 2. Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 3. Install dependencies
pip3 install -r requirements.txt

# 4. Configure API key
cp .env.example .env
# edit .env and add your GROQ_API_KEY

# 5. Run the app
python3 -m streamlit run app.py
```