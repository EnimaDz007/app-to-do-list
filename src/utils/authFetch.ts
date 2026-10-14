// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//  Handles two failure modes:
//    1. getToken() returns null (Clerk not ready) → retry with backoff
//    2. Server returns 401 (token expired/invalid) → force fresh token, retry once
// ─────────────────────────────────────────────────────────────

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

export function makeAuthedFetch(getToken: TokenGetter) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    // ── 1. Try to get a token, retrying if Clerk returns null ──
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }

    if (!token) {
      // Clerk can return null briefly during page load / session hydration
      for (const delay of [200, 400, 800, 1500]) {
        await new Promise((r) => setTimeout(r, delay));
        try {
          token = await getToken();
        } catch {
          token = null;
        }
        if (token) break;
      }
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let res = await fetch(url, { ...init, headers });

    // ── 2. If the server rejected the token, force a fresh one and retry ──
    // This handles the case where Clerk's cached token has expired but
    // Clerk still returns it. skipCache forces a network refresh.
    if (res.status === 401) {
      try {
        const freshToken = await getToken({ skipCache: true });
        if (freshToken) {
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set('Authorization', `Bearer ${freshToken}`);
          res = await fetch(url, { ...init, headers: retryHeaders });
        }
      } catch (err) {
        // Swallow — the original 401 will be returned to the caller
        if (import.meta.env.DEV) {
          console.warn('Token refresh on 401 failed:', err);
        }
      }
    }

    return res;
  };
}