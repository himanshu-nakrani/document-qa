"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Inbox } from "lucide-react";

import { EASE_OUT } from "../../lib/motion";

/**
 * Empty-state placeholder: icon, title, one-line description, optional action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <span
        className="inline-flex rounded-lg p-2.5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-tertiary)" }}
      >
        {icon ?? <Inbox size={16} />}
      </span>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
      {description ? (
        <p className="text-xs max-w-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </motion.div>
  );
}

/**
 * Inline error banner with optional retry. Role=alert announces on mount.
 */
export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px]"
      style={{ background: "var(--error-soft)", border: "1px solid var(--error-soft)", color: "var(--error)" }}
    >
      <AlertTriangle size={14} className="shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold uppercase tracking-wide shrink-0 focus-ring rounded px-1"
          style={{ color: "var(--error)" }}
        >
          Retry
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 focus-ring rounded px-1"
          style={{ color: "var(--error)" }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
