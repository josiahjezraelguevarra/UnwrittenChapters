import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type {
  GalleryLayout,
  GalleryTheme,
  PublicGalleryConfig
} from '../../shared/types';
import {
  assignOpaqueIds,
  resolveDriveFileId,
  toPublicFileId,
  toPublicFolders,
  toPublicItems
} from '../opaqueIds';
import type {
  Env,
  GalleryRow,
  StoredGalleryFolder,
  StoredMediaItem
} from '../types';
import {
  generateSlug,
  getAdminTokenVersion,
  getPasswordVersion,
  hashPassword,
  randomToken,
  sanitizeCustomSlug,
  sha256Hex,
  signAdminSessionToken,
  signUnlockToken,
  timingSafeEqual,
  verifyAdminSessionToken,
  verifyPassword,
  verifyTurnstile,
  verifyUnlockToken
} from '../crypto';
import {
  sanitizeHexColor,
  validateCaptionMode,
  validateCardRadius,
  validateCardStyle,
  validateFontPreset,
  validateGridGap,
  validateHeroStyle
} from '../../shared/customization';
import {
  FEEDBACK_FORM_URL,
  REPORT_FORM_URL,
  SUPPORT_EMAIL
} from '../../shared/contact';
import {
  DriveError,
  extractDriveFolderId,
  fetchMultiDriveFolderTrees,
  MAX_DRIVE_SOURCES
} from '../drive';
import {
  isValidDriveId,
  isValidSlugParam,
  isValidVisitorId,
  readBoundedJsonObject,
  sanitizeControlChars
} from '../security';
import {
  checkRateLimit,
  getGalleryBySlug,
  invalidateGalleryCache,
  saveManifestCache
} from '../storage';

export const galleriesRouter = new Hono<{ Bindings: Env }>();

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;
const ADMIN_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTO_SYNC_STALE_MS = 6 * 60 * 60 * 1000;
const AUTO_SYNC_LOCK_TTL_SECONDS = 180;

const ALLOWED_CREATE_KEYS = new Set([
  'driveUrl',
  'driveUrls',
  'title',
  'description',
  'brandName',
  'brandUrl',
  'customSlug',
  'layout',
  'theme',
  'fontPreset',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'textColor',
  'heroStyle',
  'cardStyle',
  'captionMode',
  'gridGap',
  'cardRadius',
  'password',
  'expiresInDays',
  'allowDownload',
  'allowLikes',
  'autoSync',
  'turnstileToken'
]);

const ALLOWED_UNLOCK_KEYS = new Set(['password']);
const ALLOWED_LIKE_KEYS = new Set(['fileId', 'visitorId']);
const ALLOWED_SESSION_KEYS = new Set(['token']);
const ALLOWED_REPORT_KEYS = new Set(['reason', 'details', 'turnstileToken']);
const ALLOWED_PATCH_KEYS = new Set([
  'driveUrls',
  'title',
  'description',
  'brandName',
  'brandUrl',
  'layout',
  'theme',
  'fontPreset',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'textColor',
  'heroStyle',
  'cardStyle',
  'captionMode',
  'gridGap',
  'cardRadius',
  'coverFileId',
  'allowDownload',
  'allowLikes',
  'autoSync',
  'password',
  'clearPassword',
  'expiresInDays'
]);

export function getSigningSecret(env: Env): string {
  const secret = env.COOKIE_SIGNING_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('Server COOKIE_SIGNING_SECRET must be configured (32+ characters).');
  }
  return secret;
}

export function unlockCookieName(slug: string): string {
  return `uc_unlock_${slug}`;
}

export function adminCookieName(slug: string): string {
  return `uc_admin_${slug}`;
}

async function setUnlockCookieForSlug(
  c: Context<{ Bindings: Env }>,
  slug: string,
  passwordHash: string | null
): Promise<void> {
  const pwVersion = await getPasswordVersion(passwordHash);
  const token = await signUnlockToken(slug, getSigningSecret(c.env), 60 * 60 * 24 * 7, pwVersion);
  const isHttps = c.req.url.startsWith('https://');
  setCookie(c, unlockCookieName(slug), token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isHttps,
    path: '/api',
    maxAge: 60 * 60 * 24 * 7
  });
}

async function setAdminCookieForSlug(
  c: Context<{ Bindings: Env }>,
  slug: string,
  adminTokenHash: string
): Promise<void> {
  const version = await getAdminTokenVersion(adminTokenHash);
  const token = await signAdminSessionToken(
    slug,
    getSigningSecret(c.env),
    version,
    ADMIN_COOKIE_TTL_SECONDS
  );
  const isHttps = c.req.url.startsWith('https://');
  setCookie(c, adminCookieName(slug), token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isHttps,
    path: '/api/galleries',
    maxAge: ADMIN_COOKIE_TTL_SECONDS
  });
}

