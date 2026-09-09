type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let installed = false;
const MAX_ATTEMPTS = 3;
const OPENAI_IMAGE_PREFIX = 'https://api.openai.com/v1/images/';

function requestUrl(input: FetchInput) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isOpenAIImageRequest(input: FetchInput) {
  return requestUrl(input).startsWith(OPENAI_IMAGE_PREFIX);
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function transientNetworkError(error: unknown) {
  const message = String((error as any)?.message || error || '').toLowerCase();
  const code = String((error as any)?.cause?.code || (error as any)?.code || '').toUpperCase();
  return error instanceof TypeError
    || message.includes('fetch failed')
    || message.includes('network')
    || message.includes('socket')
    || message.includes('timeout')
    || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'ECONNREFUSED'].includes(code);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt: number) {
  return 700 * (2 ** attempt) + Math.floor(Math.random() * 250);
}

function friendlyTemporaryResponse(status = 503) {
  return new Response(JSON.stringify({
    error: {
      message: 'Le service image OpenAI est temporairement indisponible. Réessayez dans quelques instants.',
      code: 'OPENAI_IMAGE_TEMPORARILY_UNAVAILABLE',
    },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installOpenAIImageRetry() {
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => {
    if (!isOpenAIImageRequest(input)) return originalFetch(input, init);

    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const attemptInput = input instanceof Request ? input.clone() : input;
        const response = await originalFetch(attemptInput, init);

        if (!retryableStatus(response.status)) return response;
        if (attempt === MAX_ATTEMPTS - 1) {
          if (response.status === 429) return response;
          await response.body?.cancel().catch(() => undefined);
          return friendlyTemporaryResponse(response.status >= 500 ? 503 : response.status);
        }

        console.warn(`[OPENAI_IMAGE_RETRY] HTTP ${response.status}; nouvelle tentative ${attempt + 2}/${MAX_ATTEMPTS}.`);
        await response.body?.cancel().catch(() => undefined);
        await wait(retryDelay(attempt));
      } catch (error) {
        lastError = error;
        if (!transientNetworkError(error) || attempt === MAX_ATTEMPTS - 1) break;
        console.warn(`[OPENAI_IMAGE_RETRY] Erreur réseau; nouvelle tentative ${attempt + 2}/${MAX_ATTEMPTS}.`, error);
        await wait(retryDelay(attempt));
      }
    }

    const error = Object.assign(
      new Error('Le service image OpenAI est temporairement indisponible. Réessayez dans quelques instants.'),
      {
        status: 503,
        code: 'OPENAI_IMAGE_TEMPORARILY_UNAVAILABLE',
        cause: lastError,
      },
    );
    throw error;
  }) as typeof globalThis.fetch;
}
