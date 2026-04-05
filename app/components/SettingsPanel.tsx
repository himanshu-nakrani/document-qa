"use client";

import React from "react";
import { X, Key, CheckCircle2 } from "lucide-react";
import { useStore } from "../lib/store";
import type { Provider } from "../lib/api";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const providers: { value: Provider; label: string; icon: string }[] = [
    { value: "openai", label: "OpenAI", icon: "⚡" },
    { value: "gemini", label: "Google Gemini", icon: "✦" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-2xl shadow-2xl animate-scale-in"
        style={{
          width: "min(440px, 90vw)",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-surface)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-5">
          {/* Provider */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Provider
            </label>
            <div className="flex gap-2">
              {providers.map((p) => (
                <button
                  key={p.value}
                  onClick={() =>
                    dispatch({ type: "SET_PROVIDER", payload: p.value })
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background:
                      mounted && settings.provider === p.value
                        ? "var(--accent-soft)"
                        : "var(--bg-surface)",
                    border: `1px solid ${
                      mounted && settings.provider === p.value
                        ? "var(--border-accent)"
                        : "var(--border)"
                    }`,
                    color:
                      mounted && settings.provider === p.value
                        ? "var(--accent-hover)"
                        : "var(--text-secondary)",
                  }}
                >
                  <span>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              API Key
            </label>
            <div className="relative">
              <Key
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="password"
                autoComplete="off"
                value={mounted ? settings.apiKey : ""}
                onChange={(e) =>
                  dispatch({
                    type: "SET_SETTINGS",
                    payload: { apiKey: e.target.value },
                  })
                }
                placeholder={
                  !mounted
                    ? "Loading..."
                    : settings.provider === "openai"
                    ? "sk-..."
                    : "Google AI API key"
                }
                className="w-full rounded-lg px-3 py-2.5 pl-9 text-sm outline-none transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              />
              {mounted && settings.apiKey && (
                <CheckCircle2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--success)" }}
                />
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Your key is stored locally in your browser and sent only to your
              backend server.
            </p>
          </div>

          {/* Embedding model */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Embedding Model
            </label>
            <input
              type="text"
              autoComplete="off"
              value={mounted ? settings.embeddingModel : ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_SETTINGS",
                  payload: { embeddingModel: e.target.value },
                })
              }
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
          </div>

          {/* Chat model */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Chat Model
            </label>
            <input
              type="text"
              autoComplete="off"
              value={mounted ? settings.chatModel : ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_SETTINGS",
                  payload: { chatModel: e.target.value },
                })
              }
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-5 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--accent)")
            }
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
