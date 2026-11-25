import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyUnlockToken } from '../crypto';
import {
  buildDriveMediaStreamUrl,
  buildThumbnailSizedUrl,
  fetchDriveThumbnailUrl
} from '../drive';
import { getMediaManifest } from '../storage';
import type { Env } from '../types';
import { getSigningSecret, unlockCookieName } from './galleries';

export const mediaRouter = new Hono<{ Bindings: Env }>();

function safeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, '_');
}

function runWaitUntil(
  c: { executionCtx?: { waitUntil: (promise: Promise<unknown>) => void } },
  promise: Promise<unknown>
): void {
  try {
    c.executionCtx?.waitUntil(promise);
  } catch {
    // Ignore outside Workers execution context
  }
}

mediaRouter.get('/media/:slug/:fileId', async (c) => {
  const slug = c.req.param('slug');
  const fileId = c.req.param('fileId');
  const variant = c.req.query('variant') === 'full' ? 'full' : 'thumb';
  const widthParam = Number(c.req.query('w') || '800');
  const wantDownload = c.req.query('download') === '1';

  const manifest = await getMediaManifest(c.env.CACHE, c.env.DB, slug);
  if (!manifest) {
    return c.json({ error: 'Gallery not found.' }, 404);
  }
  if (manifest.status === 'blocked') {
    return c.json({ error: 'Gallery disabled.' }, 403);
  }
  if (manifest.expiresAt && manifest.expiresAt <= Date.now()) {
    return c.json({ error: 'Gallery expired.' }, 410);
  }

  const fileMeta = manifest.fileIds[fileId];
  if (!fileMeta) {
    return c.json({ error: 'File not found in this gallery.' }, 404);
  }
  if (wantDownload && !manifest.allowDownload) {
    return c.json({ error: 'Downloads are disabled for this gallery.' }, 403);
  }

  if (manifest.hasPassword) {
    const token = getCookie(c, unlockCookieName(slug));
    const ok = await verifyUnlockToken(token, slug, getSigningSecret(c.env));
    if (!ok) {
      return c.json({ error: 'Password unlock required.' }, 401);
    }
  }

  const isPublic = !manifest.hasPassword;
  const cacheControl = isPublic
    ? variant === 'thumb'
      ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'public, max-age=3600'
    : 'private, no-store';

  const edgeCache =
    isPublic && variant === 'thumb' && typeof caches !== 'undefined'
      ? (caches as unknown as { default?: Cache }).default
      : undefined;
  const cacheKey = edgeCache ? new Request(c.req.url, { method: 'GET' }) : undefined;

  if (edgeCache && cacheKey) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (variant === 'thumb') {
    const thumbLink = await fetchDriveThumbnailUrl(fileId, c.env.GOOGLE_DRIVE_API_KEY);
    if (thumbLink) {
      const sizedUrl = buildThumbnailSizedUrl(
        thumbLink,
        Number.isFinite(widthParam) ? widthParam : 800
      );
      const upstream = await fetch(sizedUrl);
      if (upstream.ok && upstream.body) {
        const headers = new Headers();
        headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', cacheControl);
        headers.set('X-Content-Type-Options', 'nosniff');

        const response = new Response(upstream.body, {
          status: 200,
          headers
        });

        if (edgeCache && cacheKey) {
          runWaitUntil(c, edgeCache.put(cacheKey, response.clone()));
        }
        return response;
      }
    }
  }

  // Fallback for missing thumbnails or variant=full (photos, downloads, HD video Range streaming)
  const upstreamHeaders = new Headers();
  const range = c.req.header('range');
  if (range) {
    upstreamHeaders.set('Range', range);
  }

  const streamUrl = buildDriveMediaStreamUrl(fileId, c.env.GOOGLE_DRIVE_API_KEY);
  const upstream = await fetch(streamUrl, { headers: upstreamHeaders });

  if (!upstream.ok && upstream.status !== 206) {
    return c.json(
      { error: 'Unable to stream media from Google Drive.', status: upstream.status },
      upstream.status === 404 ? 404 : 502
    );
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('Content-Type') || fileMeta.mimeType || 'application/octet-stream'
  );
  const contentLength = upstream.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);
  const contentRange = upstream.headers.get('Content-Range');
  if (contentRange) headers.set('Content-Range', contentRange);
  headers.set('Accept-Ranges', upstream.headers.get('Accept-Ranges') || 'bytes');
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set(
    'Content-Disposition',
    `${wantDownload ? 'attachment' : 'inline'}; filename="${safeFilename(fileMeta.name)}"`
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
});
