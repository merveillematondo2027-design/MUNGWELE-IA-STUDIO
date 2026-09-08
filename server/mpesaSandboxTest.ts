import { constants, publicEncrypt } from 'node:crypto';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

const INSTALL_FLAG = Symbol.for('mungwele.mpesaSandboxTestInstalled');
const APP_FLAG = Symbol.for('mungwele.mpesaSandboxTestRoutesMounted');

// Public, non-secret Vodafone/M-Pesa OpenAPI Sandbox configuration for DRC.
const MPESA_SANDBOX_BASE_URL = 'https://openapi.m-pesa.com';
const MPESA_SANDBOX_MARKET = 'vodacomDRC';
const MPESA_SANDBOX_COUNTRY = 'DRC';
const MPESA_SANDBOX_CURRENCY = 'USD';
const MPESA_SANDBOX_ORIGIN = '*';
const MPESA_SANDBOX_TEST_MSISDN = '000000000001';
const MPESA_SANDBOX_SERVICE_PROVIDER_CODE = '000000';
const MPESA_SANDBOX_WARMUP_MS = 30_000;
const MPESA_SANDBOX_REQUEST_TIMEOUT_MS = 20_000;
const MPESA_SANDBOX_SESSION_TTL_MS = 3 * 60_000;

// Official OpenAPI RSA public key. This is public by design.
const MPESA_OPENAPI_PUBLIC_KEY_B64 =
  'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEArv9yxA69XQKBo24BaF/D+fvlqmGdYjqLQ5WtNBb5tquqGvAvG3WMFETVUSow/LizQalxj2ElMVrUmzu5mGGkxK08bWEXF7a1DEvtVJs6nppIlFJc2SnrU14AOrIrB28ogm58JjAl5BOQawOXD5dfSk7MaAA82pVHoIqEu0FxA8BOKU+RGTihRU+ptw1j4bsAJYiPbSX6i71gfPvwHPYamM0bfI4CmlsUUR3KvCG24rB6FNPcRBhM3jDuv8ae2kC33w9hEq8qNB55uw51vK7hyXoAa+U7IqP1y6nBdlN25gkxEA8yrsl1678cspeXr+3ciRyqoRgj9RD/ONbJhhxFvt1cLBh+qwK2eqISfBb06eRnNeC71oBokDm3zyCnkOtMDGl7IvnMfZfEPFCfg5QgJVk1msPpRvQxmEsrX9MQRyFVzgy2CWNIb7c+jPapyrNwoUbANlN8adU1m6yOuoX7F49x+OjiG2se0EJ6nafeKUXw/+hiJZvELUYgzKUtMAZVTNZfT8jjb58j8GVtuS+6TM2AutbejaCV84ZK58E2CRJqhmjQibEUO6KPdD7oTlEkFy52Y1uOOBXgYpqMzufNPmfdqqqSM4dU70PO8ogyKGiLAIxCetMjjm6FCMEA3Kc8K0Ig7/XtFm9By6VxTJK1Mg36TlHaZKP6VzVLXMtesJECAwEAAQ==';

const MPESA_OPENAPI_PUBLIC_KEY_PEM =
  '-----BEGIN PUBLIC KEY-----\n' +
  (MPESA_OPENAPI_PUBLIC_KEY_B64.match(/.{1,64}/g) || []).join('\n') +
  '\n-----END PUBLIC KEY-----';

const pendingSessions = new Map<string, { sessionId: string; expiresAt: number }>();
const clean = (value: unknown, max = 180) => String(value ?? '').trim().slice(0, max);

function encrypt(value: string) {
  return publicEncrypt(
    { key: MPESA_OPENAPI_PUBLIC_KEY_PEM, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(value, 'utf8'),
  ).toString('base64');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = MPESA_SANDBOX_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw Object.assign(new Error('M-Pesa Sandbox ne répond pas dans le délai prévu. Réessayez.'), { status: 504 });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function requireAdmin(req: express.Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Connexion administrateur requise.'), { status: 401 });
  const decoded = await adminAuth.verifyIdToken(header.slice(7).trim());
  const snap = await adminDb.collection('users').doc(decoded.uid).get();
  if (!snap.exists || String(snap.data()?.role || '') !== 'admin') {
    throw Object.assign(new Error('Accès administrateur requis.'), { status: 403 });
  }
  return decoded.uid;
}

function config() {
  const apiKey = clean(process.env.MPESA_SANDBOX_API_KEY, 4096);
  return {
    apiKey,
    configured: Boolean(apiKey),
    market: MPESA_SANDBOX_MARKET,
    country: MPESA_SANDBOX_COUNTRY,
    currency: MPESA_SANDBOX_CURRENCY,
    msisdn: MPESA_SANDBOX_TEST_MSISDN,
  };
}

async function startSandbox(uid: string) {
  const cfg = config();
  if (!cfg.configured) {
    throw Object.assign(new Error('Ajoutez uniquement MPESA_SANDBOX_API_KEY dans les secrets serveur.'), { status: 503 });
  }

  const sessionResponse = await fetchWithTimeout(
    `${MPESA_SANDBOX_BASE_URL}/sandbox/ipg/v2/${encodeURIComponent(cfg.market)}/getSession/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${encrypt(cfg.apiKey)}`,
        Origin: MPESA_SANDBOX_ORIGIN,
        Accept: 'application/json',
      },
    },
  );
  const sessionPayload: any = await sessionResponse.json().catch(() => ({}));
  const sessionId = clean(sessionPayload?.output_SessionID, 4096);
  if (!sessionResponse.ok || !sessionId) {
    throw Object.assign(
      new Error(clean(sessionPayload?.output_ResponseDesc || 'Session Sandbox refusée.', 300)),
      { status: sessionResponse.status >= 400 ? sessionResponse.status : 502 },
    );
  }

  pendingSessions.set(uid, { sessionId, expiresAt: Date.now() + MPESA_SANDBOX_SESSION_TTL_MS });
  return {
    ok: true,
    phase: 'warming' as const,
    waitMs: MPESA_SANDBOX_WARMUP_MS,
    environment: 'sandbox' as const,
    moneyMoved: false as const,
  };
}

