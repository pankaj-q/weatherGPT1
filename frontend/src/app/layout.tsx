import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WeatherGPT — Conversational Weather Intelligence",
  description:
    "Live weather, 7-day intelligence and AI advisory for India. Powered by Open-Meteo and Groq.",
  applicationName: "WeatherGPT",
  authors: [{ name: "WeatherGPT" }],
  keywords: ["weather", "forecast", "AI", "India", "advsory"],
  openGraph: {
    title: "WeatherGPT",
    description: "Live weather, 7-day intelligence and AI advisory for India.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}