function clearAdminCookieForSlug(c: Context<{ Bindings: Env }>, slug: string): void {
  const isHttps = c.req.url.startsWith('https://');
  deleteCookie(c, adminCookieName(slug), {
    path: '/api/galleries',
    secure: isHttps,
    sameSite: 'Lax'
  });
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
  if (
    raw === 'grid' ||
    raw === 'justified' ||
    raw === 'masonry' ||
    raw === 'large' ||
    raw === 'editorial'
  ) {
    return raw;
  }
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

function parseStoredDriveSources(row: GalleryRow): string[] {
  try {
    const parsed = JSON.parse(row.drive_sources_json || '[]') as unknown;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((v): v is string => typeof v === 'string' && isValidDriveId(v));
      if (valid.length > 0) return Array.from(new Set(valid)).slice(0, MAX_DRIVE_SOURCES);
    }
  } catch {
    // Fall back to primary drive_folder_id
  }
  return row.drive_folder_id ? [row.drive_folder_id] : [];
}

function resolveDriveFolderIdsFromInput(
  rawList: unknown,
  rawSingle?: unknown
): { ok: true; folderIds: string[] } | { ok: false; error: string; code: string } {
  const candidates: string[] = [];
  if (Array.isArray(rawList)) {
    for (const entry of rawList) {
      if (typeof entry === 'string' && entry.trim()) candidates.push(entry.trim());
    }
  }
  if (typeof rawSingle === 'string' && rawSingle.trim()) {
    candidates.unshift(rawSingle.trim());
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      error: 'Invalid Google Drive folder link. Paste a URL like https://drive.google.com/drive/folders/...',
      code: 'INVALID_DRIVE_URL'
    };
  }

  const folderIds: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const id = extractDriveFolderId(raw);
    if (!id) {
      return {
        ok: false,
        error: 'Invalid Google Drive folder link. Paste URLs like https://drive.google.com/drive/folders/...',
        code: 'INVALID_DRIVE_URL'
      };
    }
    if (!seen.has(id)) {
      seen.add(id);
      folderIds.push(id);
    }
  }

  if (folderIds.length > MAX_DRIVE_SOURCES) {
    return {
      ok: false,
      error: `You can combine up to ${MAX_DRIVE_SOURCES} Google Drive links per album.`,
      code: 'TOO_MANY_DRIVE_SOURCES'
    };
  }

  return { ok: true, folderIds };
}

function toPublicConfig(
  row: GalleryRow,
  storedItems?: StoredMediaItem[]
): PublicGalleryConfig {
  const items = storedItems ?? (JSON.parse(row.items_json) as StoredMediaItem[]);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverFileId: toPublicFileId(items, row.cover_file_id),
    layout: row.layout,
    theme: row.theme,
    fontPreset: validateFontPreset(row.font_preset),
    accentColor: sanitizeHexColor(row.accent_color),
    backgroundColor: sanitizeHexColor(row.background_color),
    surfaceColor: sanitizeHexColor(row.surface_color),
    textColor: sanitizeHexColor(row.text_color),
    heroStyle: validateHeroStyle(row.hero_style),
    cardStyle: validateCardStyle(row.card_style),
    captionMode: validateCaptionMode(row.caption_mode),
    gridGap: validateGridGap(row.grid_gap),
    cardRadius: validateCardRadius(row.card_radius),
    brandName: row.brand_name,
    brandUrl: row.brand_url,
    allowDownload: row.allow_download === 1,
    allowLikes: row.allow_likes === 1,
    autoSync: row.auto_sync !== 0,
    hasPassword: Boolean(row.password_hash),
    expiresAt: row.expires_at,
    itemCount: row.item_count,
    sourceCount: parseStoredDriveSources(row).length,
    viewCount: row.view_count,
    syncedAt: row.synced_at,
    createdAt: row.created_at
  };
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  // Prefer Cloudflare's verified edge IP header; avoid trusting spoofable X-Forwarded-For
  return c.req.header('cf-connecting-ip')?.trim() || 'unknown';
}