async function completeSandbox(uid: string) {
  const cfg = config();
  const pending = pendingSessions.get(uid);
  if (!pending || pending.expiresAt <= Date.now()) {
    pendingSessions.delete(uid);
    throw Object.assign(
      new Error('La session Sandbox a été interrompue ou a expiré. Cliquez sur « Tester avec M-Pesa Sandbox » pour recommencer.'),
      { status: 409 },
    );
  }

  const stamp = Date.now().toString(36);
  const c2bResponse = await fetchWithTimeout(
    `${MPESA_SANDBOX_BASE_URL}/sandbox/ipg/v2/${encodeURIComponent(cfg.market)}/c2bPayment/singleStage/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${encrypt(pending.sessionId)}`,
        Origin: MPESA_SANDBOX_ORIGIN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        input_Amount: '1.00',
        input_Country: cfg.country,
        input_Currency: cfg.currency,
        input_CustomerMSISDN: cfg.msisdn,
        input_ServiceProviderCode: MPESA_SANDBOX_SERVICE_PROVIDER_CODE,
        input_ThirdPartyConversationID: `MIA${stamp}`.slice(0, 40),
        input_TransactionReference: `MIA${stamp}`.slice(0, 20),
        input_PurchasedItemsDesc: 'Mungwele IA sandbox verification',
      }),
    },
  );
  pendingSessions.delete(uid);

  const c2bPayload: any = await c2bResponse.json().catch(() => ({}));
  return {
    ok: c2bResponse.status === 201 && clean(c2bPayload?.output_ResponseCode, 32) === 'INS-0',
    httpStatus: c2bResponse.status,
    responseCode: clean(c2bPayload?.output_ResponseCode, 32),
    responseDesc: clean(c2bPayload?.output_ResponseDesc, 300),
    conversationId: clean(c2bPayload?.output_ConversationID, 120),
    environment: 'sandbox' as const,
    moneyMoved: false as const,
  };
}

async function verifySandbox(uid: string) {
  await startSandbox(uid);
  await new Promise((resolve) => setTimeout(resolve, MPESA_SANDBOX_WARMUP_MS));
  return completeSandbox(uid);
}

export function installMpesaSandboxTest() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;

      this.get('/api/mobile-money/mpesa/sandbox/status', async (req: express.Request, res: express.Response) => {
        try {
          await requireAdmin(req);
          const cfg = config();
          return res.json({
            enabled: true,
            configured: cfg.configured,
            environment: 'sandbox',
            market: cfg.market,
            country: cfg.country,
            currency: cfg.currency,
            testMsisdn: cfg.msisdn,
          });
        } catch (error: any) {
          return res.status(Number(error?.status || 500)).json({ error: String(error?.message || error) });
        }
      });

      // Two-step flow keeps Google AI Studio Preview from holding one HTTP request
      // open during M-Pesa's ~30 second SessionKey warm-up period.
      this.post('/api/mobile-money/mpesa/sandbox/start', async (req: express.Request, res: express.Response) => {
        try {
          const uid = await requireAdmin(req);
          return res.json(await startSandbox(uid));
        } catch (error: any) {
          console.warn('[MUNGWELE_MPESA_SANDBOX_START_ERROR]', String(error?.message || error));
          return res.status(Number(error?.status || 500)).json({
            ok: false,
            environment: 'sandbox',
            moneyMoved: false,
            error: String(error?.message || error),
          });
        }
      });

      this.post('/api/mobile-money/mpesa/sandbox/complete', async (req: express.Request, res: express.Response) => {
        try {
          const uid = await requireAdmin(req);
          const verification = await completeSandbox(uid);
          return res.status(verification.ok ? 200 : 502).json(verification);
        } catch (error: any) {
          console.warn('[MUNGWELE_MPESA_SANDBOX_COMPLETE_ERROR]', String(error?.message || error));
          return res.status(Number(error?.status || 500)).json({
            ok: false,
            environment: 'sandbox',
            moneyMoved: false,
            error: String(error?.message || error),
          });
        }
      });

      // Backward-compatible endpoint for older clients.
      this.post('/api/mobile-money/mpesa/sandbox/verify', async (req: express.Request, res: express.Response) => {
        try {
          const uid = await requireAdmin(req);
          const verification = await verifySandbox(uid);
          return res.status(verification.ok ? 200 : 502).json(verification);
        } catch (error: any) {
          console.warn('[MUNGWELE_MPESA_SANDBOX_VERIFY_ERROR]', String(error?.message || error));
          return res.status(Number(error?.status || 500)).json({
            ok: false,
            environment: 'sandbox',
            moneyMoved: false,
            error: String(error?.message || error),
          });
        }
      });
    }
    return result;
  };
}
