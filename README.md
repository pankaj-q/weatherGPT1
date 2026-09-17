# 🌤️ WeatherGPT

**A weather app that doesn't just tell you the temperature — it tells you what to do.**

WeatherGPT is a weather assistant built for India. It shows live conditions,
a clear forecast, official-style weather warnings, and a short AI-written
advisory that explains what the weather means for your day — in **English,
Hindi, or Hinglish**.

> **Live demo:** https://weather-gpt-1-ruby.vercel.app

---

## What does it do?

Open the app and you immediately get answers to three simple questions:

| Question | What you see |
|---|---|
| **What's happening now?** | Today's temperature, how it feels, humidity, wind, rain and UV for your city |
| **What's coming next?** | An hour-by-hour view of the next 12 hours and a 7-day forecast |
| **What should I do?** | A short AI-written advisory with practical advice — carry an umbrella, avoid the afternoon sun, and so on |

There is also a **chat** where you can ask anything about the weather, in your
own words and your own language.

---

## Who is it for?

- **Everyday users** who want to know how the weather will affect their day.
- **Students and researchers** who need live weather data plus a natural-language explanation.
- **Anyone preparing for severe weather** who wants warnings in a format they can act on.

No sign-up, no downloads, no weather account required.

---

## Key features

- **Live weather data** — official open data, updated in real time.
- **IMD colour-coded warnings** — the same Yellow / Orange / Red system used by
  the India Meteorological Department, so the urgency is instantly clear.
- **AI advisory in your language** — English, Hindi, or Hinglish, with correct
  numbers and units (°C, km/h, %) and no confusing symbols.
- **Chat that understands India** — ask about Varanasi, Delhi, Mumbai, Chennai,
  Bengaluru or Lucknow, or search any other place.
- **Works everywhere** — a clean, fast layout for both phone and computer.
- **Emergency broadcast demo** — a simulated alert system that shows how
  warnings could be sent to the public by SMS, email or app notification.

---

## IMD colour codes explained

India's weather office uses four colours to describe danger. WeatherGPT shows
the same colours so you know how seriously to take a warning:

| Colour | Meaning | What to do |
|---|---|---|
| 🟢 **GREEN** | All clear | No action needed |
| 🟡 **YELLOW** | Be updated | Stay informed; weather may change |
| 🟠 **ORANGE** | Be prepared | Get ready for possible disruption |
| 🔴 **RED** | Take action | Dangerous conditions — act now |

Warnings are triggered automatically from the forecast — for example, extreme
heat, very heavy rain, strong winds, or high UV.

---

## Two versions in this project

The project includes two user interfaces that share the same live data and the
same AI:

| Version | Best for | Technology |
|---|---|---|
| **Streamlit app** (project root) | Quick local use, data dashboard and demos | Python + Streamlit |
| **Web app** (`/frontend`) | A polished, mobile-friendly public website | Next.js (React) + Framer Motion |

Both versions show the same three answers, warnings and AI advisory.

---

## Try it online

The web app is already deployed and free to use:

**https://weather-gpt-1-ruby.vercel.app**

Open it on your phone or laptop — no setup required.

---

## Run it on your computer

### Option 1 — Streamlit app

```bash
# 1. Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip3 install -r requirements.txt

# 3. Add your AI key (optional — weather works without it)
cp .env.example .env        # then edit .env and paste your GROQ_API_KEY

# 4. Start the app
python3 -m streamlit run app.py
```

Then open `http://localhost:8501`.

### Option 2 — Web app

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Add your AI key (optional — weather works without it)
cp ../.env .env.local       # then set GROQ_API_KEY inside .env.local

# 3. Start it
npm run dev
```

Then open `http://localhost:3000`.

> **Note:** Weather and forecast data work with **no key at all**. Only the AI
> advisory and chat need a free `GROQ_API_KEY`.

---

## How it works (in one picture)

```
        Live weather data (Open-Meteo, no key needed)
                          │
                          ▼
        Warnings engine  ──►  IMD colour rules (Green/Yellow/Orange/Red)
                          │
                          ▼
        AI assistant (Groq)  ──►  Plain-language advisory + chat
                          │
                          ▼
        Your screen  ──►  Streamlit app  OR  Web app
```

---

## Project structure

```
weatherGPT1/
├── app.py                  # Streamlit app — main screen
├── config.py               # Cities, warning thresholds and settings
├── utils/
│   ├── weather_api.py      # Fetches live weather data
│   ├── alerts.py           # Builds colour-coded warnings
│   ├── grok_client.py      # Talks to the AI
│   ├── prompts.py          # Instructions that make the AI answer well
│   └── ui.py               # Look and feel (colours, cards, banners)
├── pages/                  # Extra Streamlit pages (dashboard, full chat)
└── frontend/               # The web app (Next.js)
```

---

## Technology used

| Layer | Technology | Why |
|---|---|---|
| Weather data | Open-Meteo | Free, no key, accurate global coverage |
| AI | Groq (Qwen model) | Fast responses, good Hindi support |
| Streamlit app | Python + Streamlit | Quick to build and demo |
| Web app | Next.js + React + Tailwind | Fast, modern, mobile-friendly |
| Hosting | Vercel | One-click deployment for the web app |

---

## Data, privacy and honesty

- **Weather data** comes from Open-Meteo, a free public service (CC BY 4.0).
- **Your AI key is private** — it is stored in a local `.env` file and never shared.
- **Emergency broadcasts are simulated.** No real messages are sent.
- The AI is given the live weather numbers first, so its advice is based on real
  data — not guesswork.

---

## What's next

Planned improvements for the future:

- A proper API backend with real-time push alerts.
- More Indian languages.
- Voice input and spoken replies.
- Official government alert feeds (IMD / NDMA).
- Mobile app with background warnings.

---

## Credits

- Weather data: [Open-Meteo](https://open-meteo.com)
- AI: [Groq](https://groq.com)
- Warning colour convention: India Meteorological Department (IMD)