async function performGalleryDriveSync(env: Env, row: GalleryRow) {
  const sourceIds = parseStoredDriveSources(row);
  const sync = await fetchMultiDriveFolderTrees(
    sourceIds,
    env.GOOGLE_DRIVE_API_KEY,
    fetch,
    env.GOOGLE_DRIVE_API_KEY_BACKUP
  );
  const prevItems = JSON.parse(row.items_json) as StoredMediaItem[];
  const prevFolders = JSON.parse(row.folders_json) as StoredGalleryFolder[];
  const { storedItems, storedFolders } = assignOpaqueIds(
    sync.items,
    sync.folders,
    prevItems,
    prevFolders
  );

  const now = Date.now();
  const coverStillExists = sync.items.some((i) => i.id === row.cover_file_id);
  const coverFileId = coverStillExists ? row.cover_file_id : sync.items[0]?.id ?? null;

  await env.DB.prepare(
    `UPDATE galleries SET
      items_json = ?1, folders_json = ?2, item_count = ?3, cover_file_id = ?4, synced_at = ?5
     WHERE id = ?6`
  )
    .bind(
      JSON.stringify(storedItems),
      JSON.stringify(storedFolders),
      sync.items.length,
      coverFileId,
      now,
      row.id
    )
    .run();

  await invalidateGalleryCache(env.CACHE, row.slug);
  const updated = await getGalleryBySlug(env.DB, row.slug);
  if (updated) await saveManifestCache(env.CACHE, updated);

  return {
    itemCount: sync.items.length,
    syncedAt: now,
    truncated: sync.truncated,
    storedItems,
    storedFolders
  };
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
  c: Context<{ Bindings: Env }>,
  slug: string
): Promise<{ row: GalleryRow | null; rateLimited: boolean }> {
  if (!isValidSlugParam(slug)) {
    return { row: null, rateLimited: false };
  }

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:admin:${slug}:${ip}`, 60, 900);
  if (!allowed) {
    return { row: null, rateLimited: true };
  }

  const row = await getGalleryBySlug(c.env.DB, slug);
  if (!row) return { row: null, rateLimited: false };

  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const tokenHash = await sha256Hex(token);
      if (await timingSafeEqual(tokenHash, row.admin_token_hash)) {
        return { row, rateLimited: false };
      }
    }
    return { row: null, rateLimited: false };
  }

  const sessionCookie = getCookie(c, adminCookieName(slug));
  if (sessionCookie) {
    const version = await getAdminTokenVersion(row.admin_token_hash);
    const validCookie = await verifyAdminSessionToken(
      sessionCookie,
      slug,
      getSigningSecret(c.env),
      version
    );
    if (validCookie) {
      return { row, rateLimited: false };
    }
  }

  return { row: null, rateLimited: false };
}

galleriesRouter.get('/config', (c) => {
  c.header('Cache-Control', 'public, max-age=300');
  return c.json({
    appName: c.env.PUBLIC_APP_NAME || 'UnwrittenChapters',
    donateUrl: c.env.PUBLIC_DONATE_URL || '',
    feedbackFormUrl: c.env.PUBLIC_FEEDBACK_FORM_URL || FEEDBACK_FORM_URL,
    reportFormUrl: c.env.PUBLIC_REPORT_FORM_URL || REPORT_FORM_URL,
    turnstileSiteKey: c.env.PUBLIC_TURNSTILE_SITE_KEY || '',
    turnstileRequired: Boolean(c.env.TURNSTILE_SECRET_KEY)
  });
});

galleriesRouter.post('/galleries', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const parsed = await readBoundedJsonObject(c, ALLOWED_CREATE_KEYS);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const hasDriveInput =
    (typeof body.driveUrl === 'string' && body.driveUrl.trim().length > 0) ||
    (Array.isArray(body.driveUrls) && body.driveUrls.length > 0);
  if (!hasDriveInput) {
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
      {
        error: `Rate limit reached for gallery creation. Please try again later, or contact ${SUPPORT_EMAIL} if you need help.`,
        code: 'RATE_LIMITED'
      },
      429
    );
  }

  const resolvedSources = resolveDriveFolderIdsFromInput(body.driveUrls, body.driveUrl);
  if (!resolvedSources.ok) {
    return c.json({ error: resolvedSources.error, code: resolvedSources.code }, 400);
  }
  const folderIds = resolvedSources.folderIds;
  const folderId = folderIds[0];

  const rawPassword = typeof body.password === 'string' ? body.password.trim() : '';
  if (rawPassword && (rawPassword.length < PASSWORD_MIN_LENGTH || rawPassword.length > PASSWORD_MAX_LENGTH)) {
    return c.json(
      {
        error: `Gallery password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
        code: 'INVALID_PASSWORD_POLICY'
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

  const sync = await fetchMultiDriveFolderTrees(
    folderIds,
    c.env.GOOGLE_DRIVE_API_KEY,
    fetch,
    c.env.GOOGLE_DRIVE_API_KEY_BACKUP
  );
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
  const passwordHash = rawPassword ? await hashPassword(rawPassword) : null;

  const title =
    typeof body.title === 'string' && sanitizeControlChars(body.title, 120)
      ? sanitizeControlChars(body.title, 120)
      : sanitizeControlChars(sync.folderName, 120) || 'Untitled Gallery';
  const description =
    typeof body.description === 'string' ? sanitizeControlChars(body.description, 500) : '';
  const brandName =
    typeof body.brandName === 'string' ? sanitizeControlChars(body.brandName, 80) : '';
  const brandUrl = sanitizeHttpUrl(body.brandUrl);
  const layout = validateLayout(body.layout);
  const theme = validateTheme(body.theme);
  const fontPreset = validateFontPreset(body.fontPreset);
  const accentColor = sanitizeHexColor(body.accentColor);
  const backgroundColor = sanitizeHexColor(body.backgroundColor);
  const surfaceColor = sanitizeHexColor(body.surfaceColor);
  const textColor = sanitizeHexColor(body.textColor);
  const heroStyle = validateHeroStyle(body.heroStyle);
  const cardStyle = validateCardStyle(body.cardStyle);
  const captionMode = validateCaptionMode(body.captionMode);
  const gridGap = validateGridGap(body.gridGap);
  const cardRadius = validateCardRadius(body.cardRadius);
  const allowDownload = body.allowDownload === false ? 0 : 1;
  const allowLikes = body.allowLikes === false ? 0 : 1;
  const autoSync = body.autoSync === false ? 0 : 1;
  const expiresAt = computeExpiryTimestamp(body.expiresInDays);
  const now = Date.now();
  const coverFileId = sync.items[0]?.id ?? null;
  const { storedItems, storedFolders } = assignOpaqueIds(sync.items, sync.folders);

  const row: GalleryRow = {
    id,
    slug,
    drive_folder_id: folderId,
    drive_sources_json: JSON.stringify(folderIds),
    title,
    description,
    cover_file_id: coverFileId,
    layout,
    theme,
    font_preset: fontPreset,
    accent_color: accentColor,
    background_color: backgroundColor,
    surface_color: surfaceColor,
    text_color: textColor,
    hero_style: heroStyle,
    card_style: cardStyle,
    caption_mode: captionMode,
    grid_gap: gridGap,
    card_radius: cardRadius,
    brand_name: brandName,
    brand_url: brandUrl,
    password_hash: passwordHash,
    admin_token_hash: adminTokenHash,
    allow_download: allowDownload,
    allow_likes: allowLikes,
    auto_sync: autoSync,
    expires_at: expiresAt,
    status: 'active',
    items_json: JSON.stringify(storedItems),
    folders_json: JSON.stringify(storedFolders),
    item_count: sync.items.length,
    view_count: 0,
    synced_at: now,
    created_at: now
  };

  await c.env.DB.prepare(
    `INSERT INTO galleries (
      id, slug, drive_folder_id, drive_sources_json, title, description, cover_file_id, layout, theme,
      font_preset, accent_color, background_color, surface_color, text_color,
      hero_style, card_style, caption_mode, grid_gap, card_radius,
      brand_name, brand_url, password_hash, admin_token_hash, allow_download, allow_likes,
      auto_sync, expires_at, status, items_json, folders_json, item_count, view_count, synced_at, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34)`
  )
    .bind(
      row.id,
      row.slug,
      row.drive_folder_id,
      row.drive_sources_json,
      row.title,
      row.description,
      row.cover_file_id,
      row.layout,
      row.theme,
      row.font_preset,
      row.accent_color,
      row.background_color,
      row.surface_color,
      row.text_color,
      row.hero_style,
      row.card_style,
      row.caption_mode,
      row.grid_gap,
      row.card_radius,
      row.brand_name,
      row.brand_url,
      row.password_hash,
      row.admin_token_hash,
      row.allow_download,
      row.allow_likes,
      row.auto_sync,
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
  await setAdminCookieForSlug(c, slug, adminTokenHash);
  if (passwordHash) {
    await setUnlockCookieForSlug(c, slug, passwordHash);
  }

  return c.json(
    {
      slug,
      sharePath: `/g/${slug}`,
      managePath: `/g/${slug}/manage#${adminToken}`,
      gallery: toPublicConfig(row, storedItems),
      truncated: sync.truncated
    },
    201
  );
});

