import { Hono } from 'hono';
import { galleriesRouter, isDriveError } from './routes/galleries';
import { mediaRouter } from './routes/media';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (isDriveError(err)) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 403 | 404 | 429 | 502);
  }
  console.error('Unhandled server error:', err);
  return c.json({ error: 'Unexpected server error.', code: 'INTERNAL_ERROR' }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true }));
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
