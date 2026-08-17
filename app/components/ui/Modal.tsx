"use client";

import React, { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import { EASE_OUT } from "../../lib/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

/** Open-modal ids, last entry is topmost. Escape/Tab only apply to the top. */
const modalStack: number[] = [];
let modalSeq = 0;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * When true, Escape and backdrop clicks are ignored — use while an
   * operation is in flight so the dialog cannot abandon mid-poll work.
   */
  busy?: boolean;
  /** Accessible name for the dialog. */
  title: string;
  children: React.ReactNode;
  /** Width in px (clamped to 94vw by CSS). */
  width?: number;
  /** Height clamp, e.g. "min(640px, 86vh)". */
  height?: string;
  /** Vertical placement: centered (default) or near the top for tall panels. */
  align?: "center" | "top";
  className?: string;
  /** Hide the default card chrome (for fully custom overlays). */
  bare?: boolean;
}

/**
 * Accessible modal overlay: portals to body, traps and restores focus,
 * handles Escape (respecting `busy`), locks background scroll, and exposes
 * proper dialog semantics. All panels in the app route through this.
 */
export function Modal({
  open,
  onClose,
  busy = false,
  title,
  children,
  width = 480,
  height,
  align = "center",
  className = "",
  bare = false,
}: ModalProps) {
  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Focus management: save the activator, focus the dialog on open,
  // restore focus on close.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    if (node) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus({ preventScroll: true });
    }
    return () => {
      restoreRef.current?.focus({ preventScroll: true });
      restoreRef.current = null;
    };
  }, [open]);

  // Scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [open]);

  // Escape/Tab only on the topmost open modal. stopPropagation is not enough:
  // every instance listens on `document`, so a nested confirm would also
  // close its parent without a stack check.
  useEffect(() => {
    if (!open) return;
    const id = ++modalSeq;
    modalStack.push(id);
    const isTop = () => modalStack[modalStack.length - 1] === id;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        requestCloseRef.current();
        return;
      }
      if (event.key === "Tab") {
        const node = dialogRef.current;
        if (!node) return;
        const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );
        if (focusables.length === 0) {
          event.preventDefault();
          node.focus({ preventScroll: true });
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && (active === first || !node.contains(active))) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const index = modalStack.lastIndexOf(id);
      if (index >= 0) modalStack.splice(index, 1);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={`fixed inset-0 z-50 flex justify-center px-4 py-6 ${
            align === "center" ? "items-center" : "items-start pt-[8vh]"
          }`}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(4, 6, 9, 0.6)", backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={requestClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`relative z-10 w-full outline-none ${bare ? "" : "rounded-xl"} ${className}`}
            style={{
              maxWidth: `min(${width}px, 94vw)`,
              ...(bare
                ? {}
                : {
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-lg)",
                  }),
              ...(height ? { height } : {}),
            }}
            initial={{ opacity: 0, y: align === "center" ? 10 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: align === "center" ? 8 : -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
