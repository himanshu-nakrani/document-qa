const STORAGE_KEY = "rag-oauth-state";

export type OAuthConsumeResult =
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "ok"; code: string; redirectUri: string };

interface StoredOAuthState {
  state: string;
  redirectUri: string;
}

let consumedThisLoad = false;

function randomState(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Start Google authorization with a CSRF `state` bound to this tab.
 * Fails closed (returns false) if sessionStorage cannot hold the state.
 */
export function startGoogleOAuth(clientId: string): boolean {
  const state = randomState();
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  try {
    const payload: StoredOAuthState = { state, redirectUri };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return false;
  }
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&state=${encodeURIComponent(state)}` +
    `&access_type=offline` +
    `&prompt=consent`;
  window.location.href = url;
  return true;
}

/**
 * Read and clear a Google callback once per page load. Missing/mismatched
 * `state` is an error so a crafted `?code=` cannot complete sign-in.
 */
export function consumeGoogleOAuthCallback(): OAuthConsumeResult {
  if (typeof window === "undefined" || consumedThisLoad) {
    return { kind: "none" };
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code && !state) {
    return { kind: "none" };
  }

  consumedThisLoad = true;
  window.history.replaceState({}, "", window.location.pathname);

  let saved: StoredOAuthState | null = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    saved = raw ? (JSON.parse(raw) as StoredOAuthState) : null;
  } catch {
    saved = null;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  if (!code || !state || !saved?.state || !saved.redirectUri || saved.state !== state) {
    return {
      kind: "error",
      message: "Google sign-in could not be verified. Please try again.",
    };
  }
  return { kind: "ok", code, redirectUri: saved.redirectUri };
}
