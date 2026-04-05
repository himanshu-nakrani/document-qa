"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { useStore } from "../lib/store";
import { ingestDocument, getDocumentStatus, listDocuments } from "../lib/api";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setUploading(false);
    setStatus("idle");
    setErrorMsg("");
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) setFile(f);
    },
    []
  );

  const handleUpload = async () => {
    if (!file || !settings.apiKey) return;
    setUploading(true);
    setStatus("uploading");
    setErrorMsg("");

    try {
      const result = await ingestDocument(
        settings.apiKey,
        settings.provider,
        file,
        settings.embeddingModel
      );

      setStatus("processing");

      // Poll for completion
      const docId = result.document_id;
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;
        try {
          const s = await getDocumentStatus(settings.apiKey, docId);
          if (s.status === "ready") {
            setStatus("done");
            // Refresh document list
            const docs = await listDocuments(settings.apiKey);
            dispatch({ type: "SET_DOCUMENTS", payload: docs });
            dispatch({ type: "SET_ACTIVE_DOCUMENT", payload: docId });
            setTimeout(handleClose, 1500);
            return;
          }
          if (s.status === "error") {
            setStatus("error");
            setErrorMsg(s.error_message || "Processing failed.");
            return;
          }
        } catch {
          // keep polling
        }
      }
      setStatus("error");
      setErrorMsg("Processing timed out. Check the document status.");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) handleClose();
      }}
    >
      <div
        className="rounded-2xl shadow-2xl animate-scale-in"
        style={{
          width: "min(480px, 90vw)",
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
            Upload Document
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
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
        <div className="px-5 py-5">
          {/* Drop zone */}
          <div
            className="rounded-xl transition-all cursor-pointer"
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-hover)"}`,
              background: dragOver ? "var(--accent-soft)" : "var(--bg-tertiary)",
              padding: "2rem 1rem",
              textAlign: "center",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={36} style={{ color: "var(--text-primary)" }} />
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={36} style={{ color: "var(--text-muted)" }} />
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Drop a file here or click to browse
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  PDF, TXT, MD, DOCX, CSV · Max 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          {status !== "idle" && (
            <div
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background:
                  status === "error"
                    ? "var(--error-soft)"
                    : status === "done"
                    ? "var(--success-soft)"
                    : "var(--accent-soft)",
                border: `1px solid ${
                  status === "error"
                    ? "rgba(239,68,68,0.3)"
                    : status === "done"
                    ? "rgba(16,185,129,0.3)"
                    : "var(--border-accent)"
                }`,
              }}
            >
              {status === "uploading" && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "var(--accent)" }}
                />
              )}
              {status === "processing" && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "var(--accent)" }}
                />
              )}
              {status === "done" && (
                <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
              )}
              {status === "error" && (
                <X size={16} style={{ color: "var(--error)" }} />
              )}
              <span
                className="text-sm"
                style={{
                  color:
                    status === "error"
                      ? "var(--error)"
                      : status === "done"
                      ? "var(--success)"
                      : "var(--accent-hover)",
                }}
              >
                {status === "uploading" && "Uploading…"}
                {status === "processing" && "Processing and indexing…"}
                {status === "done" && "Document ready!"}
                {status === "error" && (errorMsg || "Something went wrong.")}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading || status === "done"}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background:
                !file || uploading || status === "done"
                  ? "var(--bg-elevated)"
                  : "var(--accent)",
              color:
                !file || uploading || status === "done"
                  ? "var(--text-tertiary)"
                  : "var(--accent-fg)",
              cursor:
                !file || uploading || status === "done"
                  ? "not-allowed"
                  : "pointer",
            }}
            onMouseEnter={(e) => {
              if (file && !uploading && status !== "done")
                e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (file && !uploading && status !== "done")
                e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Processing…
              </span>
            ) : status === "done" ? (
              "Done"
            ) : (
              "Upload & Index"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
