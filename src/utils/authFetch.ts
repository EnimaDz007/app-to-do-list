// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/authFetch.ts
//  Adds Clerk session token to every API call.
//
//  Features:
//    • Dedupes parallel getToken() calls into one network request
//    • Retries on null token (Clerk not ready)
//    • Forces fresh token + retry on 401 (expired cached token)
//    • Fetch timeout via AbortController
//    • Retries on 5xx / network errors with exponential backoff
//    • Preserves caller-supplied AbortSignal
// ─────────────────────────────────────────────────────────────

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRY_5XX_ATTEMPTS = 2;   // total attempts = 1 + 2 = 3
const RETRY_5XX_BACKOFF  = 400; // ms, doubles each attempt

/** Race fetch against a timeout. Preserves caller signal if provided. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  // If the caller already provided a signal, chain both.
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
  // ── Deduped token fetch ──
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

  return async (
    url: string,
    init: RequestInit = {},
    options: { timeoutMs?: number } = {},
  ): Promise<Response> => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // ── 1. Get a token ──
    let token = await fetchToken();

    // ── 2. Clerk not ready → retry with backoff ──
    if (!token) {
      for (const delay of [200, 400, 800, 1500]) {
        await new Promise((r) => setTimeout(r, delay));
        token = await fetchToken(true);
        if (token) break;
      }
    }

    const buildHeaders = (tok: string | null): Headers => {
      const h = new Headers(init.headers || {});
      if (tok) h.set('Authorization', `Bearer ${tok}`);
      return h;
    };

    // ── 3. Initial attempt with 5xx / network retry ──
    let lastError: unknown = null;
    let res: Response | null = null;

    for (let attempt = 0; attempt <= RETRY_5XX_ATTEMPTS; attempt++) {
      try {
        res = await fetchWithTimeout(
          url,
          { ...init, headers: buildHeaders(token) },
          timeoutMs,
        );

        // Non-5xx → done, no retry
        if (res.status < 500) break;

        // 5xx → retry unless last attempt
        if (attempt < RETRY_5XX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_5XX_BACKOFF * Math.pow(2, attempt)));
          continue;
        }
        // last attempt failed with 5xx — fall through to return res
      } catch (err) {
        lastError = err;
        // Caller aborted → propagate immediately
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

    // ── 4. On 401, force a fresh token and retry once ──
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
        /* return original 401 if refresh fails */
      }
    }

    return res;
  };
}