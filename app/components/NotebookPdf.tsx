"use client";

import { FileText, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted pdf.js worker (Fix 6.6): resolved from the locally installed
// pdfjs-dist (react-pdf's dependency) and emitted as a static asset by the
// bundler (Next 16 / Turbopack supports `new URL(..., import.meta.url)` asset
// references). No CDN dependency, and the worker always matches pdfjs.version.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface NotebookPdfProps {
  file: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (payload: { numPages: number }) => void;
  /** Follows internal PDF links (e.g. table-of-contents entries) by jumping to the target page. */
  onNavigateToPage?: (page: number) => void;
}

export function NotebookPdf({ file, pageNumber, scale, onLoadSuccess, onNavigateToPage }: NotebookPdfProps) {
  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      onItemClick={onNavigateToPage ? ({ pageNumber: target }) => onNavigateToPage(target) : undefined}
      loading={
        <div className="flex h-full items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--accent-primary)" }}
          />
        </div>
      }
      error={
        <div
          className="flex h-full flex-col items-center justify-center gap-3 text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span
            className="inline-flex rounded-lg p-3"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <FileText className="h-8 w-8" />
          </span>
          <p className="text-sm">Failed to load PDF</p>
        </div>
      }
    >
      {/* Page card: token surface + hairline border (no shadows/glow). */}
      <div
        className="overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Page pageNumber={pageNumber} scale={scale} renderTextLayer renderAnnotationLayer />
      </div>
    </Document>
  );
}
