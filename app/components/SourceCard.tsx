"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface SourceCardProps {
  chunks: string[];
}

export default function SourceCard({ chunks }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!chunks.length) return null;

  return (
    <div
      className="rounded-xl animate-fade-in"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors"
        style={{
          background: expanded ? "var(--bg-tertiary)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = "var(--bg-surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!expanded) e.currentTarget.style.background = "transparent";
        }}
      >
        <BookOpen size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          {chunks.length} source{chunks.length !== 1 ? "s" : ""} retrieved
        </span>
        <div className="flex-1" />
        {expanded ? (
          <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-3 flex flex-col gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {chunks.map((chunk, i) => (
            <div
              key={i}
              className="relative rounded-lg px-3 py-2.5 mt-2"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="absolute -top-2 left-3 px-1.5 py-0 text-[0.625rem] font-bold rounded"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                }}
              >
                [{i + 1}]
              </span>
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--text-secondary)",
                  display: "-webkit-box",
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {chunk}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
