// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//
//  Hardened:
//    • Deduped getToken()
//    • Retries on null token with longer backoff (Clerk not ready)
//    • Throws when token is unavailable — never sends unauthenticated
//    • Forces fresh token + retry on 401
//    • Fetch timeout via AbortController
//    • Retries on 5xx / network errors
//    • Preserves caller-supplied AbortSignal
// ─────────────────────────────────────────────────────────────

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRY_5XX_ATTEMPTS = 2;
const RETRY_5XX_BACKOFF  = 400;
const TOKEN_RETRY_DELAYS = [200, 400, 800, 1200, 1600, 2000, 2500, 3000]; // ~11.7s total

export class AuthTokenUnavailableError extends Error {
  constructor() {
    super('Clerk token unavailable — request aborted');
    this.name = 'AuthTokenUnavailableError';
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const callerSignal = init.signal;
  const controller = new AbortController();

  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

export function makeAuthedFetch(getToken: TokenGetter) {
  let inflight: Promise<string | null> | null = null;

  async function fetchToken(forceFresh = false): Promise<string | null> {
    if (inflight && !forceFresh) return inflight;

    inflight = (async () => {
      try {
        return await getToken(forceFresh ? { skipCache: true } : undefined);
      } catch {
        return null;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  }

  async function ensureToken(): Promise<string> {
    let token = await fetchToken();
    if (token) return token;

    for (const delay of TOKEN_RETRY_DELAYS) {
      await new Promise((r) => setTimeout(r, delay));
      token = await fetchToken(true);
      if (token) return token;
    }

    // Token genuinely unavailable — refuse to send unauthenticated.
    throw new AuthTokenUnavailableError();
  }

  return async (
    url: string,
    init: RequestInit = {},
    options: { timeoutMs?: number } = {},
  ): Promise<Response> => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let token = await ensureToken();

    const buildHeaders = (tok: string): Headers => {
      const h = new Headers(init.headers || {});
      h.set('Authorization', `Bearer ${tok}`);
      return h;
    };

    let res: Response | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= RETRY_5XX_ATTEMPTS; attempt++) {
      try {
        res = await fetchWithTimeout(
          url,
          { ...init, headers: buildHeaders(token) },
          timeoutMs,
        );

        if (res.status < 500) break;

        if (attempt < RETRY_5XX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_5XX_BACKOFF * Math.pow(2, attempt)));
          continue;
        }
      } catch (err) {
        lastError = err;
        if (init.signal?.aborted) throw err;

        if (attempt < RETRY_5XX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_5XX_BACKOFF * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }

    if (!res) {
      throw lastError instanceof Error ? lastError : new Error('Network request failed');
    }

    // 401 → refresh token once and retry
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const fresh = await fetchToken(true);
        if (fresh && fresh !== token) {
          res = await fetchWithTimeout(
            url,
            { ...init, headers: buildHeaders(fresh) },
            timeoutMs,
          );
        }
      } catch {
        /* keep original 401 */
      }
    }

    return res;
  };
}