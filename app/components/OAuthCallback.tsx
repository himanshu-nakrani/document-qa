"use client";

import { useEffect, useRef } from "react";

import { googleLogin, type AuthUser } from "../lib/api";
import { consumeGoogleOAuthCallback } from "../lib/oauth";

/**
 * Completes a Google OAuth return on whatever route the redirect landed on.
 * Safe to mount in more than one tree: consume is once-per-load.
 */
export default function OAuthCallback({
  onAuthenticated,
  onError,
}: {
  onAuthenticated: (user: AuthUser) => void;
  onError?: (message: string) => void;
}) {
  const onAuthenticatedRef = useRef(onAuthenticated);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
    onErrorRef.current = onError;
  }, [onAuthenticated, onError]);

  useEffect(() => {
    const result = consumeGoogleOAuthCallback();
    if (result.kind === "none") return;
    if (result.kind === "error") {
      onErrorRef.current?.(result.message);
      return;
    }
    void googleLogin(result.code, result.redirectUri)
      .then((user) => {
        onAuthenticatedRef.current(user);
      })
      .catch((err) => {
        onErrorRef.current?.(err instanceof Error ? err.message : "Google sign-in failed.");
      });
  }, []);

  return null;
}