galleriesRouter.get('/galleries/:slug', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Gallery not found.', code: 'NOT_FOUND' }, 404);
  }

  const ip = getClientIp(c);
  const viewAllowed = await checkRateLimit(c.env.CACHE, `rl:view:${ip}`, 180, 300);
  if (!viewAllowed) {
    return c.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, 429);
  }

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

  const storedItems = JSON.parse(row.items_json) as StoredMediaItem[];
  const storedFolders = JSON.parse(row.folders_json) as StoredGalleryFolder[];
  const publicConfig = toPublicConfig(row, storedItems);

  if (row.password_hash) {
    const token = getCookie(c, unlockCookieName(slug));
    const pwVersion = await getPasswordVersion(row.password_hash);
    const valid = await verifyUnlockToken(token, slug, getSigningSecret(c.env), pwVersion);
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

  const rawVisitorId = (c.req.header('x-visitor-id') || '').trim();
  const visitorId = isValidVisitorId(rawVisitorId) ? rawVisitorId : '';

  const likeCounts: Record<string, number> = {};
  const visitorLikes: string[] = [];

  if (row.allow_likes === 1) {
    const countsRes = await c.env.DB.prepare(
      'SELECT drive_file_id, COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 GROUP BY drive_file_id'
    )
      .bind(row.id)
      .all<{ drive_file_id: string; cnt: number }>();

    for (const r of countsRes.results) {
      const publicId = toPublicFileId(storedItems, r.drive_file_id);
      if (publicId) {
        likeCounts[publicId] = Number(r.cnt);
      }
    }

    if (visitorId) {
      const mineRes = await c.env.DB.prepare(
        'SELECT drive_file_id FROM likes WHERE gallery_id = ?1 AND visitor_id = ?2'
      )
        .bind(row.id, visitorId)
        .all<{ drive_file_id: string }>();
      for (const r of mineRes.results) {
        const publicId = toPublicFileId(storedItems, r.drive_file_id);
        if (publicId) {
          visitorLikes.push(publicId);
        }
      }
    }
  }

  runWaitUntil(
    c,
    c.env.DB.prepare('UPDATE galleries SET view_count = view_count + 1 WHERE id = ?1')
      .bind(row.id)
      .run()
  );

  if (row.auto_sync !== 0 && Date.now() - row.synced_at >= AUTO_SYNC_STALE_MS) {
    const lockKey = `autosync:${row.slug}`;
    runWaitUntil(
      c,
      (async () => {
        const locked = await c.env.CACHE.get(lockKey);
        if (locked) return;
        await c.env.CACHE.put(lockKey, '1', { expirationTtl: AUTO_SYNC_LOCK_TTL_SECONDS });
        await performGalleryDriveSync(c.env, row);
      })().catch((err) => {
        console.warn('Background auto-sync failed:', err instanceof Error ? err.message : 'Unknown error');
      })
    );
  }

  return c.json({
    locked: false,
    gallery: publicConfig,
    items: toPublicItems(storedItems),
    folders: toPublicFolders(storedFolders),
    likeCounts,
    visitorLikes
  });
});

