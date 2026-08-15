"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, FileText } from "lucide-react";
import type { Citation } from "../lib/api";
import { EASE_OUT } from "../lib/motion";
import { useServerState } from "../lib/server-state";
import { Badge } from "./ui";
import type { StatusTone } from "./ui";

interface SourceCardProps {
  sources: Citation[];
}

interface SourceGroup {
  documentId: string;
  title: string;
  citations: Array<{ citation: Citation; globalIndex: number }>;
}

// Score tiers → Badge tones: Strong = success, Good = med confidence
// (processing tone renders --accent-secondary, same color as --confidence-med),
// Weak = warning. The 2px left rail carries the provenance color.
type ScoreTier = { label: string; tone: StatusTone; rail: string };

function getScoreTier(score: number): ScoreTier {
  if (score >= 0.75) {
    return { label: "Strong", tone: "success", rail: "var(--provenance-strong)" };
  }
  if (score >= 0.45) {
    return { label: "Good", tone: "processing", rail: "var(--confidence-med)" };
  }
  return { label: "Weak", tone: "warning", rail: "var(--provenance-weak)" };
}

// ⚡ BOLT OPTIMIZATION:
// Wrapped SourceCard in React.memo to prevent unnecessary re-renders of source
// citations for older messages during rapid state updates from token streaming.
const SourceCard = React.memo(function SourceCard({ sources }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { documents } = useServerState();

  const groups: SourceGroup[] = useMemo(() => {
    const map = new Map<string, SourceGroup>();
    sources.forEach((citation, index) => {
      const key = citation.document_id || "__unknown__";
      const doc = documents.find((d) => d.id === citation.document_id);
      const title = doc?.filename || (citation.document_id ? citation.document_id : "Unknown source");
      const existing = map.get(key);
      const entry = { citation, globalIndex: index + 1 };
      if (existing) {
        existing.citations.push(entry);
      } else {
        map.set(key, { documentId: key, title, citations: [entry] });
      }
    });
    return Array.from(map.values());
  }, [sources, documents]);

  if (!sources.length) return null;

  return (
    <motion.div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      {/* [a11y] Added aria-expanded to communicate toggle state to assistive technology */}
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--bg-tertiary)]"
        style={{ background: "transparent" }}
        aria-label={`${sources.length} citations — ${expanded ? "collapse" : "expand"} details`}
      >
        <BookOpen size={13} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)" }}
        >
          Citations
        </span>
        <span className="data-num text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {sources.length}
        </span>
        {groups.length > 1 ? (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            · {groups.length} documents
          </span>
        ) : null}
        <div className="flex-1" />
        <span
          className="flex items-center justify-center rounded-sm p-1 transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-hidden="true"
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDown size={13} />
          </motion.div>
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              {groups.map((group) => {
                const avg =
                  group.citations.reduce((s, c) => s + c.citation.score, 0) /
                  group.citations.length;
                const avgPct = Math.max(0, Math.min(100, Math.round(avg * 100)));
                return (
                  <div key={group.documentId} className="flex flex-col gap-2 pt-3">
                    <div className="flex items-center gap-2 text-[11px] min-w-0">
                      <FileText size={12} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                      <span
                        className="font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                        title={group.title}
                      >
                        {group.title}
                      </span>
                      <span className="data-num flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                        · {group.citations.length} {group.citations.length === 1 ? "excerpt" : "excerpts"} · avg{" "}
                        {avgPct}%
                      </span>
                    </div>
                    {group.citations.map(({ citation, globalIndex }, index) => {
                      const tier = getScoreTier(citation.score);
                      return (
                        <motion.div
                          key={citation.chunk_id}
                          className="relative rounded-md px-3 py-2.5 overflow-hidden"
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border)",
                          }}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.25, ease: EASE_OUT }}
                          whileHover={{ borderColor: "var(--border-hover)" }}
                        >
                          {/* Provenance left rail — tier-colored 2px edge */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-[2px]"
                            style={{ background: tier.rail, opacity: 0.85 }}
                            aria-hidden="true"
                          />
                          <div className="flex items-center gap-2 mb-1.5 text-[10px] flex-wrap">
                            <span
                              className="data-num font-medium"
                              style={{ color: "var(--accent-primary)" }}
                            >
                              [{globalIndex}]
                            </span>
                            <Badge tone={tier.tone}>{tier.label}</Badge>
                            <span className="data-num" style={{ color: "var(--text-secondary)" }}>
                              {citation.score.toFixed(2)}
                            </span>
                            {citation.page_number ? (
                              <span className="data-num" style={{ color: "var(--text-tertiary)" }}>
                                p.{citation.page_number}
                              </span>
                            ) : null}
                            <span
                              className="data-num truncate max-w-[140px]"
                              style={{ color: "var(--text-muted)" }}
                              title={citation.chunk_id}
                            >
                              {citation.chunk_id}
                            </span>
                          </div>
                          <p
                            className="text-xs leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {citation.excerpt}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default SourceCard;
