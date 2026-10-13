// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
// ─────────────────────────────────────────────────────────────

/**
 * Create an authenticated fetch function.
 * Usage inside a component:
 *   const authedFetch = useAuthedFetch();
 *   const res = await authedFetch(url, { method: 'POST', ... });
 */
export function makeAuthedFetch(getToken: () => Promise<string | null>) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    const token = await getToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };
}