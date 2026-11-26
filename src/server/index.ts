import { Hono } from 'hono';
import { SUPPORT_EMAIL } from '../shared/contact';
import { bibleRouter } from './routes/bible';
import { galleriesRouter, isDriveError } from './routes/galleries';
import { mediaRouter } from './routes/media';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

const isViteDev = Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;

const APP_CSP = [
  "default-src 'self'",
  isViteDev
    ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"
    : "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  isViteDev
    ? "connect-src 'self' ws: wss: https://challenges.cloudflare.com"
    : "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  ...(isViteDev ? [] : ['upgrade-insecure-requests'])
].join('; ');

function isSameOriginHeader(headerValue: string, expectedOrigin: string): boolean {
  try {
    return new URL(headerValue).origin === expectedOrigin;
  } catch {
    return false;
  }
}

app.use('/api/*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    const reqOrigin = new URL(c.req.url).origin;
    const origin = c.req.header('origin');
    const referer = c.req.header('referer');
    if (origin && !isSameOriginHeader(origin, reqOrigin)) {
      return c.json({ error: 'Cross-origin request blocked.', code: 'FORBIDDEN_ORIGIN' }, 403);
    }
    if (!origin && referer && !isSameOriginHeader(referer, reqOrigin)) {
      return c.json({ error: 'Cross-origin referer blocked.', code: 'FORBIDDEN_ORIGIN' }, 403);
    }
  }
  await next();
});

app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Cross-Origin-Resource-Policy', 'same-origin');
  if (c.req.url.startsWith('https://')) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (!c.req.path.startsWith('/api/media/') && !c.res.headers.has('Content-Security-Policy')) {
    c.header('Content-Security-Policy', APP_CSP);
  }
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/g/')) {
    c.header('X-Robots-Tag', 'noindex, nofollow');
  }
});

app.onError((err, c) => {
  if (isDriveError(err)) {
    const safeMessage =
      err.statusCode >= 500
        ? `Unable to reach Google Drive right now. Please try again shortly, or contact ${SUPPORT_EMAIL}.`
        : err.message;
    return c.json(
      { error: safeMessage, code: err.code },
      err.statusCode as 400 | 403 | 404 | 429 | 502
    );
  }
  console.error('Unhandled server error:', err instanceof Error ? err.message : 'Unknown error');
  return c.json(
    {
      error: `Unexpected server or hosting error. Please try again or contact ${SUPPORT_EMAIL}.`,
      code: 'INTERNAL_ERROR'
    },
    500
  );
});

app.get('/robots.txt', (c) => {
  const origin = new URL(c.req.url).origin;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /g/',
    'Disallow: /api/',
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n');
  return c.text(body, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

app.get('/sitemap.xml', (c) => {
  const origin = new URL(c.req.url).origin;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api', bibleRouter);
app.route('/api', galleriesRouter);
app.route('/api', mediaRouter);

app.all('/api/*', (c) => c.json({ error: 'API route not found.' }, 404));

// Fallback to Cloudflare Static Assets SPA for frontend routes (/g/:slug, etc.)
app.get('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not found', 404);
});

export default app;
