import express from 'express';
import type { NextFunction, Request, Response } from 'express';

let installed = false;
const originalInit = express.application.init;
const originalUse = express.application.use;

function configuredOrigins() {
  const raw = String(process.env.CORS_ALLOWED_ORIGINS || '*').trim();
  if (!raw || raw === '*') return { allowAny: true, values: new Set<string>() };
  const values = new Set(
    raw
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  );
  return { allowAny: false, values };
}

function cloudRunCors(req: Request, res: Response, next: NextFunction) {
  const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
  if (!origin) return next();

  const allowed = configuredOrigins();
  const originAllowed = allowed.allowAny || allowed.values.has(origin);
  if (!originAllowed) {
    if (req.method === 'OPTIONS') return res.status(403).end();
    return res.status(403).json({ error: 'Origine non autorisée.', code: 'CORS_ORIGIN_DENIED' });
  }

  res.setHeader('Access-Control-Allow-Origin', allowed.allowAny ? '*' : origin);
  if (!allowed.allowAny) res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Mungwele-Payment-Attempt');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
}

export function installCloudRunCors() {
  if (installed) return;
  installed = true;

  // server-entry.ts executes this before server.ts creates the Express app.
  // Hooking init lets every future app instance receive CORS before auth/routes,
  // while keeping server.ts unchanged and preserving the current App Hosting path.
  express.application.init = function patchedInit(this: any, ...args: any[]) {
    const result = originalInit.apply(this, args as any);
    originalUse.call(this, cloudRunCors);
    return result;
  } as any;
}