galleriesRouter.post('/galleries/:slug/unlock', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Gallery not found.' }, 404);
  }

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

  const parsed = await readBoundedJsonObject(c, ALLOWED_UNLOCK_KEYS, 4096);
  if (!parsed.ok) return parsed.response;
  const password = typeof parsed.data.password === 'string' ? parsed.data.password : '';
  if (!password || password.length > PASSWORD_MAX_LENGTH) {
    return c.json({ error: 'Incorrect gallery password.', code: 'INVALID_PASSWORD' }, 401);
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    return c.json({ error: 'Incorrect gallery password.', code: 'INVALID_PASSWORD' }, 401);
  }

  await setUnlockCookieForSlug(c, slug, row.password_hash);

  return c.json({ unlocked: true });
});

galleriesRouter.post('/galleries/:slug/likes', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Gallery not found.' }, 404);
  }

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:like:${slug}:${ip}`, 120, 60);
  if (!allowed) {
    return c.json({ error: 'Too many favorite actions. Please slow down.', code: 'RATE_LIMITED' }, 429);
  }

  const row = await getGalleryBySlug(c.env.DB, slug);

  if (!row) return c.json({ error: 'Gallery not found.' }, 404);
  if (row.status === 'blocked') return c.json({ error: 'Gallery disabled.' }, 403);
  if (row.expires_at && row.expires_at <= Date.now()) return c.json({ error: 'Gallery expired.' }, 410);
  if (row.allow_likes !== 1) return c.json({ error: 'Likes are disabled for this gallery.' }, 403);

  if (row.password_hash) {
    const token = getCookie(c, unlockCookieName(slug));
    const pwVersion = await getPasswordVersion(row.password_hash);
    const valid = await verifyUnlockToken(token, slug, getSigningSecret(c.env), pwVersion);
    if (!valid) return c.json({ error: 'Gallery is locked.' }, 401);
  }

  const parsed = await readBoundedJsonObject(c, ALLOWED_LIKE_KEYS, 4096);
  if (!parsed.ok) return parsed.response;

  const fileId = typeof parsed.data.fileId === 'string' ? parsed.data.fileId : '';
  const visitorId = typeof parsed.data.visitorId === 'string' ? parsed.data.visitorId.trim() : '';

  if (!isValidDriveId(fileId) || !isValidVisitorId(visitorId)) {
    return c.json({ error: 'Invalid like request.' }, 400);
  }

  const storedItems = JSON.parse(row.items_json) as StoredMediaItem[];
  const driveFileId = resolveDriveFileId(storedItems, fileId);
  if (!driveFileId) {
    return c.json({ error: 'Item not found in gallery.' }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2 AND visitor_id = ?3'
  )
    .bind(row.id, driveFileId, visitorId)
    .first();

  let liked = false;
  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2 AND visitor_id = ?3'
    )
      .bind(row.id, driveFileId, visitorId)
      .run();
    liked = false;
  } else {
    await c.env.DB.prepare(
      'INSERT INTO likes (gallery_id, drive_file_id, visitor_id, created_at) VALUES (?1, ?2, ?3, ?4)'
    )
      .bind(row.id, driveFileId, visitorId, Date.now())
      .run();
    liked = true;
  }

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 AND drive_file_id = ?2'
  )
    .bind(row.id, driveFileId)
    .first<{ cnt: number }>();

  return c.json({
    liked,
    count: Number(countRow?.cnt ?? 0)
  });
});

galleriesRouter.post('/galleries/:slug/manage/session', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Invalid or missing manage token.' }, 401);
  }

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:admin:${slug}:${ip}`, 25, 900);
  if (!allowed) {
    return c.json({ error: 'Too many authentication attempts. Please wait 15 minutes.', code: 'RATE_LIMITED' }, 429);
  }

  const parsed = await readBoundedJsonObject(c, ALLOWED_SESSION_KEYS, 4096);
  if (!parsed.ok) return parsed.response;

  const token = typeof parsed.data.token === 'string' ? parsed.data.token.trim() : '';
  if (!token || token.length > 256) {
    return c.json({ error: 'Invalid or missing manage token.' }, 401);
  }

  const row = await getGalleryBySlug(c.env.DB, slug);
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const tokenHash = await sha256Hex(token);
  if (!(await timingSafeEqual(tokenHash, row.admin_token_hash))) {
    return c.json({ error: 'Invalid or missing manage token.' }, 401);
  }

  await setAdminCookieForSlug(c, slug, row.admin_token_hash);
  if (row.password_hash) {
    await setUnlockCookieForSlug(c, slug, row.password_hash);
  }

  return c.json({ authenticated: true });
});

