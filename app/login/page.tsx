import type { Metadata } from "next";

import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Sourceful — self-hosted, traceable document question answering with cited retrieval.",
};

/**
 * Server shell for /login: carries route metadata and mounts the client auth
 * gate (StoreProvider + AuthScreen with redirect for authenticated users).
 */
export default function LoginPage() {
  return <LoginClient />;
}
