"use client";

import React from "react";

/**
 * Root error boundary — the last resort when the root layout itself throws.
 * Renders a minimal standalone page (no app chrome, no tokens that may have
 * failed to load) with a hard-reload recovery path.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("global_error_boundary", error);
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
          background: "#0b0e12",
          color: "#e8ebef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 24,
            border: "1px solid rgba(232,235,239,0.14)",
            borderRadius: 12,
          }}
          role="alert"
        >
          <h1 style={{ fontSize: 16, margin: "0 0 8px", fontWeight: 600 }}>
            Application error
          </h1>
          <p style={{ fontSize: 13, margin: "0 0 20px", color: "#97a1ae", lineHeight: 1.6 }}>
            The app failed to load. Reloading usually resolves it; if it persists, check the
            server logs.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#c6f24e",
                color: "#10150b",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "transparent",
                color: "#97a1ae",
                border: "1px solid rgba(232,235,239,0.14)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
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
