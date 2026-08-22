"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import AuthScreen from "../components/AuthScreen";
import { StoreProvider, useStore } from "../lib/store";

/**
 * Auth gate for /login. Renders AuthScreen for anonymous visitors and sends
 * already-authenticated users straight to the app.
 *
 * Note: this component deliberately does NOT dispatch SET_SETUP_COMPLETE.
 * `setupComplete` lives in this route's own StoreProvider, and /dashboard
 * mounts a separate one, so the flag cannot cross the redirect. The dashboard
 * exempts authenticated users from the setup gate instead.
 */
function LoginGate() {
  const { state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (state.currentUser) {
      router.replace("/dashboard");
    }
  }, [state.currentUser, router]);

  if (state.authLoading || state.currentUser) {
    return (
      <div
        className="flex min-h-screen items-center justify-center gap-3"
        style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
      >
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  return <AuthScreen />;
}

/**
 * Client half of /login (see page.tsx for the metadata-bearing server shell).
 */
export default function LoginClient() {
  return (
    <StoreProvider>
      <LoginGate />
    </StoreProvider>
  );
}
