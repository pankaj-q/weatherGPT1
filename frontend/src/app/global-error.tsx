"use client";

import { useEffect } from "react";

/* Replaces Next's default crash screen ("This page couldn't load") with a
   friendly one, and prints the real error so it can be reported. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("WeatherGPT crashed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070f",
          color: "#eaf0f8",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "460px", textAlign: "center" }}>
          <div style={{ fontSize: "40px" }}>🌦️</div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "12px 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#9fb2c8", fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px" }}>
            The page hit an unexpected error. It is usually temporary — tap Retry.
          </p>
          {error?.message ? (
            <pre
              style={{
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#64748b",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "12px",
                fontSize: "12px",
                margin: "0 0 20px",
              }}
            >
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          ) : null}
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => retry()}
              style={{
                border: "none",
                borderRadius: "12px",
                background: "linear-gradient(135deg,#38bdf8,#818cf8)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                borderRadius: "12px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#eaf0f8",
                fontWeight: 600,
                fontSize: "14px",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
