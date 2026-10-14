// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call, with retry.
// ─────────────────────────────────────────────────────────────

export function makeAuthedFetch(getToken: () => Promise<string | null>) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    let token = await getToken();

    // Clerk sometimes returns null briefly during token refresh.
    // Retry once after a short delay to catch that window.
    if (!token) {
      await new Promise((r) => setTimeout(r, 500));
      token = await getToken();
    }

    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(url, { ...init, headers });
  };
}