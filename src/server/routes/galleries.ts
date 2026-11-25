import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type {
  GalleryFolder,
  GalleryLayout,
  GalleryTheme,
  MediaItem,
  PublicGalleryConfig
} from '../../shared/types';
import {
  generateSlug,
  hashPassword,
  randomToken,
  sanitizeCustomSlug,
  sha256Hex,
  signUnlockToken,
  timingSafeEqual,
  verifyPassword,
  verifyTurnstile,
  verifyUnlockToken
} from '../crypto';
import { DriveError, extractDriveFolderId, fetchDriveFolderTree } from '../drive';
import {
  checkRateLimit,
  getGalleryBySlug,
  invalidateGalleryCache,
  saveManifestCache
} from '../storage';
import type { Env, GalleryRow } from '../types';

export const galleriesRouter = new Hono<{ Bindings: Env }>();

export function getSigningSecret(env: Env): string {
  return env.COOKIE_SIGNING_SECRET || env.GOOGLE_DRIVE_API_KEY || 'local-dev-signing-secret';
}

export function unlockCookieName(slug: string): string {
  return `uc_unlock_${slug}`;
}

function sanitizeHttpUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function validateLayout(raw: unknown): GalleryLayout {
  if (raw === 'grid' || raw === 'justified' || raw === 'masonry') return raw;
  return 'masonry';
}

function validateTheme(raw: unknown): GalleryTheme {
  return raw === 'dark' ? 'dark' : 'light';
}

function computeExpiryTimestamp(days: unknown): number | null {
  if (days === null || days === undefined || days === '') return null;
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return null;
  const clamped = Math.min(n, 365);
  return Date.now() + clamped * 24 * 60 * 60 * 1000;
}

function toPublicConfig(row: GalleryRow): PublicGalleryConfig {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverFileId: row.cover_file_id,
    layout: row.layout,
    theme: row.theme,
    brandName: row.brand_name,
    brandUrl: row.brand_url,
    allowDownload: row.allow_download === 1,
    allowLikes: row.allow_likes === 1,
    hasPassword: Boolean(row.password_hash),
    expiresAt: row.expires_at,
    itemCount: row.item_count,
    viewCount: row.view_count,
    syncedAt: row.synced_at,
    createdAt: row.created_at
  };
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
}

function runWaitUntil(
  c: { executionCtx?: { waitUntil: (promise: Promise<unknown>) => void } },
  promise: Promise<unknown>
): void {
  try {
    c.executionCtx?.waitUntil(promise);
  } catch {
    // Ignore when running outside Workers execution context (e.g. unit tests)
  }
}

async function requireGalleryAdmin(
  db: D1Database,
  slug: string,
  authHeader: string | undefined
): Promise<GalleryRow | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const row = await getGalleryBySlug(db, slug);
  if (!row) return null;

  const tokenHash = await sha256Hex(token);
  if (!timingSafeEqual(tokenHash, row.admin_token_hash)) return null;
  return row;
}

galleriesRouter.get('/config', (c) => {
  return c.json({
    appName: c.env.PUBLIC_APP_NAME || 'UnwrittenChapters',
    donateUrl: c.env.PUBLIC_DONATE_URL || '',
    turnstileSiteKey: c.env.PUBLIC_TURNSTILE_SITE_KEY || '',
    turnstileRequired: Boolean(c.env.TURNSTILE_SECRET_KEY)
  });
});

