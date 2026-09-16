"""Central configuration and design tokens for WeatherGPT."""

# --- Default location (demo boots straight into Varanasi) ---
DEFAULT_CITY = "Varanasi"
DEFAULT_LAT = 25.3176
DEFAULT_LON = 82.9739
DEFAULT_TIMEZONE = "Asia/Kolkata"

PRESET_CITIES = [
    {"name": "Varanasi", "lat": 25.3176, "lon": 82.9739},
    {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    {"name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
]

# --- Groq (OpenAI-compatible) ---
# NB: must support function/tool calling (see grok_client.chat). Verified
# working models: qwen/qwen3.8-27b, openai/gpt-oss-20b, openai/gpt-oss-120b.
MODEL = "qwen/qwen3.8-27b"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_TIMEOUT_SECONDS = 45

# --- Open-Meteo ---
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

# --- Weather alert thresholds (NDMA/IMD-inspired) ---
HEATWAVE_TEMP_C = 40.0
HEAVY_RAIN_MM = 15.0
HIGH_WIND_KMH = 60.0
STORM_HUMIDITY_PCT = 90.0
HIGH_UV_INDEX = 9.0

# --- App behaviour ---
DATA_MAX_AGE_SECONDS = 900     # refresh live weather after 15 min
CHAT_CONTEXT_MESSAGES = 12     # conversation history depth for the LLM

# --- Demo presets ---
QUICK_PROMPTS = [
    "📅 7-day forecast",
    "🌧️ Will it rain this week?",
    "🔥 Hottest day?",
    "कल का मौसम बताओ",  # "Tell me tomorrow's weather"
    "What should I carry tomorrow?",
]
SIMULATED_SUBSCRIBERS = 2438  # displayed in the (simulated) broadcast