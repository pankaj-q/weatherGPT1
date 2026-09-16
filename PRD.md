# WeatherGPT — Product Requirements Document (MVP)

## 1. Overview

| Field | Detail |
|---|---|
| Product | **WeatherGPT** — Conversational AI platform for weather intelligence |
| Context | Prototype MVP for demo / Smart India Hackathon-style submission |
| Build window | 1–2 days |
| Target user | Farmers, disaster managers, researchers, local govt, general public |

---

## 2. Problem Statement

Weather data is distributed across bulletins, satellite products, portals, and
forecast systems (IMD, GFS, WRF, etc.), making it difficult for common users,
researchers, and disaster managers to extract actionable insights quickly.
WeatherGPT bridges this gap through a single conversational interface.

---

## 3. Objectives & Success Metrics

| Objective | How measured |
|---|---|
| Real-time weather info | Open-Meteo data loads on page open |
| Natural-language queries | Chat answers from live data via Groq function calling |
| Extreme-weather alerts | IMD-style thresholds trigger visible banners |
| AI advisory | Groq generates practical "what should I do?" bullets |
| Emergency broadcast | Simulated SMS / email / push log shown to user |
| Multilingual support | Auto-detect Hindi (Devanagari) and respond in Hindi |
| Clean, modular code | One-responsibility modules, type hints, no scattered logic |

---

## 4. Personas & Use Cases

| Persona | Primary use case |
|---|---|
| Farmer | Crop-weather advisory, heatwave/rain alerts, weekly forecast |
| Disaster manager | Real-time alerts, emergency broadcast simulation |
| Researcher | Data-rich dashboard with 7-day trends and charts |
| General public | Quick answers: "Will it rain in Lucknow tomorrow?" |
| Smart city ops | City-level monitoring dashboard |

---

## 5. Feature Requirements (MVP)

| ID | Feature | Priority |
|----|---------|----------|
| F-1 | Chat queries current weather + 7-day forecast | P0 |
| F-2 | Location search via free-text geocoding | P0 |
| F-3 | Preset Indian cities (Varanasi, Delhi, etc.) | P0 |
| F-4 | Auto language detection (English / Hindi) | P0 |
| F-5 | Dynamic weather alerts (heatwave, heavy rain, high wind, storm) | P0 |
| F-6 | AI advisory ("What should I do?") via Groq | P0 |
| F-7 | Simulated emergency broadcast (SMS/email/push log) | P0 |
| F-8 | Dashboard page with charts and alert table | P1 |
| F-9 | Dedicated full-screen chat page | P1 |
| F-10 | 24h hourly temperature chart | P1 |

---

## 6. User Flows

```
1. App opens → Varanasi loads by default → zones ①②③ render
2. User selects/types a city → weather + advisory refresh
3. User asks weather question (EN or Hindi) → Groq answers via chat
4. Threshold crossed → alert banner appears in zones ② and sidebar
5. User clicks 🚨 Emergency Broadcast → log entry created + toast shown
6. User visits Dashboard page → charts + detailed table
```

---

## 7. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Code quality | Type hints, docstrings, no magic numbers, constants in `config.py` |
| API key security | `.env` file, never committed, `.env.example` ships |
| Error handling | Friendly messages for invalid cities, API failures |
| Latency target | <5s chat round-trip; advisory non-blocking with skeleton UI |
| Rate limits | 15-min cache on weather data, 10k/day Open-Meteo free tier |
| Internet failure | Graceful error messages; pre-cached Varanasi data for demo |

---

## 8. Out of Scope (MVP)

- Voice input / TTS
- Real WIS2.0 / MQTT ingestion
- User authentication or multi-tenancy
- Database persistence (uses `st.session_state` only)
- Mobile app (Streamlit web only)
- Docker / Kubernetes deployment
- Multilingual beyond English + Hindi

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Groq API outage | Friendly error; weather data still loads |
| Open-Meteo rate limit | 15-min in-memory cache reduces calls |
| No internet at demo venue | Pre-fetch Varanasi data on first run; cache persists in session |
| Model name changes | `MODEL` is a single constant in `config.py`; one-line change |

---

## 10. Success Criteria for Demo

Seven scripted scenarios must pass:

1. Varanasi weather loads instantly on open
2. "Weather in Mumbai today" → current conditions returned via chat
3. "मुंबई का मौसम बताओ" → Hindi response
4. "Will it rain this week in Chennai?" → 7-day forecast with rainy days highlighted
5. Heat threshold crossed → amber/red alert banner appears
6. Click 🚨 Broadcast → log with timestamp, channels, subscriber count shown
7. Switch to Dashboard page → charts and detailed table render correctly