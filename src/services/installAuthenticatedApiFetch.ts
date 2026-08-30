import { auth } from '../lib/firebase';

let installed = false;

export function installAuthenticatedApiFetch() {
  if (installed || typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  const authenticatedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    // Firebase Storage media can be displayed by <img> while a programmatic
    // browser fetch is rejected by CORS in mobile/AI Studio previews. Route
    // those GET downloads through our same-origin backend.
    if ((!init.method || init.method.toUpperCase() === 'GET') && url.startsWith('https://firebasestorage.googleapis.com/')) {
      const proxyUrl = `/api/media/download?url=${encodeURIComponent(url)}`;
      return originalFetch(proxyUrl, init);
    }

    if (!url.startsWith('/api/generate/')) {
      return originalFetch(input, init);
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return originalFetch(input, init);

    const token = await currentUser.getIdToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
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
