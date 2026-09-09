import { auth } from '../lib/firebase';

let installed = false;
const paymentAttempts = new Map<string, { id: string; createdAt: number }>();
const PAYMENT_ATTEMPT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_GENERATION_API_BASE_URL = 'https://mungwele-ia-studio-git-582509216306.europe-west1.run.app';
const GENERATION_API_BASE_URL = String(
  import.meta.env.VITE_GENERATION_API_BASE_URL || DEFAULT_GENERATION_API_BASE_URL,
).trim().replace(/\/+$/, '');

function paymentAttemptId(userId: string, init: RequestInit) {
  let targetKey = 'market-cash-purchase';
  try {
    if (typeof init.body === 'string') {
      const parsed = JSON.parse(init.body);
      const target = parsed?.target || {};
      const metadata = target?.metadata || {};
      targetKey = [
        String(target?.kind || ''),
        String(metadata?.packId || metadata?.planId || ''),
        String(metadata?.billingCycle || ''),
        String(target?.amountUsd || ''),
      ].join('|');
    }
  } catch {
    // Aucun détail carte n'est utilisé ni conservé pour l'idempotence.
  }

  const key = `${userId}|${targetKey}`;
  const now = Date.now();
  for (const [candidate, value] of paymentAttempts.entries()) {
    if (now - value.createdAt > PAYMENT_ATTEMPT_TTL_MS) paymentAttempts.delete(candidate);
  }

  const existing = paymentAttempts.get(key);
  if (existing && now - existing.createdAt <= PAYMENT_ATTEMPT_TTL_MS) return existing.id;

  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pay-${now}-${Math.random().toString(36).slice(2, 12)}`;
  paymentAttempts.set(key, { id, createdAt: now });
  return id;
}

function withPaymentAttempt(init: RequestInit, attemptId: string): RequestInit {
  if (typeof init.body !== 'string') return init;
  try {
    const parsed = JSON.parse(init.body);
    return { ...init, body: JSON.stringify({ ...parsed, attemptId }) };
  } catch {
    return init;
  }
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function resolvedApiUrl(input: RequestInfo | URL) {
  try {
    return new URL(requestUrl(input), window.location.origin);
  } catch {
    return null;
  }
}

function directCloudRunPath(pathname: string) {
  return pathname.startsWith('/api/generate/') || pathname.startsWith('/api/media/download');
}

function routeToGenerationApi(input: RequestInfo | URL, resolved: URL) {
  if (!GENERATION_API_BASE_URL || !directCloudRunPath(resolved.pathname)) return input;
  const targetUrl = `${GENERATION_API_BASE_URL}${resolved.pathname}${resolved.search}`;
  return input instanceof Request ? new Request(targetUrl, input) : targetUrl;
}

export function installAuthenticatedApiFetch() {
  if (installed || typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  const authenticatedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const resolved = resolvedApiUrl(input);
    const pathname = resolved?.pathname || requestUrl(input);
    const protectedApi =
      pathname.startsWith('/api/generate/')
      || pathname.startsWith('/api/media/download')
      || pathname.startsWith('/api/market-cash/')
      || pathname.startsWith('/api/admin/provider-wallet');
    const routedInput = resolved ? routeToGenerationApi(input, resolved) : input;

    if (!protectedApi) return originalFetch(routedInput, init);

    const currentUser = auth.currentUser;
    if (!currentUser) return originalFetch(routedInput, init);

    const token = await currentUser.getIdToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);

    let nextInit: RequestInit = { ...init, headers };
    if (pathname.startsWith('/api/market-cash/payments')) {
      const attemptId = paymentAttemptId(currentUser.uid, init);
      headers.set('X-Mungwele-Payment-Attempt', attemptId);
      nextInit = { ...withPaymentAttempt(nextInit, attemptId), headers };
    }

    return originalFetch(routedInput, nextInit);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: authenticatedFetch,
    });
    installed = true;
  } catch (error) {
    console.warn('[AUTH_FETCH_INSTALL_WARNING] Impossible d’installer le wrapper fetch authentifié.', error);
  }
}
