import { auth } from '../lib/firebase';

let installed = false;
const paymentAttempts = new Map<string, { id: string; createdAt: number }>();
const PAYMENT_ATTEMPT_TTL_MS = 5 * 60 * 1000;

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

export function installAuthenticatedApiFetch() {
  if (installed || typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  const authenticatedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const protectedApi =
      url.startsWith('/api/generate/')
      || url.startsWith('/api/media/download')
      || url.startsWith('/api/market-cash/');
    if (!protectedApi) return originalFetch(input, init);

    const currentUser = auth.currentUser;
    if (!currentUser) return originalFetch(input, init);

    const token = await currentUser.getIdToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);

    if (url.startsWith('/api/market-cash/payments')) {
      headers.set('X-Mungwele-Payment-Attempt', paymentAttemptId(currentUser.uid, init));
    }

    return originalFetch(input, { ...init, headers });
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
