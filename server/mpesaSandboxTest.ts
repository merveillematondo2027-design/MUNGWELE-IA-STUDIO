import { constants, publicEncrypt } from 'node:crypto';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

const INSTALL_FLAG = Symbol.for('mungwele.mpesaSandboxTestInstalled');
const APP_FLAG = Symbol.for('mungwele.mpesaSandboxTestRoutesMounted');

const clean = (value: unknown, max = 180) => String(value ?? '').trim().slice(0, max);
const enabled = () => ['1', 'true', 'yes', 'on'].includes(String(process.env.MPESA_SANDBOX_ENABLED || '').toLowerCase());

function normalizePublicKey(value: string) {
  const normalized = String(value || '').replace(/\\n/g, '\n').trim();
  if (!normalized) throw new Error('Clé publique M-Pesa Sandbox absente.');
  if (normalized.includes('-----BEGIN')) return normalized;
  const compact = normalized.replace(/\s+/g, '');
  const body = compact.match(/.{1,64}/g)?.join('\n') || compact;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function encrypt(value: string, publicKey: string) {
  return publicEncrypt(
    { key: normalizePublicKey(publicKey), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(value, 'utf8'),
  ).toString('base64');
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
  const apiKey = clean(process.env.MPESA_SANDBOX_API_KEY || process.env.MPESA_API_KEY, 4096);
  const publicKey = String(process.env.MPESA_SANDBOX_PUBLIC_KEY || process.env.MPESA_PUBLIC_KEY || '').trim();
  const origin = clean(process.env.MPESA_ORIGIN || process.env.APP_URL || '*', 255) || '*';
  return {
    apiKey,
    publicKey,
    origin,
    configured: enabled() && Boolean(apiKey && publicKey),
    market: clean(process.env.MPESA_MARKET || 'vodacomDRC', 32),
    country: clean(process.env.MPESA_COUNTRY || 'DRC', 8),
    currency: clean(process.env.MPESA_CURRENCY || 'USD', 8),
    msisdn: clean(process.env.MPESA_SANDBOX_TEST_MSISDN || '000000000001', 20),
    warmupMs: Math.max(0, Math.min(30_000, Number(process.env.MPESA_SANDBOX_WARMUP_MS || 30_000))),
  };
}

async function verifySandbox() {
  const cfg = config();
  if (!cfg.configured) throw Object.assign(new Error('Sandbox M-Pesa non configuré côté serveur.'), { status: 503 });

  const sessionResponse = await fetch(`https://openapi.m-pesa.com/sandbox/ipg/v2/${encodeURIComponent(cfg.market)}/getSession/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${encrypt(cfg.apiKey, cfg.publicKey)}`,
      Origin: cfg.origin,
      Accept: 'application/json',
    },
  });
  const sessionPayload: any = await sessionResponse.json().catch(() => ({}));
  const sessionId = clean(sessionPayload?.output_SessionID, 4096);
  if (!sessionResponse.ok || !sessionId) {
    throw Object.assign(new Error(clean(sessionPayload?.output_ResponseDesc || 'Session Sandbox refusée.', 300)), { status: 502 });
  }

  if (cfg.warmupMs) await new Promise((resolve) => setTimeout(resolve, cfg.warmupMs));

  const stamp = Date.now().toString(36);
  const c2bResponse = await fetch(`https://openapi.m-pesa.com/sandbox/ipg/v2/${encodeURIComponent(cfg.market)}/c2bPayment/singleStage/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${encrypt(sessionId, cfg.publicKey)}`,
      Origin: cfg.origin,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      input_Amount: '1.00',
      input_Country: cfg.country,
      input_Currency: cfg.currency,
      input_CustomerMSISDN: cfg.msisdn,
      input_ServiceProviderCode: '000000',
      input_ThirdPartyConversationID: `MIA${stamp}`.slice(0, 40),
      input_TransactionReference: `MIA${stamp}`.slice(0, 20),
      input_PurchasedItemsDesc: 'Mungwele IA sandbox verification',
    }),
  });
  const c2bPayload: any = await c2bResponse.json().catch(() => ({}));
  return {
    ok: c2bResponse.status === 201 && clean(c2bPayload?.output_ResponseCode, 32) === 'INS-0',
    httpStatus: c2bResponse.status,
    responseCode: clean(c2bPayload?.output_ResponseCode, 32),
    responseDesc: clean(c2bPayload?.output_ResponseDesc, 300),
    conversationId: clean(c2bPayload?.output_ConversationID, 120),
    environment: 'sandbox',
    moneyMoved: false,
  };
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
          return res.json({ enabled: enabled(), configured: cfg.configured, environment: 'sandbox', market: cfg.market, country: cfg.country, currency: cfg.currency, testMsisdn: cfg.msisdn });
        } catch (error: any) {
          return res.status(Number(error?.status || 500)).json({ error: String(error?.message || error) });
        }
      });
      this.post('/api/mobile-money/mpesa/sandbox/verify', async (req: express.Request, res: express.Response) => {
        try {
          await requireAdmin(req);
          const verification = await verifySandbox();
          return res.status(verification.ok ? 200 : 502).json(verification);
        } catch (error: any) {
          console.warn('[MUNGWELE_MPESA_SANDBOX_VERIFY_ERROR]', String(error?.message || error));
          return res.status(Number(error?.status || 500)).json({ ok: false, environment: 'sandbox', moneyMoved: false, error: String(error?.message || error) });
        }
      });
    }
    return result;
  };
}
