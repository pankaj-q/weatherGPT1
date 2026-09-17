export const APP_NAME = "WeatherGPT";
export const APP_TAGLINE = "Conversational weather intelligence for India";

export const DEFAULT_CITY = "Varanasi";
export const DEFAULT_LAT = 25.3176;
export const DEFAULT_LON = 82.9739;

export const PRESET_CITIES = [
  { name: "Varanasi", lat: 25.3176, lon: 82.9739 },
  { name: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
] as const;

/* IMD / NDMA-inspired alert thresholds (mirror of config.py) */
export const THRESHOLDS = {
  heatwave: 40,
  heavyRain: 15,
  highWind: 60,
  stormHumidity: 90,
  highUV: 9,
} as const;

/* Groq */
export const GROQ_MODEL = "qwen/qwen3.8-27b";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const QUICK_PROMPTS = [
  "📅 7-day forecast",
  "🌧️ Will it rain this week?",
  "🔥 Hottest day?",
  "कल का मौसम बताओ",
  "What should I carry tomorrow?",
];