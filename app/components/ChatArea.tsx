"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  Send,
  Loader2,
  PanelLeftOpen,
  FileText,
  Sparkles,
  MessageSquarePlus,
  Settings,
} from "lucide-react";
import { useStore } from "../lib/store";
import { streamChat, listConversations } from "../lib/api";
import MessageBubble from "./MessageBubble";
import SourceCard from "./SourceCard";
import type { Message } from "../lib/api";

interface ChatAreaProps {
  onUploadClick: () => void;
}

export default function ChatArea({ onUploadClick }: ChatAreaProps) {
  const { state, dispatch } = useStore();
  const {
    settings,
    activeDocumentId,
    activeConversationId,
    messages,
    documents,
    sidebarOpen,
  } = state;

  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentSources, setCurrentSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const canAsk =
    activeDocumentId &&
    activeDoc?.status === "ready" &&
    settings.apiKey &&
    settings.chatModel &&
    question.trim() &&
    !streaming;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSources]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [question]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!canAsk || !activeDocumentId) return;

      const q = question.trim();
      setQuestion("");
      setError(null);
      setCurrentSources([]);
      setStreaming(true);

      // Add user message
      const userMsg: Message = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: q,
        created_at: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMsg });

      // Add empty assistant message
      const assistantMsg: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: assistantMsg });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          settings.apiKey,
          settings.provider,
          settings.chatModel,
          activeDocumentId,
          q,
          activeConversationId,
          {
            onSources: (chunks) => {
              setCurrentSources(chunks);
            },
            onToken: (token) => {
              dispatch({ type: "APPEND_TO_LAST_MESSAGE", payload: token });
            },
            onDone: async (conversationId) => {
              dispatch({
                type: "SET_ACTIVE_CONVERSATION",
                payload: conversationId,
              });
              // Refresh conversations list
              if (settings.apiKey && activeDocumentId) {
                try {
                  const convs = await listConversations(
                    settings.apiKey,
                    activeDocumentId
                  );
                  dispatch({ type: "SET_CONVERSATIONS", payload: convs });
                } catch { /* silent */ }
              }
            },
            onError: (msg) => {
              setError(msg);
            },
          },
          controller.signal
        );
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Stream interrupted.");
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [
      canAsk,
      activeDocumentId,
      activeConversationId,
      question,
      settings,
      dispatch,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Suggested questions for empty state
  const suggestions = [
    "What are the main topics covered?",
    "Summarize the key findings",
    "What are the conclusions?",
    "List the important data points",
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          height: "var(--header-height)",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        {!sidebarOpen && (
          <button
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-surface)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        {activeDoc ? (
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {activeDoc.filename}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-hover)",
              }}
            >
              {activeDoc.chunk_count} chunks
            </span>
          </div>
        ) : (
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Select a document to start
          </span>
        )}
      </div>

      {/* ── Messages area ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.length === 0 && activeDoc ? (
            /* Empty state with suggestions */
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div
                className="flex items-center justify-center rounded-2xl mb-4"
                style={{
                  width: 64,
                  height: 64,
                  background:
                    "linear-gradient(135deg, var(--accent-soft), var(--bg-surface))",
                  border: "1px solid var(--border-accent)",
                }}
              >
                <Sparkles size={28} style={{ color: "var(--accent)" }} />
              </div>
              <h3
                className="text-lg font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Ask about your document
              </h3>
              <p
                className="text-sm mb-6 text-center max-w-md"
                style={{ color: "var(--text-tertiary)" }}
              >
                AI-powered answers grounded in{" "}
                <span style={{ color: "var(--accent-hover)" }}>
                  {activeDoc.filename}
                </span>
                . Ask anything about its contents.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuestion(s);
                      textareaRef.current?.focus();
                    }}
                    className="text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-surface-hover)";
                      e.currentTarget.style.borderColor = "var(--border-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--bg-surface)";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length === 0 && !activeDoc ? (
            /* No document selected */
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div
                className="flex items-center justify-center rounded-2xl mb-4"
                style={{
                  width: 72,
                  height: 72,
                  background:
                    "linear-gradient(135deg, var(--bg-surface), var(--bg-tertiary))",
                  border: "1px solid var(--border)",
                }}
              >
                <FileText size={32} style={{ color: "var(--text-muted)" }} />
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Welcome to Document RAG
              </h3>
              <p
                className="text-sm text-center max-w-md mb-6"
                style={{ color: "var(--text-tertiary)" }}
              >
                Upload a document and ask AI-powered questions about its
                contents. Your answers are grounded in the document with source
                citations.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onUploadClick}
                  disabled={!settings.apiKey}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: settings.apiKey
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                    color: settings.apiKey ? "#fff" : "var(--text-tertiary)",
                    cursor: settings.apiKey ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={(e) => {
                    if (settings.apiKey)
                      e.currentTarget.style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (settings.apiKey)
                      e.currentTarget.style.background = "var(--accent)";
                  }}
                >
                  <MessageSquarePlus size={16} />
                  Upload Document
                </button>
                {!settings.apiKey && (
                  <button
                    onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", payload: true })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--bg-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface)")
                    }
                  >
                    <Settings size={16} />
                    Configure API Key
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Messages */
            <>
              {messages.map((msg, i) => (
                <React.Fragment key={msg.id}>
                  <MessageBubble message={msg} />
                  {/* Show sources after the first assistant message with sources */}
                  {msg.role === "assistant" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <SourceCard chunks={msg.sources} />
                    )}
                </React.Fragment>
              ))}
              {/* Current streaming sources */}
              {streaming && currentSources.length > 0 && (
                <SourceCard chunks={currentSources} />
              )}
              {/* Streaming indicator */}
              {streaming &&
                messages.length > 0 &&
                messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 pl-11">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="rounded-full"
                          style={{
                            width: 6,
                            height: 6,
                            background: "var(--accent)",
                            animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Thinking…
                    </span>
                  </div>
                )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-lg text-sm animate-fade-in"
          style={{
            background: "var(--error-soft)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Input area ── */}
      {activeDoc && activeDoc.status === "ready" && (
        <div
          className="flex-shrink-0 px-4 pb-4 pt-2"
          style={{ background: "var(--bg-primary)" }}
        >
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative"
          >
            <div
              className="flex items-end rounded-xl transition-all"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
              onFocus={(e) => {
                (
                  e.currentTarget as HTMLElement
                ).style.borderColor = "var(--border-accent)";
                (
                  e.currentTarget as HTMLElement
                ).style.boxShadow = "var(--shadow-glow)";
              }}
              onBlur={(e) => {
                (
                  e.currentTarget as HTMLElement
                ).style.borderColor = "var(--border)";
                (
                  e.currentTarget as HTMLElement
                ).style.boxShadow = "var(--shadow-md)";
              }}
            >
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  settings.apiKey
                    ? "Ask a question about your document…"
                    : "Set your API key in settings first"
                }
                disabled={!settings.apiKey || !activeDoc || streaming}
                rows={1}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: 160,
                  minHeight: 44,
                }}
              />
              <button
                type="submit"
                disabled={!canAsk}
                className="flex items-center justify-center p-2 m-1.5 rounded-lg transition-all"
                style={{
                  background: canAsk ? "var(--accent)" : "transparent",
                  color: canAsk ? "#fff" : "var(--text-muted)",
                  cursor: canAsk ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (canAsk)
                    e.currentTarget.style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  if (canAsk)
                    e.currentTarget.style.background = "var(--accent)";
                }}
              >
                {streaming ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <p
              className="text-center mt-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              AI answers are grounded in your document. Review citations for
              accuracy.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