galleriesRouter.post('/galleries', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.driveUrl !== 'string') {
    return c.json({ error: 'Please provide a Google Drive folder link.', code: 'INVALID_INPUT' }, 400);
  }

  const ip = getClientIp(c);
  const turnstileOk = await verifyTurnstile(
    typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
    c.env.TURNSTILE_SECRET_KEY,
    ip
  );
  if (!turnstileOk) {
    return c.json({ error: 'Human verification failed. Please try again.', code: 'TURNSTILE_FAILED' }, 403);
  }

  const allowed = await checkRateLimit(c.env.CACHE, `rl:create:${ip}`, 20, 3600);
  if (!allowed) {
    return c.json(
      { error: 'Rate limit reached for gallery creation. Please try again later.', code: 'RATE_LIMITED' },
      429
    );
  }

  const folderId = extractDriveFolderId(body.driveUrl);
  if (!folderId) {
    return c.json(
      {
        error: 'Invalid Google Drive folder link. Paste a URL like https://drive.google.com/drive/folders/...',
        code: 'INVALID_DRIVE_URL'
      },
      400
    );
  }

  let slug = '';
  if (typeof body.customSlug === 'string' && body.customSlug.trim()) {
    const clean = sanitizeCustomSlug(body.customSlug);
    if (!clean) {
      return c.json(
        {
          error: 'Custom link slug must be 3–48 letters, numbers, or hyphens and not a reserved word.',
          code: 'INVALID_SLUG'
        },
        400
      );
    }
    const existing = await getGalleryBySlug(c.env.DB, clean);
    if (existing) {
      return c.json({ error: 'That custom link name is already taken.', code: 'SLUG_TAKEN' }, 409);
    }
    slug = clean;
  } else {
    for (let i = 0; i < 5; i++) {
      const candidate = generateSlug(8);
      const existing = await getGalleryBySlug(c.env.DB, candidate);
      if (!existing) {
        slug = candidate;
        break;
      }
    }
    if (!slug) {
      return c.json({ error: 'Could not allocate a unique gallery slug.', code: 'SLUG_ERROR' }, 500);
    }
  }

  const sync = await fetchDriveFolderTree(folderId, c.env.GOOGLE_DRIVE_API_KEY);
  if (sync.items.length === 0) {
    return c.json(
      {
        error: 'No photos or videos were found inside that public Google Drive folder.',
        code: 'EMPTY_FOLDER'
      },
      400
    );
  }

  const id = randomToken(12);
  const adminToken = randomToken(24);
  const adminTokenHash = await sha256Hex(adminToken);

  const rawPassword = typeof body.password === 'string' ? body.password.trim() : '';
  const passwordHash = rawPassword ? await hashPassword(rawPassword) : null;

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : sync.folderName.slice(0, 120);
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, 80) : '';
  const brandUrl = sanitizeHttpUrl(body.brandUrl);
  const layout = validateLayout(body.layout);
  const theme = validateTheme(body.theme);
  const allowDownload = body.allowDownload === false ? 0 : 1;
  const allowLikes = body.allowLikes === false ? 0 : 1;
  const expiresAt = computeExpiryTimestamp(body.expiresInDays);
  const now = Date.now();
  const coverFileId = sync.items[0]?.id ?? null;

  const row: GalleryRow = {
    id,
    slug,
    drive_folder_id: folderId,
    title,
    description,
    cover_file_id: coverFileId,
    layout,
    theme,
    brand_name: brandName,
    brand_url: brandUrl,
    password_hash: passwordHash,
    admin_token_hash: adminTokenHash,
    allow_download: allowDownload,
    allow_likes: allowLikes,
    expires_at: expiresAt,
    status: 'active',
    items_json: JSON.stringify(sync.items),
    folders_json: JSON.stringify(sync.folders),
    item_count: sync.items.length,
    view_count: 0,
    synced_at: now,
    created_at: now
  };

  await c.env.DB.prepare(
    `INSERT INTO galleries (
      id, slug, drive_folder_id, title, description, cover_file_id, layout, theme,
      brand_name, brand_url, password_hash, admin_token_hash, allow_download, allow_likes,
      expires_at, status, items_json, folders_json, item_count, view_count, synced_at, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`
  )
    .bind(
      row.id,
      row.slug,
      row.drive_folder_id,
      row.title,
      row.description,
      row.cover_file_id,
      row.layout,
      row.theme,
      row.brand_name,
      row.brand_url,
      row.password_hash,
      row.admin_token_hash,
      row.allow_download,
      row.allow_likes,
      row.expires_at,
      row.status,
      row.items_json,
      row.folders_json,
      row.item_count,
      row.view_count,
      row.synced_at,
      row.created_at
    )
    .run();

  await saveManifestCache(c.env.CACHE, row);

  return c.json(
    {
      slug,
      sharePath: `/g/${slug}`,
      managePath: `/g/${slug}/manage#${adminToken}`,
      gallery: toPublicConfig(row),
      truncated: sync.truncated
    },
    201
  );
});

