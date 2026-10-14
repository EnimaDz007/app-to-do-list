// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//  Retries on null token (Clerk sometimes returns null during
//  the brief token-refresh window right after page load or
//  right after an action).
// ─────────────────────────────────────────────────────────────

export function makeAuthedFetch(getToken: () => Promise<string | null>) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    // Try to get a token, retrying up to 5 times with backoff.
    // Clerk can return null while it's refreshing the session.
    let token: string | null = null;
    const delays = [0, 200, 400, 800, 1500]; // total wait ~2.9s worst case
    for (const delay of delays) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      try {
        token = await getToken();
      } catch {
        token = null;
      }
      if (token) break;
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(url, { ...init, headers });
  };
}