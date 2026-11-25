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
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ');

app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!c.req.path.startsWith('/api/media/') && !c.res.headers.has('Content-Security-Policy')) {
    c.header('Content-Security-Policy', APP_CSP);
  }
});

app.onError((err, c) => {
  if (isDriveError(err)) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 403 | 404 | 429 | 502);
  }
  console.error('Unhandled server error:', err);
  return c.json(
    {
      error: `Unexpected server or hosting error. Please try again or contact ${SUPPORT_EMAIL}.`,
      code: 'INTERNAL_ERROR'
    },
    500
  );
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
