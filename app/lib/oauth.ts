const STORAGE_KEY = "rag-oauth-state";

/**
 * The single path Google redirects back to. Pinned rather than derived from
 * `window.location.pathname`, which produced a different redirect URI for every
 * route that renders the auth form (`/login`, `/dashboard`, anywhere
 * SettingsPanel opens) — each one needing its own entry in the Google console,
 * and failing at Google if unregistered.
 *
 * `/dashboard` is the deliberate choice: it predates the `/login` route, so it
 * is the URI existing deployments already have registered, and it is where a
 * successful sign-in should land anyway. `OAuthCallback` is mounted there (and
 * inside AuthForm), so the callback is handled wherever sign-in began.
 */
const REDIRECT_PATH = "/dashboard";

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
  // `randomUUID` needs a secure context; `getRandomValues` does not. Prefer it
  // over Math.random so the CSRF token stays cryptographically random on
  // http:// origins (common for self-hosted LAN deployments).
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Start Google authorization with a CSRF `state` bound to this tab.
 * Fails closed (returns false) if sessionStorage cannot hold the state.
 */
export function startGoogleOAuth(clientId: string): boolean {
  const state = randomState();
  const redirectUri = `${window.location.origin}${REDIRECT_PATH}`;
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
  const oauthError = params.get("error");
  if (!code && !state && !oauthError) {
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

  // Google reports a declined consent screen as ?error=access_denied. Surface
  // that as its own message instead of the generic verification failure, which
  // wrongly implied something was tampered with.
  if (oauthError) {
    return {
      kind: "error",
      message:
        oauthError === "access_denied"
          ? "Google sign-in was cancelled."
          : `Google sign-in failed (${oauthError}).`,
    };
  }

  if (!code || !state || !saved?.state || !saved.redirectUri || saved.state !== state) {
    return {
      kind: "error",
      message: "Google sign-in could not be verified. Please try again.",
    };
  }
  return { kind: "ok", code, redirectUri: saved.redirectUri };
}