galleriesRouter.get('/galleries/:slug', async (c) => {
  const slug = c.req.param('slug');
  const row = await getGalleryBySlug(c.env.DB, slug);

  if (!row) {
    return c.json({ error: 'Gallery not found.', code: 'NOT_FOUND' }, 404);
  }
  if (row.status === 'blocked') {
    return c.json({ error: 'This gallery has been disabled.', code: 'BLOCKED' }, 403);
  }
  if (row.expires_at && row.expires_at <= Date.now()) {
    return c.json({ error: 'This gallery link has expired.', code: 'EXPIRED' }, 410);
  }

  const publicConfig = toPublicConfig(row);

  if (row.password_hash) {
    const token = getCookie(c, unlockCookieName(slug));
    const valid = await verifyUnlockToken(token, slug, getSigningSecret(c.env));
    if (!valid) {
      return c.json({
        locked: true,
        gallery: publicConfig,
        items: [],
        folders: [],
        likeCounts: {},
        visitorLikes: []
      });
    }
  }

  const items = JSON.parse(row.items_json) as MediaItem[];
  const folders = JSON.parse(row.folders_json) as GalleryFolder[];
  const visitorId = (c.req.header('x-visitor-id') || '').trim().slice(0, 64);

  const likeCounts: Record<string, number> = {};
  const visitorLikes: string[] = [];

  if (row.allow_likes === 1) {
    const countsRes = await c.env.DB.prepare(
      'SELECT drive_file_id, COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 GROUP BY drive_file_id'
    )
      .bind(row.id)
      .all<{ drive_file_id: string; cnt: number }>();

    for (const r of countsRes.results) {
      likeCounts[r.drive_file_id] = Number(r.cnt);
    }

    if (visitorId) {
      const mineRes = await c.env.DB.prepare(
        'SELECT drive_file_id FROM likes WHERE gallery_id = ?1 AND visitor_id = ?2'
      )
        .bind(row.id, visitorId)
        .all<{ drive_file_id: string }>();
      for (const r of mineRes.results) {
        visitorLikes.push(r.drive_file_id);
      }
    }
  }

  runWaitUntil(
    c,
    c.env.DB.prepare('UPDATE galleries SET view_count = view_count + 1 WHERE id = ?1')
      .bind(row.id)
      .run()
  );

  return c.json({
    locked: false,
    gallery: publicConfig,
    items,
    folders,
    likeCounts,
    visitorLikes
  });
});

