// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//  Features:
//    • Dedupes parallel getToken() calls into one network request
//    • Retries on null token (Clerk not ready)
//    • Forces fresh token + retry on 401 (expired cached token)
//  Note: no long-lived cache here — Clerk's own cache handles that.
// ─────────────────────────────────────────────────────────────

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

export function makeAuthedFetch(getToken: TokenGetter) {
  // ── Deduped token fetch ──
  // Only ONE getToken() network call happens at a time across all parallel
  // requests. Clerk's own internal cache handles the "fresh vs cached"
  // decision — we just avoid hammering it with parallel calls.
  let inflight: Promise<string | null> | null = null;

  async function fetchToken(forceFresh = false): Promise<string | null> {
    if (inflight && !forceFresh) return inflight;

    inflight = (async () => {
      try {
        const token = await getToken(forceFresh ? { skipCache: true } : undefined);
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
    // ── 1. Get a token ──
    let token = await fetchToken();

    // ── 2. If Clerk returned null (not ready), retry with backoff ──
    if (!token) {
      for (const delay of [200, 400, 800, 1500]) {
        await new Promise((r) => setTimeout(r, delay));
        token = await fetchToken(true);
        if (token) break;
      }
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let res = await fetch(url, { ...init, headers });

    // ── 3. On 401, force a fresh token and retry once ──
    if (res.status === 401) {
      // Small delay: Clerk may still be committing the last session update
      await new Promise((r) => setTimeout(r, 250));
      try {
        const fresh = await fetchToken(true);
        if (fresh && fresh !== token) {
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set('Authorization', `Bearer ${fresh}`);
          res = await fetch(url, { ...init, headers: retryHeaders });
        }
      } catch {
        /* return the original 401 if refresh fails */
      }
    }

    return res;
  };
}