galleriesRouter.post('/galleries/:slug/manage/rotate-token', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  const auth = await requireGalleryAdmin(c, slug);
  if (auth.rateLimited) {
    return c.json({ error: 'Too many requests. Please wait a few minutes.', code: 'RATE_LIMITED' }, 429);
  }
  if (!auth.row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const newToken = randomToken(24);
  const newTokenHash = await sha256Hex(newToken);

  await c.env.DB.prepare('UPDATE galleries SET admin_token_hash = ?1 WHERE id = ?2')
    .bind(newTokenHash, auth.row.id)
    .run();

  await setAdminCookieForSlug(c, slug, newTokenHash);

  return c.json({
    managePath: `/g/${slug}/manage#${newToken}`
  });
});

galleriesRouter.post('/galleries/:slug/manage/logout', (c) => {
  c.header('Cache-Control', 'private, no-store');
  const slug = c.req.param('slug');
  if (isValidSlugParam(slug)) {
    clearAdminCookieForSlug(c, slug);
  }
  return c.json({ loggedOut: true });
});

galleriesRouter.get('/galleries/:slug/manage', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  const auth = await requireGalleryAdmin(c, slug);
  if (auth.rateLimited) {
    return c.json({ error: 'Too many requests. Please wait a few minutes.', code: 'RATE_LIMITED' }, 429);
  }
  const row = auth.row;
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const storedItems = JSON.parse(row.items_json) as StoredMediaItem[];
  const storedFolders = JSON.parse(row.folders_json) as StoredGalleryFolder[];
  const countsRes = await c.env.DB.prepare(
    'SELECT drive_file_id, COUNT(*) AS cnt FROM likes WHERE gallery_id = ?1 GROUP BY drive_file_id'
  )
    .bind(row.id)
    .all<{ drive_file_id: string; cnt: number }>();

  const likeCounts: Record<string, number> = {};
  for (const r of countsRes.results) {
    const publicId = toPublicFileId(storedItems, r.drive_file_id);
    if (publicId) {
      likeCounts[publicId] = Number(r.cnt);
    }
  }

  await setAdminCookieForSlug(c, row.slug, row.admin_token_hash);
  if (row.password_hash) {
    await setUnlockCookieForSlug(c, row.slug, row.password_hash);
  }

  return c.json({
    gallery: toPublicConfig(row, storedItems),
    driveFolderId: '',
    driveSources: parseStoredDriveSources(row).map(
      (id) => `https://drive.google.com/drive/folders/${id}`
    ),
    items: toPublicItems(storedItems),
    folders: toPublicFolders(storedFolders),
    likeCounts
  });
});

