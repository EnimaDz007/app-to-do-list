// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//  Features:
//    • Caches the token in memory for ~25s (avoids Clerk rate-limits)
//    • Deduplicates parallel getToken() calls into one network request
//    • Retries on null token (Clerk not ready)
//    • Forces fresh token and retries once on 401 (expired token)
// ─────────────────────────────────────────────────────────────

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

// How long to keep a fetched token before asking Clerk again.
// Clerk tokens last ~60s; 25s is safely inside that window.
const TOKEN_TTL_MS = 25_000;

export function makeAuthedFetch(getToken: TokenGetter) {
  // ── Per-instance token cache (shared across all calls) ──
  let cachedToken: string | null = null;
  let cachedAt = 0;
  let inflight: Promise<string | null> | null = null;

  async function fetchToken(skipCache = false): Promise<string | null> {
    const now = Date.now();
    if (!skipCache && cachedToken && now - cachedAt < TOKEN_TTL_MS) {
      return cachedToken;
    }
    // If another call is already fetching, share its promise
    if (inflight) return inflight;

    inflight = (async () => {
      try {
        const token = await getToken(skipCache ? { skipCache: true } : undefined);
        cachedToken = token;
        cachedAt = Date.now();
        return token;
      } catch {
        return null;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  }

  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    // ── 1. Get a token (cached or fresh) ──
    let token = await fetchToken();

    // ── 2. If Clerk returned null, wait and retry a few times ──
    if (!token) {
      for (const delay of [200, 400, 800, 1500]) {
        await new Promise((r) => setTimeout(r, delay));
        token = await fetchToken(true); // skipCache for these retries
        if (token) break;
      }
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let res = await fetch(url, { ...init, headers });

    // ── 3. If server rejected the token, force a fresh one and retry ──
    if (res.status === 401) {
      try {
        const fresh = await fetchToken(true); // skipCache = bypass stale cache
        if (fresh && fresh !== token) {
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set('Authorization', `Bearer ${fresh}`);
          res = await fetch(url, { ...init, headers: retryHeaders });
        }
      } catch {
        /* fall through, return original 401 */
      }
    }

    return res;
  };
}