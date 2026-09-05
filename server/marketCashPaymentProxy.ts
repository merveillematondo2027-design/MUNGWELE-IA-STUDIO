import express from 'express';

const INSTALL_FLAG = Symbol.for('mungwele.marketCashPaymentProxyInstalled');
const APP_FLAG = Symbol.for('mungwele.marketCashRoutesMounted');

type MarketCashRequestBody = {
  target?: {
    kind?: 'subscription' | 'credits';
    label?: string;
    amountUsd?: number;
    metadata?: Record<string, string | number>;
  };
  paymentMethod?: 'card';
  card?: {
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    cvv?: string;
  };
  captureMethod?: 'manual' | 'qr' | 'nfc';
  cvvEntry?: 'manual';
  userId?: string;
  userEmail?: string;
};

const cleanDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

function validateBody(body: MarketCashRequestBody) {
  const amountUsd = Number(body?.target?.amountUsd);
  const pan = cleanDigits(body?.card?.cardNumber);
  const cvv = cleanDigits(body?.card?.cvv);
  const expiry = String(body?.card?.expiry ?? '').trim();
  const cardHolder = String(body?.card?.cardHolder ?? '').trim();

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) throw Object.assign(new Error('Montant Market-Cash invalide.'), { status: 400 });
  if (pan.length < 12 || pan.length > 19) throw Object.assign(new Error('Numéro de carte invalide.'), { status: 400 });
  if (!cardHolder) throw Object.assign(new Error('Titulaire de carte requis.'), { status: 400 });
  if (!/^\d{2}\/\d{2}$/.test(expiry)) throw Object.assign(new Error('Expiration invalide.'), { status: 400 });
  if (cvv.length < 3 || cvv.length > 4) throw Object.assign(new Error('CVV invalide.'), { status: 400 });
  if (body?.cvvEntry !== 'manual') throw Object.assign(new Error('Le CVV doit être saisi manuellement.'), { status: 400 });
  if (!['manual', 'qr', 'nfc'].includes(String(body?.captureMethod))) throw Object.assign(new Error('Mode de lecture carte invalide.'), { status: 400 });

  return { amountUsd, pan, cvv, expiry, cardHolder };
}

async function marketCashHandler(req: express.Request, res: express.Response) {
  const apiKey = process.env.MARKET_CASH_API_KEY?.trim();
  const baseUrl = process.env.MARKET_CASH_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!apiKey || !baseUrl) {
    return res.status(503).json({
      error: 'Market-Cash n’est pas encore configuré côté serveur.',
      code: 'MARKET_CASH_NOT_CONFIGURED',
    });
  }

  try {
    const body = (req.body || {}) as MarketCashRequestBody;
    const { amountUsd, pan, cvv, expiry, cardHolder } = validateBody(body);

    const payload = {
      amount: amountUsd,
      currency: 'USD',
      description: String(body?.target?.label || 'Achat MUNGWELE IA STUDIO').slice(0, 140),
      merchantReference: `MUNGWELE-${Date.now()}`,
      source: {
        type: 'card',
        cardNumber: pan,
        cardHolder,
        expiry,
        cvv,
        captureMethod: body.captureMethod,
      },
      customer: {
        externalUserId: body.userId || undefined,
        email: body.userEmail || undefined,
      },
      metadata: {
        app: 'MUNGWELE-IA-STUDIO',
        targetKind: body?.target?.kind,
        ...(body?.target?.metadata || {}),
      },
    };

    const upstream = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'mungwele-ia-studio/market-cash',
      },
      body: JSON.stringify(payload),
    });

    const result: any = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
        error: result?.error || result?.message || 'Paiement Market-Cash refusé.',
        code: result?.code || 'MARKET_CASH_PAYMENT_FAILED',
      });
    }

    return res.json({
      success: result?.success !== false,
      status: result?.status || 'processed',
      transactionId: result?.transactionId || result?.id || result?.paymentId,
      reference: result?.reference || result?.merchantReference,
      message: result?.message || 'Paiement traité par Market-Cash.',
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: String(error?.message || 'Erreur Market-Cash inconnue.'),
      code: 'MARKET_CASH_PROXY_ERROR',
    });
  }
}

export function installMarketCashPaymentProxy() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);

    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/market-cash/status', (_req: express.Request, res: express.Response) => {
        res.json({ configured: Boolean(process.env.MARKET_CASH_API_KEY && process.env.MARKET_CASH_API_BASE_URL) });
      });
      this.post('/api/market-cash/payments', marketCashHandler);
    }

    return result;
  };
}