galleriesRouter.patch('/galleries/:slug/manage', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  const auth = await requireGalleryAdmin(c, slug);
  if (auth.rateLimited) {
    return c.json({ error: 'Too many requests. Please wait a few minutes.', code: 'RATE_LIMITED' }, 429);
  }
  const row = auth.row;
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const parsed = await readBoundedJsonObject(c, ALLOWED_PATCH_KEYS);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const storedItems = JSON.parse(row.items_json) as StoredMediaItem[];

  const title =
    typeof body.title === 'string' && sanitizeControlChars(body.title, 120)
      ? sanitizeControlChars(body.title, 120)
      : row.title;
  const description =
    typeof body.description === 'string'
      ? sanitizeControlChars(body.description, 500)
      : row.description;
  const brandName =
    typeof body.brandName === 'string'
      ? sanitizeControlChars(body.brandName, 80)
      : row.brand_name;
  const brandUrl =
    body.brandUrl !== undefined ? sanitizeHttpUrl(body.brandUrl) : row.brand_url;
  const layout = body.layout !== undefined ? validateLayout(body.layout) : row.layout;
  const theme = body.theme !== undefined ? validateTheme(body.theme) : row.theme;
  const fontPreset =
    body.fontPreset !== undefined
      ? validateFontPreset(body.fontPreset)
      : validateFontPreset(row.font_preset);
  const accentColor =
    body.accentColor !== undefined
      ? sanitizeHexColor(body.accentColor)
      : sanitizeHexColor(row.accent_color);
  const backgroundColor =
    body.backgroundColor !== undefined
      ? sanitizeHexColor(body.backgroundColor)
      : sanitizeHexColor(row.background_color);
  const surfaceColor =
    body.surfaceColor !== undefined
      ? sanitizeHexColor(body.surfaceColor)
      : sanitizeHexColor(row.surface_color);
  const textColor =
    body.textColor !== undefined
      ? sanitizeHexColor(body.textColor)
      : sanitizeHexColor(row.text_color);
  const heroStyle =
    body.heroStyle !== undefined
      ? validateHeroStyle(body.heroStyle)
      : validateHeroStyle(row.hero_style);
  const cardStyle =
    body.cardStyle !== undefined
      ? validateCardStyle(body.cardStyle)
      : validateCardStyle(row.card_style);
  const captionMode =
    body.captionMode !== undefined
      ? validateCaptionMode(body.captionMode)
      : validateCaptionMode(row.caption_mode);
  const gridGap =
    body.gridGap !== undefined ? validateGridGap(body.gridGap) : validateGridGap(row.grid_gap);
  const cardRadius =
    body.cardRadius !== undefined
      ? validateCardRadius(body.cardRadius)
      : validateCardRadius(row.card_radius);
  const allowDownload =
    typeof body.allowDownload === 'boolean' ? (body.allowDownload ? 1 : 0) : row.allow_download;
  const allowLikes =
    typeof body.allowLikes === 'boolean' ? (body.allowLikes ? 1 : 0) : row.allow_likes;
  const autoSync =
    typeof body.autoSync === 'boolean' ? (body.autoSync ? 1 : 0) : row.auto_sync;

  let coverFileId = row.cover_file_id;
  if (typeof body.coverFileId === 'string') {
    const resolvedCover = resolveDriveFileId(storedItems, body.coverFileId);
    if (resolvedCover) {
      coverFileId = resolvedCover;
    }
  }

  let passwordHash = row.password_hash;
  if (body.clearPassword === true) {
    passwordHash = null;
  } else if (typeof body.password === 'string' && body.password.trim()) {
    const newPw = body.password.trim();
    if (newPw.length < PASSWORD_MIN_LENGTH || newPw.length > PASSWORD_MAX_LENGTH) {
      return c.json(
        {
          error: `Gallery password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
          code: 'INVALID_PASSWORD_POLICY'
        },
        400
      );
    }
    passwordHash = await hashPassword(newPw);
  }

  let nextFolderIds = parseStoredDriveSources(row);
  let sourcesChanged = false;
  if (body.driveUrls !== undefined) {
    const resolved = resolveDriveFolderIdsFromInput(body.driveUrls);
    if (!resolved.ok) {
      return c.json({ error: resolved.error, code: resolved.code }, 400);
    }
    const prevKey = nextFolderIds.join(',');
    const nextKey = resolved.folderIds.join(',');
    if (prevKey !== nextKey) {
      nextFolderIds = resolved.folderIds;
      sourcesChanged = true;
    }
  }

  let expiresAt = row.expires_at;
  if (body.expiresInDays !== undefined) {
    expiresAt = computeExpiryTimestamp(body.expiresInDays);
  }

  await c.env.DB.prepare(
    `UPDATE galleries SET
      title = ?1, description = ?2, brand_name = ?3, brand_url = ?4,
      layout = ?5, theme = ?6, font_preset = ?7, accent_color = ?8,
      background_color = ?9, surface_color = ?10, text_color = ?11,
      hero_style = ?12, card_style = ?13, caption_mode = ?14,
      grid_gap = ?15, card_radius = ?16, cover_file_id = ?17, allow_download = ?18,
      allow_likes = ?19, auto_sync = ?20, password_hash = ?21, expires_at = ?22,
      drive_folder_id = ?23, drive_sources_json = ?24
     WHERE id = ?25`
  )
    .bind(
      title,
      description,
      brandName,
      brandUrl,
      layout,
      theme,
      fontPreset,
      accentColor,
      backgroundColor,
      surfaceColor,
      textColor,
      heroStyle,
      cardStyle,
      captionMode,
      gridGap,
      cardRadius,
      coverFileId,
      allowDownload,
      allowLikes,
      autoSync,
      passwordHash,
      expiresAt,
      nextFolderIds[0] || row.drive_folder_id,
      JSON.stringify(nextFolderIds),
      row.id
    )
    .run();

  await invalidateGalleryCache(c.env.CACHE, row.slug);
  let updated = await getGalleryBySlug(c.env.DB, row.slug);
  let syncResult: Awaited<ReturnType<typeof performGalleryDriveSync>> | null = null;
  if (updated && sourcesChanged) {
    syncResult = await performGalleryDriveSync(c.env, updated);
    updated = await getGalleryBySlug(c.env.DB, row.slug);
  } else if (updated) {
    await saveManifestCache(c.env.CACHE, updated);
  }
  if (passwordHash) {
    await setUnlockCookieForSlug(c, row.slug, passwordHash);
  }

  const finalItems = syncResult ? syncResult.storedItems : storedItems;
  return c.json({
    gallery: updated
      ? toPublicConfig(updated, finalItems)
      : toPublicConfig(row, finalItems),
    ...(syncResult
      ? {
          items: toPublicItems(syncResult.storedItems),
          folders: toPublicFolders(syncResult.storedFolders)
        }
      : {}),
    driveSources: nextFolderIds.map((id) => `https://drive.google.com/drive/folders/${id}`)
  });
});

galleriesRouter.post('/galleries/:slug/sync', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  const auth = await requireGalleryAdmin(c, slug);
  if (auth.rateLimited) {
    return c.json({ error: 'Too many requests. Please wait a few minutes.', code: 'RATE_LIMITED' }, 429);
  }
  const row = auth.row;
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:sync:${slug}:${ip}`, 10, 300);
  if (!allowed) {
    return c.json(
      { error: 'Too many sync requests. Please wait a few minutes.', code: 'RATE_LIMITED' },
      429
    );
  }

  const result = await performGalleryDriveSync(c.env, row);

  return c.json({
    itemCount: result.itemCount,
    syncedAt: result.syncedAt,
    truncated: result.truncated,
    items: toPublicItems(result.storedItems),
    folders: toPublicFolders(result.storedFolders)
  });
});

galleriesRouter.delete('/galleries/:slug', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  const auth = await requireGalleryAdmin(c, slug);
  if (auth.rateLimited) {
    return c.json({ error: 'Too many requests. Please wait a few minutes.', code: 'RATE_LIMITED' }, 429);
  }
  const row = auth.row;
  if (!row) return c.json({ error: 'Invalid or missing manage token.' }, 401);

  await c.env.DB.prepare('DELETE FROM galleries WHERE id = ?1').bind(row.id).run();
  await invalidateGalleryCache(c.env.CACHE, row.slug);
  clearAdminCookieForSlug(c, row.slug);
  return c.json({ deleted: true });
});

galleriesRouter.post('/galleries/:slug/report', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Gallery not found.' }, 404);
  }

  const ip = getClientIp(c);
  const parsed = await readBoundedJsonObject(c, ALLOWED_REPORT_KEYS, 8192);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const turnstileOk = await verifyTurnstile(
    typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
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

  const reason =
    typeof body.reason === 'string' && sanitizeControlChars(body.reason, 80)
      ? sanitizeControlChars(body.reason, 80)
      : 'Inappropriate content';
  const details =
    typeof body.details === 'string' ? sanitizeControlChars(body.details, 500) : '';

  await c.env.DB.prepare(
    'INSERT INTO abuse_reports (id, gallery_id, reason, details, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
  )
    .bind(randomToken(12), row.id, reason, details, Date.now())
    .run();

  return c.json({ reported: true }, 201);
});

galleriesRouter.post('/moderation/:slug/block', async (c) => {
  c.header('Cache-Control', 'private, no-store');

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.CACHE, `rl:mod:${ip}`, 20, 900);
  if (!allowed) {
    return c.json({ error: 'Too many moderation requests.' }, 429);
  }

  const modKey = c.env.ADMIN_MODERATION_KEY;
  const auth = c.req.header('authorization');
  if (!modKey || !auth?.startsWith('Bearer ') || !(await timingSafeEqual(auth.slice(7), modKey))) {
    return c.json({ error: 'Unauthorized.' }, 401);
  }

  const slug = c.req.param('slug');
  if (!isValidSlugParam(slug)) {
    return c.json({ error: 'Invalid gallery slug.' }, 400);
  }

  await c.env.DB.prepare("UPDATE galleries SET status = 'blocked' WHERE slug = ?1")
    .bind(slug)
    .run();
  await invalidateGalleryCache(c.env.CACHE, slug);

  return c.json({ blocked: true, slug });
});

export function isDriveError(err: unknown): err is DriveError {
  return err instanceof DriveError;
}
