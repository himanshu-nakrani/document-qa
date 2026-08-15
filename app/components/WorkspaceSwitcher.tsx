"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, FolderPlus, Layers, Loader2 } from "lucide-react";
import { createWorkspace, listWorkspaces, type Workspace } from "../lib/api";
import { transitionFast, transitionNormal } from "../lib/motion";
import { useStore } from "../lib/store";
import { Badge, Button, TextField } from "./ui";

/**
 * Workspace switcher. Lives in the sidebar header and drives the
 * ``activeWorkspaceId`` in the global store. Also exposes an inline "New
 * workspace" form so users can spin up a workspace without leaving context.
 */
export default function WorkspaceSwitcher() {
  const { state, dispatch } = useStore();
  const { workspaces, activeWorkspaceId, workspacesLoading, workspacesError, settings, currentUser } = state;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const auth = { clientSessionId: settings.clientSessionId, authToken: currentUser?.session_token };
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  const closeDropdown = (restoreFocus = false) => {
    setOpen(false);
    setCreating(false);
    setSubmitError(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  // Outside-click closes the dropdown (focus stays where the user clicked).
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeDropdown(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Escape closes the dropdown and restores focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeDropdown(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const refreshWorkspaces = async () => {
    dispatch({ type: "SET_WORKSPACES_LOADING", payload: true });
    try {
      const next = await listWorkspaces(auth);
      dispatch({ type: "SET_WORKSPACES", payload: next });
      dispatch({ type: "SET_WORKSPACES_ERROR", payload: null });
    } catch (err) {
      dispatch({
        type: "SET_WORKSPACES_ERROR",
        payload: err instanceof Error ? err.message : "Failed to load workspaces.",
      });
    } finally {
      dispatch({ type: "SET_WORKSPACES_LOADING", payload: false });
    }
  };

  const handleSelect = (workspace: Workspace) => {
    dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: workspace.id });
    dispatch({ type: "SET_ACTIVE_DOCUMENT", payload: null });
    closeDropdown(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setSubmitError("Workspace name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createWorkspace(auth, { name });
      dispatch({ type: "UPSERT_WORKSPACE", payload: created });
      dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: created.id });
      dispatch({ type: "SET_ACTIVE_DOCUMENT", payload: null });
      setNewName("");
      setCreating(false);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="relative px-3 pt-2 pb-1 flex-shrink-0">
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open && workspaces.length === 0 && !workspacesLoading) {
            void refreshWorkspaces();
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs focus-ring transition-colors"
        style={{
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        whileHover={{ borderColor: "var(--border-hover)" }}
        whileTap={{ scale: 0.98 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch workspace"
      >
        <Layers size={13} style={{ color: "var(--accent-primary)" }} />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Workspace
          </div>
          <div className="text-xs font-semibold truncate">
            {workspacesLoading && !active ? "Loading…" : active ? active.name : "Select workspace"}
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={transitionFast}
          className="inline-flex"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transitionNormal}
            className="absolute left-3 right-3 mt-1 z-40 rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
            }}
            role="listbox"
          >
            {workspacesError ? (
              <div
                className="px-3 py-2 text-[11px] flex items-start justify-between gap-2"
                style={{ background: "var(--error-soft)", color: "var(--error)" }}
                role="alert"
              >
                <span className="min-w-0">{workspacesError}</span>
                <button
                  type="button"
                  onClick={() => void refreshWorkspaces()}
                  className="underline font-medium flex-shrink-0 focus-ring rounded px-0.5"
                >
                  retry
                </button>
              </div>
            ) : null}
            <ul className="max-h-60 overflow-y-auto">
              {workspaces.length === 0 && !workspacesLoading ? (
                <li className="px-3 py-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  No workspaces yet.
                </li>
              ) : null}
              {workspacesLoading && workspaces.length === 0 ? (
                <li
                  className="px-3 py-3 text-[11px] flex items-center gap-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Loader2 size={11} className="animate-spin" /> Loading workspaces…
                </li>
              ) : null}
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <li key={ws.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => handleSelect(ws)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg transition-colors focus-ring ${
                        isActive ? "" : "hover:bg-[var(--bg-surface)]"
                      }`}
                      style={{
                        background: isActive ? "var(--accent-primary-soft)" : "transparent",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span className="flex-1 truncate flex items-center gap-1.5">
                        <span className="truncate">{ws.name}</span>
                        {ws.is_default ? (
                          <span className="inline-flex flex-shrink-0">
                            <Badge>default</Badge>
                          </span>
                        ) : null}
                      </span>
                      {isActive ? (
                        <Check size={12} style={{ color: "var(--accent-primary)" }} />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div style={{ borderTop: "1px solid var(--border)" }}>
              {creating ? (
                <div className="px-3 py-2.5 flex flex-col gap-2">
                  <TextField
                    label="Workspace name"
                    placeholder="e.g. Market research"
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreate();
                      } else if (e.key === "Escape") {
                        // First Escape discards the inline form only.
                        e.stopPropagation();
                        setCreating(false);
                        setSubmitError(null);
                      }
                    }}
                    error={submitError}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreating(false);
                        setSubmitError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleCreate()}
                      disabled={submitting}
                    >
                      {submitting ? "Creating…" : "Create"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setSubmitError(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors focus-ring hover:bg-[var(--bg-surface)]"
                  style={{ color: "var(--accent-primary)" }}
                >
                  <FolderPlus size={12} /> New workspace
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
