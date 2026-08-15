"use client";

import React from "react";

/**
 * Instrument meter for confidence/provenance scores.
 * A hairline track with a threshold-colored fill and optional mono readout.
 */
export function Meter({
  value,
  label,
  showValue = true,
  compact = false,
}: {
  /** Score in 0..1 (values outside are clamped for display). */
  value: number;
  label?: string;
  showValue?: boolean;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const tone =
    clamped >= 0.75
      ? "var(--confidence-high)"
      : clamped >= 0.45
        ? "var(--confidence-med)"
        : clamped > 0
          ? "var(--confidence-low)"
          : "var(--confidence-unverified)";

  return (
    <span className={`inline-flex items-center ${compact ? "gap-1.5" : "gap-2"}`} title={label}>
      {label ? (
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
      ) : null}
      <span
        className="relative block rounded-full overflow-hidden"
        style={{ width: compact ? 36 : 56, height: compact ? 3 : 4, background: "var(--bg-highest)" }}
        role="meter"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "confidence"}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          style={{ width: `${clamped * 100}%`, background: tone }}
        />
      </span>
      {showValue ? (
        <span className="data-num text-xs" style={{ color: "var(--text-secondary)" }}>
          {clamped.toFixed(2)}
        </span>
      ) : null}
    </span>
  );
}

export type StatusTone = "success" | "warning" | "error" | "processing" | "idle" | "accent";

const toneColor: Record<StatusTone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  processing: "var(--accent-secondary)",
  idle: "var(--text-muted)",
  accent: "var(--accent-primary)",
};

/**
 * Small colored status dot with optional label text.
 */
export function StatusDot({
  tone,
  label,
  pulse = false,
}: {
  tone: StatusTone;
  label?: string;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ width: 6, height: 6, background: toneColor[tone] }}
      />
      {label ? (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Compact tinted label chip.
 */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone | "neutral";
}) {
  const color = tone === "neutral" ? "var(--text-tertiary)" : toneColor[tone];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{ color, border: `1px solid ${tone === "neutral" ? "var(--border)" : color}`, background: "transparent" }}
    >
      {children}
    </span>
  );
}
