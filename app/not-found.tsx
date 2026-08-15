import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * 404 page on the Signal token system.
 */
export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center">
        <span
          className="inline-flex rounded-xl p-3 mb-4"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-tertiary)" }}
        >
          <FileQuestion size={20} />
        </span>
        <h1 className="display text-xl font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
          Page not found
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          The page you were looking for doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-semibold focus-ring"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
