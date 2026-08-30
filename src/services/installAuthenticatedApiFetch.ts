import { auth } from '../lib/firebase';

let installed = false;

export function installAuthenticatedApiFetch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('/api/generate/')) return originalFetch(input, init);

    const currentUser = auth.currentUser;
    if (!currentUser) return originalFetch(input, init);

    const token = await currentUser.getIdToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  }) as typeof window.fetch;
}
