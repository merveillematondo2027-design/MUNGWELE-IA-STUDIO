import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import express from 'express';
import { firebaseAdminApp, adminDb } from './firebaseAdmin';

const INSTALL_FLAG = Symbol.for('mungwele.hostingSelfDeployInstalled');
const APP_FLAG = Symbol.for('mungwele.hostingSelfDeployRoutesMounted');
const DEPLOY_ID = 'market-cash-5585-frontend-v1';
const SITE_ID = 'diablo-design-ai';
const PROJECT_ID = 'diablo-design-ai';
const SERVICE_ID = 'mungwele-ia-studio-git';
const REGION = 'europe-west1';
const DIST_DIR = join(process.cwd(), 'dist');
const STATUS_REF = adminDb.doc(`ops_hosting_deploys/${DEPLOY_ID}`);

type PackedFile = { path: string; hash: string; gzip: Buffer };

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function packHostingFiles(): PackedFile[] {
  if (!existsSync(DIST_DIR)) throw new Error(`DIST_NOT_FOUND:${DIST_DIR}`);
  return listFiles(DIST_DIR)
    .filter((abs) => {
      const rel = relative(DIST_DIR, abs).split(sep).join('/');
      return rel !== 'server.cjs' && rel !== 'server.cjs.map' && !rel.startsWith('.');
    })
    .map((abs) => {
      const rel = relative(DIST_DIR, abs).split(sep).join('/');
      const gzip = gzipSync(readFileSync(abs), { level: 9 });
      const hash = createHash('sha256').update(gzip).digest('hex');
      return { path: `/${rel}`, hash, gzip };
    });
}

async function accessToken() {
  const credential: any = firebaseAdminApp.options.credential;
  if (!credential?.getAccessToken) throw new Error('GOOGLE_CREDENTIAL_UNAVAILABLE');
  const token = await credential.getAccessToken();
  if (!token?.access_token) throw new Error('GOOGLE_ACCESS_TOKEN_UNAVAILABLE');
  return token.access_token as string;
}

async function jsonRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 1000) }; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`;
    throw Object.assign(new Error(String(message)), { status: response.status, payload });
  }
  return payload;
}

async function acquireLock() {
  let acquired = false;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(STATUS_REF);
    const data: any = snap.data() || {};
    if (data.status === 'success') return;
    const updatedAt = Number(data.updatedAt || 0);
    if (data.status === 'running' && Date.now() - updatedAt < 10 * 60 * 1000) return;
    acquired = true;
    tx.set(STATUS_REF, {
      deployId: DEPLOY_ID,
      status: 'running',
      projectId: PROJECT_ID,
      siteId: SITE_ID,
      service: process.env.K_SERVICE || '',
      revision: process.env.K_REVISION || '',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
  });
  return acquired;
}

async function deployHosting() {
  if (process.env.K_SERVICE !== SERVICE_ID) return;
  if (!(await acquireLock())) return;

  try {
    const token = await accessToken();
    const files = packHostingFiles();
    if (!files.length) throw new Error('NO_HOSTING_FILES');

    const version = await jsonRequest(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          config: {
            rewrites: [
              { glob: '/api/**', run: { serviceId: SERVICE_ID, region: REGION } },
              { glob: '**', path: '/index.html' },
            ],
          },
        }),
      },
    );
    const versionName = String(version?.name || '');
    if (!versionName.startsWith(`sites/${SITE_ID}/versions/`)) throw new Error('HOSTING_VERSION_CREATE_INVALID');

    const fileMap = Object.fromEntries(files.map((file) => [file.path, file.hash]));
    const populated = await jsonRequest(
      `https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`,
      token,
      { method: 'POST', body: JSON.stringify({ files: fileMap }) },
    );

    const required = new Set<string>((populated?.uploadRequiredHashes || []).map(String));
    const uploadUrl = String(populated?.uploadUrl || '');
    if (required.size && !uploadUrl) throw new Error('HOSTING_UPLOAD_URL_MISSING');
    const byHash = new Map(files.map((file) => [file.hash, file.gzip]));

    for (const hash of required) {
      const body = byHash.get(hash);
      if (!body) throw new Error(`HOSTING_HASH_MISSING:${hash}`);
      const response = await fetch(`${uploadUrl}/${hash}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body,
      });
      if (!response.ok) throw new Error(`HOSTING_UPLOAD_FAILED:${hash}:${response.status}`);
    }

    await jsonRequest(
      `https://firebasehosting.googleapis.com/v1beta1/${versionName}?updateMask=status`,
      token,
      { method: 'PATCH', body: JSON.stringify({ status: 'FINALIZED' }) },
    );

    const release = await jsonRequest(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?versionName=${encodeURIComponent(versionName)}`,
      token,
      { method: 'POST' },
    );

    await STATUS_REF.set({
      status: 'success',
      versionName,
      releaseName: String(release?.name || ''),
      fileCount: files.length,
      uploadedCount: required.size,
      completedAt: Date.now(),
      updatedAt: Date.now(),
      error: null,
    }, { merge: true });
    console.log('[HOSTING_SELF_DEPLOY_SUCCESS]', versionName, release?.name || '');
  } catch (error: any) {
    const message = String(error?.message || error).slice(0, 1500);
    await STATUS_REF.set({
      status: 'error',
      error: message,
      errorStatus: Number(error?.status || 0) || null,
      failedAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true }).catch(() => undefined);
    console.error('[HOSTING_SELF_DEPLOY_ERROR]', message);
  }
}

export function installHostingSelfDeploy() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/ops/hosting-self-deploy-status', async (_req: express.Request, res: express.Response) => {
        try {
          const snap = await STATUS_REF.get();
          const data: any = snap.data() || {};
          res.json({
            deployId: DEPLOY_ID,
            status: data.status || 'pending',
            versionName: data.versionName || null,
            releaseName: data.releaseName || null,
            fileCount: data.fileCount || null,
            uploadedCount: data.uploadedCount ?? null,
            error: data.error || null,
            updatedAt: data.updatedAt || null,
          });
        } catch {
          res.status(500).json({ deployId: DEPLOY_ID, status: 'unknown' });
        }
      });
    }
    return result;
  };

  setTimeout(() => { void deployHosting(); }, 4000);
}