galleriesRouter.post('/galleries/:slug/unlock', async (c) => {
  const slug = c.req.param('slug');
  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:unlock:${slug}:${ip}`, 25, 900);
  if (!allowed) {
    return c.json({ error: 'Too many password attempts. Please wait 15 minutes.', code: 'RATE_LIMITED' }, 429);
  }

  const row = await getGalleryBySlug(c.env.DB, slug);
  if (!row) return c.json({ error: 'Gallery not found.' }, 404);
  if (row.status === 'blocked') return c.json({ error: 'Gallery disabled.' }, 403);
  if (row.expires_at && row.expires_at <= Date.now()) {
    return c.json({ error: 'Gallery expired.' }, 410);
  }
  if (!row.password_hash) {
    return c.json({ unlocked: true });
  }

  const body = (await c.req.json().catch(() => null)) as { password?: string } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    return c.json({ error: 'Incorrect gallery password.', code: 'INVALID_PASSWORD' }, 401);
  }

  const token = await signUnlockToken(slug, getSigningSecret(c.env));
  const isHttps = c.req.url.startsWith('https://');
  setCookie(c, unlockCookieName(slug), token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  return c.json({ unlocked: true });
});

galleriesRouter.post('/galleries/:slug/likes', async (c) => {
  const slug = c.req.param('slug');
  const row = await getGalleryBySlug(c.env.DB, slug);

  if (!row) return c.json({ error: 'Gallery not found.' }, 404);
  if (row.status === 'blocked') return c.json({ error: 'Gallery disabled.' }, 403);
  if (row.expires_at && row.expires_at <= Date.now()) return c.json({ error: 'Gallery expired.' }, 410);
  if (row.allow_likes !== 1) return c.json({ error: 'Likes are disabled for this gallery.' }, 403);

  if (row.password_hash) {
    const token = getCookie(c, unlockCookieName(slug));
    const valid = await verifyUnlockToken(token, slug, getSigningSecret(c.env));
    if (!valid) return c.json({ error: 'Gallery is locked.' }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as {
    fileId?: string;
    visitorId?: string;
  } | null;
  const fileId = typeof body?.fileId === 'string' ? body.fileId : '';
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.trim() : '';

  if (!fileId || !/^[a-zA-Z0-9_-]{8,64}$/.test(visitorId)) {
    return c.json({ error: 'Invalid like request.' }, 400);
  }

  const items = JSON.parse(row.items_json) as MediaItem[];
  if (!items.some((item) => item.id === fileId)) {
    return c.json({ error: 'Item not found in gallery.' }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2 AND visitor_id = ?3'
  )
    .bind(row.id, fileId, visitorId)
    .first();

  let liked = false;
  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2 AND visitor_id = ?3'
    )
      .bind(row.id, fileId, visitorId)
      .run();
    liked = false;
  } else {
    await c.env.DB.prepare(
      'INSERT INTO likes (gallery_id, drive_file_id, visitor_id, created_at) VALUES (?1, ?2, ?3, ?4)'
    )
      .bind(row.id, fileId, visitorId, Date.now())
      .run();
    liked = true;
  }

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2'
  )
    .bind(row.id, fileId)
    .first<{ cnt: number }>();

  return c.json({
    liked,
    count: Number(countRow?.cnt ?? 0)
  });
});

galleriesRouter.get('/galleries/:slug/manage', async (c) => {
  const row = await requireGalleryAdmin(
    c.env.DB,
    c.req.param('slug'),
    c.req.header('authorization')
  );
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const items = JSON.parse(row.items_json) as MediaItem[];
  const folders = JSON.parse(row.folders_json) as GalleryFolder[];
  const countsRes = await c.env.DB.prepare(
    'SELECT drive_file_id, COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 GROUP BY drive_file_id'
  )
    .bind(row.id)
    .all<{ drive_file_id: string; cnt: number }>();

  const likeCounts: Record<string, number> = {};
  for (const r of countsRes.results) {
    likeCounts[r.drive_file_id] = Number(r.cnt);
  }

  return c.json({
    gallery: toPublicConfig(row),
    driveFolderId: row.drive_folder_id,
    items,
    folders,
    likeCounts
  });
});

galleriesRouter.patch('/galleries/:slug/manage', async (c) => {
  const row = await requireGalleryAdmin(
    c.env.DB,
    c.req.param('slug'),
    c.req.header('authorization')
  );
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return c.json({ error: 'Invalid JSON body.' }, 400);

  const items = JSON.parse(row.items_json) as MediaItem[];

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : row.title;
  const description =
    typeof body.description === 'string'
      ? body.description.trim().slice(0, 500)
      : row.description;
  const brandName =
    typeof body.brandName === 'string'
      ? body.brandName.trim().slice(0, 80)
      : row.brand_name;
  const brandUrl =
    body.brandUrl !== undefined ? sanitizeHttpUrl(body.brandUrl) : row.brand_url;
  const layout = body.layout !== undefined ? validateLayout(body.layout) : row.layout;
  const theme = body.theme !== undefined ? validateTheme(body.theme) : row.theme;
  const allowDownload =
    typeof body.allowDownload === 'boolean' ? (body.allowDownload ? 1 : 0) : row.allow_download;
  const allowLikes =
    typeof body.allowLikes === 'boolean' ? (body.allowLikes ? 1 : 0) : row.allow_likes;

  let coverFileId = row.cover_file_id;
  if (typeof body.coverFileId === 'string' && items.some((i) => i.id === body.coverFileId)) {
    coverFileId = body.coverFileId;
  }

  let passwordHash = row.password_hash;
  if (body.clearPassword === true) {
    passwordHash = null;
  } else if (typeof body.password === 'string' && body.password.trim()) {
    passwordHash = await hashPassword(body.password.trim());
  }

  let expiresAt = row.expires_at;
  if (body.expiresInDays !== undefined) {
    expiresAt = computeExpiryTimestamp(body.expiresInDays);
  }

  await c.env.DB.prepare(
    `UPDATE galleries SET
      title = ?1, description = ?2, brand_name = ?3, brand_url = ?4,
      layout = ?5, theme = ?6, cover_file_id = ?7, allow_download = ?8,
      allow_likes = ?9, password_hash = ?10, expires_at = ?11
     WHERE id = ?12`
  )
    .bind(
      title,
      description,
      brandName,
      brandUrl,
      layout,
      theme,
      coverFileId,
      allowDownload,
      allowLikes,
      passwordHash,
      expiresAt,
      row.id
    )
    .run();

  await invalidateGalleryCache(c.env.CACHE, row.slug);
  const updated = await getGalleryBySlug(c.env.DB, row.slug);
  if (updated) await saveManifestCache(c.env.CACHE, updated);

  return c.json({
    gallery: updated ? toPublicConfig(updated) : toPublicConfig(row)
  });
});

galleriesRouter.post('/galleries/:slug/sync', async (c) => {
  const row = await requireGalleryAdmin(
    c.env.DB,
    c.req.param('slug'),
    c.req.header('authorization')
  );
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const sync = await fetchDriveFolderTree(row.drive_folder_id, c.env.GOOGLE_DRIVE_API_KEY);
  const now = Date.now();
  const coverStillExists = sync.items.some((i) => i.id === row.cover_file_id);
  const coverFileId = coverStillExists ? row.cover_file_id : sync.items[0]?.id ?? null;

  await c.env.DB.prepare(
    `UPDATE galleries SET
      items_json = ?1, folders_json = ?2, item_count = ?3, cover_file_id = ?4, synced_at = ?5
     WHERE id = ?6`
  )
    .bind(
      JSON.stringify(sync.items),
      JSON.stringify(sync.folders),
      sync.items.length,
      coverFileId,
      now,
      row.id
    )
    .run();

  await invalidateGalleryCache(c.env.CACHE, row.slug);
  const updated = await getGalleryBySlug(c.env.DB, row.slug);
  if (updated) await saveManifestCache(c.env.CACHE, updated);

  return c.json({
    itemCount: sync.items.length,
    syncedAt: now,
    truncated: sync.truncated,
    items: sync.items,
    folders: sync.folders
  });
});

galleriesRouter.delete('/galleries/:slug', async (c) => {
  const row = await requireGalleryAdmin(
    c.env.DB,
    c.req.param('slug'),
    c.req.header('authorization')
  );
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  await c.env.DB.prepare('DELETE FROM galleries WHERE id = ?1').bind(row.id).run();
  await invalidateGalleryCache(c.env.CACHE, row.slug);
  return c.json({ deleted: true });
});

galleriesRouter.post('/galleries/:slug/report', async (c) => {
  const slug = c.req.param('slug');
  const ip = getClientIp(c);
  const body = (await c.req.json().catch(() => null)) as {
    reason?: string;
    details?: string;
    turnstileToken?: string;
  } | null;

  const turnstileOk = await verifyTurnstile(
    body?.turnstileToken,
    c.env.TURNSTILE_SECRET_KEY,
    ip
  );
  if (!turnstileOk) {
    return c.json({ error: 'Verification failed.' }, 403);
  }

  const allowed = await checkRateLimit(c.env.CACHE, `rl:report:${ip}`, 5, 3600);
  if (!allowed) {
    return c.json({ error: 'Too many reports submitted.' }, 429);
  }

  const row = await getGalleryBySlug(c.env.DB, slug);
  if (!row) return c.json({ error: 'Gallery not found.' }, 404);

  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim().slice(0, 80)
    : 'Inappropriate content';
  const details = typeof body?.details === 'string' ? body.details.trim().slice(0, 500) : '';

  await c.env.DB.prepare(
    'INSERT INTO abuse_reports (id, gallery_id, reason, details, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
  )
    .bind(randomToken(12), row.id, reason, details, Date.now())
    .run();

  return c.json({ reported: true }, 201);
});

galleriesRouter.post('/moderation/:slug/block', async (c) => {
  const modKey = c.env.ADMIN_MODERATION_KEY;
  const auth = c.req.header('authorization');
  if (!modKey || !auth?.startsWith('Bearer ') || !timingSafeEqual(auth.slice(7), modKey)) {
    return c.json({ error: 'Unauthorized.' }, 401);
  }

  const slug = c.req.param('slug');
  await c.env.DB.prepare("UPDATE galleries SET status = 'blocked' WHERE slug = ?1")
    .bind(slug)
    .run();
  await invalidateGalleryCache(c.env.CACHE, slug);

  return c.json({ blocked: true, slug });
});

export function isDriveError(err: unknown): err is DriveError {
  return err instanceof DriveError;
}
