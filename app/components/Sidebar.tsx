"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  Settings,
  MessageSquare,
  Trash2,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  PanelLeftClose,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { DocumentInfo, ConversationListItem } from "../lib/api";
import {
  listDocuments,
  deleteDocument,
  listConversations,
  getConversation,
  deleteConversation,
} from "../lib/api";

interface SidebarProps {
  onUploadClick: () => void;
}

export default function Sidebar({ onUploadClick }: SidebarProps) {
  const { state, dispatch } = useStore();
  const {
    settings,
    documents,
    activeDocumentId,
    conversations,
    activeConversationId,
    sidebarOpen,
  } = state;
  const [loading, setLoading] = useState(false);

  const refreshDocuments = useCallback(async () => {
    if (!settings.apiKey) return;
    setLoading(true);
    try {
      const docs = await listDocuments(settings.apiKey);
      dispatch({ type: "SET_DOCUMENTS", payload: docs });
    } catch { /* silent */ }
    setLoading(false);
  }, [settings.apiKey, dispatch]);

  const refreshConversations = useCallback(
    async (docId: string) => {
      if (!settings.apiKey) return;
      try {
        const convs = await listConversations(settings.apiKey, docId);
        dispatch({ type: "SET_CONVERSATIONS", payload: convs });
      } catch { /* silent */ }
    },
    [settings.apiKey, dispatch]
  );

  const handleDocumentClick = useCallback(
    async (doc: DocumentInfo) => {
      dispatch({ type: "SET_ACTIVE_DOCUMENT", payload: doc.id });
      await refreshConversations(doc.id);
    },
    [dispatch, refreshConversations]
  );

  const handleDeleteDocument = useCallback(
    async (e: React.MouseEvent, docId: string) => {
      e.stopPropagation();
      if (!settings.apiKey) return;
      try {
        await deleteDocument(settings.apiKey, docId);
        dispatch({ type: "REMOVE_DOCUMENT", payload: docId });
      } catch { /* silent */ }
    },
    [settings.apiKey, dispatch]
  );

  const handleConversationClick = useCallback(
    async (conv: ConversationListItem) => {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: conv.id });
      if (!settings.apiKey) return;
      try {
        const full = await getConversation(settings.apiKey, conv.id);
        dispatch({ type: "SET_MESSAGES", payload: full.messages });
      } catch { /* silent */ }
    },
    [settings.apiKey, dispatch]
  );

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, convId: string) => {
      e.stopPropagation();
      if (!settings.apiKey) return;
      try {
        await deleteConversation(settings.apiKey, convId);
        if (activeConversationId === convId) {
          dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: null });
          dispatch({ type: "SET_MESSAGES", payload: [] });
        }
        if (activeDocumentId) await refreshConversations(activeDocumentId);
      } catch { /* silent */ }
    },
    [settings.apiKey, activeConversationId, activeDocumentId, dispatch, refreshConversations]
  );

  const handleNewConversation = () => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: null });
    dispatch({ type: "SET_MESSAGES", payload: [] });
  };

  // Auto-load documents when apiKey changes
  React.useEffect(() => {
    if (settings.apiKey) refreshDocuments();
  }, [settings.apiKey, refreshDocuments]);

  const statusIcon = (status: string) => {
    if (status === "ready")
      return <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />;
    if (status === "error")
      return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />;
    return <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />;
  };

  if (!sidebarOpen) return null;

  return (
    <aside
      style={{ width: "var(--sidebar-width)" }}
      className="flex flex-col h-full border-r animate-slide-in-left flex-shrink-0"
      css-border="border-color: var(--border)"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: "var(--header-height)",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: "var(--accent-soft)",
            }}
          >
            <FileText size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Document RAG
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div className="px-3 py-3 flex gap-2 flex-shrink-0">
        <button
          onClick={onUploadClick}
          disabled={!settings.apiKey}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: settings.apiKey ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (settings.apiKey) e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          <Upload size={15} />
          Upload
        </button>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          className="flex items-center justify-center px-3 py-2 rounded-lg transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--bg-surface)")
          }
        >
          <Settings size={16} />
        </button>
      </div>

      {/* ── Documents list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Documents
          </span>
          {loading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />}
        </div>

        {documents.length === 0 && (
          <div className="px-3 py-6 text-center">
            <FileText
              size={32}
              className="mx-auto mb-2"
              style={{ color: "var(--text-muted)" }}
            />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {settings.apiKey
                ? "No documents yet. Upload one to get started."
                : "Enter your API key in settings to begin."}
            </p>
          </div>
        )}

        {documents.map((doc) => (
          <div key={doc.id} className="mb-1">
            <button
              onClick={() => handleDocumentClick(doc)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group"
              style={{
                background:
                  activeDocumentId === doc.id
                    ? "var(--accent-soft)"
                    : "transparent",
                border:
                  activeDocumentId === doc.id
                    ? "1px solid var(--border-accent)"
                    : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (activeDocumentId !== doc.id)
                  e.currentTarget.style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                if (activeDocumentId !== doc.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {statusIcon(doc.status)}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{
                    color:
                      activeDocumentId === doc.id
                        ? "var(--accent-hover)"
                        : "var(--text-primary)",
                  }}
                >
                  {doc.filename}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                  {doc.chunk_count} chunks ·{" "}
                  {(doc.file_size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteDocument(e, doc.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                <Trash2 size={14} />
              </button>
            </button>

            {/* Conversations under active document */}
            {activeDocumentId === doc.id && doc.status === "ready" && (
              <div className="ml-5 mt-1 mb-2 pl-3" style={{ borderLeft: "2px solid var(--border)" }}>
                <button
                  onClick={handleNewConversation}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors mb-1"
                  style={{ color: "var(--accent)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--accent-soft)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Plus size={12} />
                  New conversation
                </button>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors group"
                    style={{
                      background:
                        activeConversationId === conv.id
                          ? "var(--bg-surface)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface)")
                    }
                    onMouseLeave={(e) => {
                      if (activeConversationId !== conv.id)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <MessageSquare size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                    <span
                      className="text-xs truncate flex-1"
                      style={{
                        color:
                          activeConversationId === conv.id
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {conv.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--error)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-tertiary)")
                      }
                    >
                      <Trash2 size={11} />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
