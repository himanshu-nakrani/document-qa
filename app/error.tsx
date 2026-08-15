"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. Catches render/SSR exceptions inside the app
 * shell and offers a retry instead of white-screening the route.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface for observability; keep the UI functional regardless.
    console.error("route_error_boundary", error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        role="alert"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-flex rounded-lg p-2"
            style={{ background: "var(--error-soft)", color: "var(--error)" }}
          >
            <AlertTriangle size={16} />
          </span>
          <h1 className="display text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Something went wrong
          </h1>
        </div>
        <p className="text-[13px] leading-relaxed mb-1" style={{ color: "var(--text-secondary)" }}>
          This screen hit an unexpected error and stopped rendering.
        </p>
        {error.digest ? (
          <p className="data-num text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
            {error.digest}
          </p>
        ) : (
          <div className="mb-4" />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold focus-ring"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <RotateCcw size={13} />
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-lg px-3.5 py-2 text-[13px] focus-ring"
            style={{ color: "var(--text-secondary)" }}
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
