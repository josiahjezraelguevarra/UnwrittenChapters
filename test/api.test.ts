import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/server/index';
import type { Env, GalleryRow } from '../src/server/types';

function createMemoryKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string, type?: string) => {
      const val = store.get(key);
      if (val === undefined) return null;
      return type === 'json' ? JSON.parse(val) : val;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null })
  } as unknown as KVNamespace;
}

function createMemoryDB() {
  const galleries = new Map<string, GalleryRow>();
  const likes = new Set<string>();

  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind(...params: unknown[]) {
          args = params;
          return stmt;
        },
        async first<T>() {
          if (sql.includes('SELECT * FROM galleries WHERE slug')) {
            const slug = args[0] as string;
            for (const g of galleries.values()) {
              if (g.slug === slug) return g as unknown as T;
            }
            return null;
          }
          if (sql.includes('SELECT 1 FROM likes')) {
            const key = `${args[0]}:${args[1]}:${args[2]}`;
            return (likes.has(key) ? { 1: 1 } : null) as unknown as T;
          }
          if (sql.includes('SELECT COUNT(*) AS cnt FROM likes')) {
            const [gid, fid] = args as [string, string];
            let cnt = 0;
            for (const key of likes) {
              if (key.startsWith(`${gid}:${fid}:`)) cnt += 1;
            }
            return { cnt } as unknown as T;
          }
          return null;
        },
        async all<T>() {
          if (sql.includes('GROUP BY drive_file_id')) {
            const gid = args[0] as string;
            const counts = new Map<string, number>();
            for (const key of likes) {
              const [g, f] = key.split(':');
              if (g === gid) counts.set(f, (counts.get(f) || 0) + 1);
            }
            return {
              results: Array.from(counts.entries()).map(([drive_file_id, cnt]) => ({
                drive_file_id,
                cnt
              })) as unknown as T[]
            };
          }
          if (sql.includes('SELECT drive_file_id FROM likes')) {
            const [gid, vid] = args as [string, string];
            const out: Array<{ drive_file_id: string }> = [];
            for (const key of likes) {
              const [g, f, v] = key.split(':');
              if (g === gid && v === vid) out.push({ drive_file_id: f });
            }
            return { results: out as unknown as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (sql.startsWith('INSERT INTO galleries')) {
            const row: GalleryRow = {
              id: args[0] as string,
              slug: args[1] as string,
              drive_folder_id: args[2] as string,
              drive_sources_json: args[3] as string,
              title: args[4] as string,
              description: args[5] as string,
              cover_file_id: args[6] as string | null,
              layout: args[7] as GalleryRow['layout'],
              theme: args[8] as GalleryRow['theme'],
              font_preset: args[9] as GalleryRow['font_preset'],
              accent_color: args[10] as string,
              background_color: args[11] as string,
              surface_color: args[12] as string,
              text_color: args[13] as string,
              hero_style: args[14] as GalleryRow['hero_style'],
              card_style: args[15] as GalleryRow['card_style'],
              caption_mode: args[16] as GalleryRow['caption_mode'],
              grid_gap: args[17] as GalleryRow['grid_gap'],
              card_radius: args[18] as GalleryRow['card_radius'],
              brand_name: args[19] as string,
              brand_url: args[20] as string,
              password_hash: args[21] as string | null,
              admin_token_hash: args[22] as string,
              allow_download: args[23] as number,
              allow_likes: args[24] as number,
              auto_sync: args[25] as number,
              expires_at: args[26] as number | null,
              status: args[27] as string,
              items_json: args[28] as string,
              folders_json: args[29] as string,
              item_count: args[30] as number,
              view_count: args[31] as number,
              synced_at: args[32] as number,
              created_at: args[33] as number
            };
            galleries.set(row.id, row);
          } else if (sql.startsWith('UPDATE galleries SET') && sql.includes('font_preset')) {
            const id = args[24] as string;
            const existing = galleries.get(id);
            if (existing) {
              existing.title = args[0] as string;
              existing.description = args[1] as string;
              existing.brand_name = args[2] as string;
              existing.brand_url = args[3] as string;
              existing.layout = args[4] as GalleryRow['layout'];
              existing.theme = args[5] as GalleryRow['theme'];
              existing.font_preset = args[6] as GalleryRow['font_preset'];
              existing.accent_color = args[7] as string;
              existing.background_color = args[8] as string;
              existing.surface_color = args[9] as string;
              existing.text_color = args[10] as string;
              existing.hero_style = args[11] as GalleryRow['hero_style'];
              existing.card_style = args[12] as GalleryRow['card_style'];
              existing.caption_mode = args[13] as GalleryRow['caption_mode'];
              existing.grid_gap = args[14] as GalleryRow['grid_gap'];
              existing.card_radius = args[15] as GalleryRow['card_radius'];
              existing.cover_file_id = args[16] as string | null;
              existing.allow_download = args[17] as number;
              existing.allow_likes = args[18] as number;
              existing.auto_sync = args[19] as number;
              existing.password_hash = args[20] as string | null;
              existing.expires_at = args[21] as number | null;
              existing.drive_folder_id = args[22] as string;
              existing.drive_sources_json = args[23] as string;
            }
          } else if (sql.startsWith('UPDATE galleries SET') && sql.includes('items_json')) {
            const existing = galleries.get(args[5] as string);
            if (existing) {
              existing.items_json = args[0] as string;
              existing.folders_json = args[1] as string;
              existing.item_count = args[2] as number;
              existing.cover_file_id = args[3] as string | null;
              existing.synced_at = args[4] as number;
            }
          } else if (sql.startsWith('UPDATE galleries SET admin_token_hash')) {
            const existing = galleries.get(args[1] as string);
            if (existing) {
              existing.admin_token_hash = args[0] as string;
            }
          } else if (sql.startsWith('INSERT INTO likes')) {
            likes.add(`${args[0]}:${args[1]}:${args[2]}`);
          } else if (sql.startsWith('DELETE FROM likes')) {
            likes.delete(`${args[0]}:${args[1]}:${args[2]}`);
          } else if (sql.startsWith('DELETE FROM galleries')) {
            galleries.delete(args[0] as string);
          } else if (sql.includes("status = 'blocked'")) {
            const slug = args[0] as string;
            for (const g of galleries.values()) {
              if (g.slug === slug) g.status = 'blocked';
            }
          }
          return { success: true };
        }
      };
      return stmt;
    }
  } as unknown as D1Database;
}

describe('Gallery API & Media Proxy security', () => {
  let env: Env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    env = {
      DB: createMemoryDB(),
      CACHE: createMemoryKV(),
      GOOGLE_DRIVE_API_KEY: 'test-drive-key',
      COOKIE_SIGNING_SECRET: 'test-cookie-secret-32-chars-minimum'
    };

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(typeof input === 'string' ? input : input.toString());
      if (url.includes('/files/folderABC12345?')) {
        return new Response(
          JSON.stringify({
            id: 'folderABC12345',
            name: 'Client Shoot',
            mimeType: 'application/vnd.google-apps.folder'
          }),
          { status: 200 }
        );
      }
      if (url.includes("'folderABC12345'+in+parents")) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'imgFile00001',
                name: 'portrait.jpg',
                mimeType: 'image/jpeg',
                size: '102400',
                imageMediaMetadata: { width: 1600, height: 2400 }
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (url.includes('/files/imgFile00001?fields=thumbnailLink')) {
        return new Response(
          JSON.stringify({ thumbnailLink: 'https://lh3.googleusercontent.com/mock=s220' }),
          { status: 200 }
        );
      }
      if (url.includes('lh3.googleusercontent.com')) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' }
        });
      }
      if (url.includes('bolls.life/get-random-verse/ESV')) {
        return new Response(
          JSON.stringify({
            pk: 26412,
            translation: 'ESV',
            book: 43,
            chapter: 3,
            verse: 16,
            text: 'For God so loved<br/>the world &amp; gave his only Son.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('enforces password lock on gallery JSON and media proxy, then unlocks via cookie', async () => {
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          password: 'my-secret-password'
        })
      },
      env
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { slug: string; managePath: string };

    // Locked GET must not leak items
    const lockedRes = await app.request(`/api/galleries/${created.slug}`, {}, env);
    expect(lockedRes.status).toBe(200);
    const lockedBody = (await lockedRes.json()) as { locked: boolean; items: unknown[] };
    expect(lockedBody.locked).toBe(true);
    expect(lockedBody.items).toHaveLength(0);

    // Locked media proxy must return 401
    const unauthMedia = await app.request(
      `/api/media/${created.slug}/imgFile00001?variant=thumb`,
      {},
      env
    );
    expect(unauthMedia.status).toBe(401);

    // Wrong password returns 401
    const badUnlock = await app.request(
      `/api/galleries/${created.slug}/unlock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' })
      },
      env
    );
    expect(badUnlock.status).toBe(401);

    // Correct password returns 200 + Set-Cookie
    const goodUnlock = await app.request(
      `/api/galleries/${created.slug}/unlock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'my-secret-password' })
      },
      env
    );
    expect(goodUnlock.status).toBe(200);
    const cookieHeader = goodUnlock.headers.get('set-cookie')!;
    const cookiePair = cookieHeader.split(';')[0];

    // Unlocked gallery returns items with opaque IDs (never raw Google Drive file IDs)
    const unlockedRes = await app.request(
      `/api/galleries/${created.slug}`,
      { headers: { Cookie: cookiePair } },
      env
    );
    const unlockedBody = (await unlockedRes.json()) as {
      locked: boolean;
      gallery: { coverFileId: string | null };
      items: Array<{ id: string; folderId: string }>;
      folders: Array<{ id: string }>;
    };
    expect(unlockedBody.locked).toBe(false);
    expect(unlockedBody.items).toHaveLength(1);
    const opaqueFileId = unlockedBody.items[0].id;
    expect(opaqueFileId).not.toBe('imgFile00001');
    expect(unlockedBody.gallery.coverFileId).toBe(opaqueFileId);
    expect(unlockedBody.items[0].folderId).not.toBe('folderABC12345');
    expect(unlockedBody.folders[0].id).not.toBe('folderABC12345');

    // Raw Drive file ID must NOT work on public media proxy
    const rawDriveIdRes = await app.request(
      `/api/media/${created.slug}/imgFile00001?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(rawDriveIdRes.status).toBe(404);

    // Rejects arbitrary fileId not belonging to this gallery (no open proxy!)
    const foreignFileRes = await app.request(
      `/api/media/${created.slug}/foreignFile999?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(foreignFileRes.status).toBe(404);

    // Serves valid file via opaque ID with private cache header when password-protected
    const validMediaRes = await app.request(
      `/api/media/${created.slug}/${opaqueFileId}?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(validMediaRes.status).toBe(200);
    expect(validMediaRes.headers.get('cache-control')).toBe('private, no-store');
    expect(validMediaRes.headers.get('content-security-policy')).toBe(
      "default-src 'none'; sandbox"
    );

    // Manage endpoint grants unlock cookie for password-protected admin preview thumbnails
    const adminToken = created.managePath.split('#')[1];
    const manageRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
      env
    );
    expect(manageRes.status).toBe(200);
    expect(manageRes.headers.get('set-cookie')).toContain(`uc_unlock_${created.slug}=`);
    expect(manageRes.headers.get('x-frame-options')).toBe('DENY');
    expect(manageRes.headers.get('x-content-type-options')).toBe('nosniff');

    // Rotating the password invalidates previously issued unlock cookies
    const rotateRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ password: 'new-rotated-password' })
      },
      env
    );
    expect(rotateRes.status).toBe(200);

    const staleCookieGallery = await app.request(
      `/api/galleries/${created.slug}`,
      { headers: { Cookie: cookiePair } },
      env
    );
    const staleBody = (await staleCookieGallery.json()) as { locked: boolean };
    expect(staleBody.locked).toBe(true);

    const staleCookieMedia = await app.request(
      `/api/media/${created.slug}/${opaqueFileId}?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(staleCookieMedia.status).toBe(401);

    // Missing COOKIE_SIGNING_SECRET fails closed instead of using a weak fallback
    const insecureEnv = { ...env, COOKIE_SIGNING_SECRET: '' };
    const noSecretUnlock = await app.request(
      `/api/galleries/${created.slug}/unlock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'new-rotated-password' })
      },
      insecureEnv
    );
    expect(noSecretUnlock.status).toBe(500);
  });

  it('supports toggling likes and admin deletion', async () => {
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345'
        })
      },
      env
    );
    const created = (await createRes.json()) as {
      slug: string;
      managePath: string;
      gallery: { coverFileId: string };
    };
    const adminToken = created.managePath.split('#')[1];
    const opaqueFileId = created.gallery.coverFileId;

    // Raw Drive ID is rejected by likes endpoint
    const rawLikeRes = await app.request(
      `/api/galleries/${created.slug}/likes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: 'imgFile00001', visitorId: 'visitor_12345678' })
      },
      env
    );
    expect(rawLikeRes.status).toBe(404);

    const likeRes = await app.request(
      `/api/galleries/${created.slug}/likes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: opaqueFileId, visitorId: 'visitor_12345678' })
      },
      env
    );
    expect(likeRes.status).toBe(200);
    expect(await likeRes.json()).toEqual({ liked: true, count: 1 });

    // Unauthorized delete fails
    const badDel = await app.request(
      `/api/galleries/${created.slug}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer wrong' } },
      env
    );
    expect(badDel.status).toBe(401);

    // Authorized delete succeeds
    const goodDel = await app.request(
      `/api/galleries/${created.slug}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } },
      env
    );
    expect(goodDel.status).toBe(200);
  });

  it('persists and sanitizes visual styling & typography customization', async () => {
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          fontPreset: 'fineart',
          accentColor: '#E11D48',
          backgroundColor: '#F3ECE1',
          surfaceColor: '#FAF6EF',
          textColor: '#2C221E',
          heroStyle: 'split',
          cardStyle: 'mat',
          captionMode: 'below',
          gridGap: 'airy',
          cardRadius: 'sharp'
        })
      },
      env
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      slug: string;
      managePath: string;
      gallery: {
        fontPreset: string;
        accentColor: string;
        backgroundColor: string;
        surfaceColor: string;
        textColor: string;
        heroStyle: string;
        cardStyle: string;
        captionMode: string;
        gridGap: string;
        cardRadius: string;
      };
    };
    expect(created.gallery.fontPreset).toBe('fineart');
    expect(created.gallery.accentColor).toBe('#e11d48');
    expect(created.gallery.backgroundColor).toBe('#f3ece1');
    expect(created.gallery.surfaceColor).toBe('#faf6ef');
    expect(created.gallery.textColor).toBe('#2c221e');
    expect(created.gallery.heroStyle).toBe('split');
    expect(created.gallery.cardStyle).toBe('mat');
    expect(created.gallery.captionMode).toBe('below');
    expect(created.gallery.gridGap).toBe('airy');
    expect(created.gallery.cardRadius).toBe('sharp');

    const adminToken = created.managePath.split('#')[1];
    const patchRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          fontPreset: 'mono',
          accentColor: 'not-a-color',
          backgroundColor: '#11100E',
          surfaceColor: 'invalid-surface',
          textColor: '#F4EFE6',
          heroStyle: 'minimal',
          cardStyle: 'framed',
          captionMode: 'hidden',
          gridGap: 'compact',
          cardRadius: 'soft'
        })
      },
      env
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as {
      gallery: {
        fontPreset: string;
        accentColor: string;
        backgroundColor: string;
        surfaceColor: string;
        textColor: string;
        heroStyle: string;
        cardStyle: string;
        captionMode: string;
        gridGap: string;
        cardRadius: string;
      };
    };
    expect(patched.gallery.fontPreset).toBe('mono');
    expect(patched.gallery.accentColor).toBe('');
    expect(patched.gallery.backgroundColor).toBe('#11100e');
    expect(patched.gallery.surfaceColor).toBe('');
    expect(patched.gallery.textColor).toBe('#f4efe6');
    expect(patched.gallery.heroStyle).toBe('minimal');
    expect(patched.gallery.cardStyle).toBe('framed');
    expect(patched.gallery.captionMode).toBe('hidden');
    expect(patched.gallery.gridGap).toBe('compact');
    expect(patched.gallery.cardRadius).toBe('soft');

    const noGapRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ gridGap: 'none' })
      },
      env
    );
    expect(noGapRes.status).toBe(200);
    const noGapBody = (await noGapRes.json()) as { gallery: { gridGap: string } };
    expect(noGapBody.gallery.gridGap).toBe('none');
  });

  it('serves sanitized ESV Bible verses from public API with safe fallback', async () => {
    const res = await app.request('/api/bible/random', undefined, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = (await res.json()) as {
      reference: string;
      text: string;
      translation: string;
      source: string;
    };
    expect(body).toEqual({
      reference: 'John 3:16',
      text: 'For God so loved the world & gave his only Son.',
      translation: 'ESV',
      source: 'api'
    });

    globalThis.fetch = vi.fn(async () => new Response('Unavailable', { status: 503 })) as unknown as typeof fetch;
    const fallbackRes = await app.request('/api/bible/random', undefined, env);
    expect(fallbackRes.status).toBe(200);
    const fallbackBody = (await fallbackRes.json()) as {
      reference: string;
      text: string;
      translation: string;
      source: string;
    };
    expect(fallbackBody.translation).toBe('ESV');
    expect(fallbackBody.source).toBe('fallback');
    expect(fallbackBody.reference.length).toBeGreaterThan(2);
    expect(fallbackBody.text.length).toBeGreaterThan(10);
  });

  it('enforces HttpOnly admin cookies, token rotation, CSRF origin checks, password policy, and strict inputs', async () => {
    // Rejects short passwords (< 6 chars)
    const shortPwRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          password: '123'
        })
      },
      env
    );
    expect(shortPwRes.status).toBe(400);

    // Rejects unexpected JSON payload fields
    const extraFieldRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          isAdmin: true
        })
      },
      env
    );
    expect(extraFieldRes.status).toBe(400);

    // Rejects cross-origin POST requests
    const csrfRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.example'
        },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345'
        })
      },
      env
    );
    expect(csrfRes.status).toBe(403);

    // Create gallery & verify HttpOnly admin cookie issuance
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345'
        })
      },
      env
    );
    expect(createRes.status).toBe(201);
    expect(createRes.headers.get('cache-control')).toBe('private, no-store');
    const setCookieHeader = createRes.headers.get('set-cookie') || '';
    expect(setCookieHeader).toContain('HttpOnly');

    const created = (await createRes.json()) as { slug: string; managePath: string };
    const adminCookiePair = setCookieHeader.split(';')[0];
    const originalToken = created.managePath.split('#')[1];

    // Cookie alone authenticates GET /manage without Authorization header
    const cookieManageRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      { headers: { Cookie: adminCookiePair } },
      env
    );
    expect(cookieManageRes.status).toBe(200);
    expect(cookieManageRes.headers.get('cache-control')).toBe('private, no-store');

    // Rotate manage token -> invalidates old token & old cookie
    const rotateRes = await app.request(
      `/api/galleries/${created.slug}/manage/rotate-token`,
      {
        method: 'POST',
        headers: { Cookie: adminCookiePair }
      },
      env
    );
    expect(rotateRes.status).toBe(200);
    const rotated = (await rotateRes.json()) as { managePath: string };
    const rotatedToken = rotated.managePath.split('#')[1];
    expect(rotatedToken).not.toBe(originalToken);

    const oldTokenRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      { headers: { Authorization: `Bearer ${originalToken}` } },
      env
    );
    expect(oldTokenRes.status).toBe(401);

    const oldCookieRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      { headers: { Cookie: adminCookiePair } },
      env
    );
    expect(oldCookieRes.status).toBe(401);

    // Exchange new token for session cookie via /manage/session
    const sessionRes = await app.request(
      `/api/galleries/${created.slug}/manage/session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rotatedToken })
      },
      env
    );
    expect(sessionRes.status).toBe(200);
    const newCookiePair = (sessionRes.headers.get('set-cookie') || '').split(';')[0];

    const newCookieManageRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      { headers: { Cookie: newCookiePair } },
      env
    );
    expect(newCookieManageRes.status).toBe(200);
    const manageBody = (await newCookieManageRes.json()) as {
      items: Array<{ id: string }>;
    };
    const opaqueItemId = manageBody.items[0].id;

    // Media proxy rejects invalid Range header and invalid params
    const badRangeRes = await app.request(
      `/api/media/${created.slug}/${opaqueItemId}?variant=full`,
      { headers: { Range: 'bytes=evil-injection' } },
      env
    );
    expect(badRangeRes.status).toBe(400);

    const badParamRes = await app.request(
      `/api/media/INVALID_SLUG!/imgFile00001?variant=thumb`,
      {},
      env
    );
    expect(badParamRes.status).toBe(400);
  });

  it('triggers background auto-sync on stale cache with KV lock and respects autoSync toggle', async () => {
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345'
        })
      },
      env
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      slug: string;
      gallery: { autoSync: boolean; syncedAt: number };
    };
    expect(created.gallery.autoSync).toBe(true);
    const adminCookie = (createRes.headers.get('set-cookie') || '').split(';')[0];

    // Seed Drive mock to return 2 files on subsequent sync, and make gallery appear stale (> 6h)
    let driveListCalls = 0;
    const baseFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = decodeURIComponent(typeof input === 'string' ? input : input.toString());
      if (url.includes("'folderABC12345'+in+parents")) {
        driveListCalls += 1;
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'imgFile00001',
                name: 'portrait.jpg',
                mimeType: 'image/jpeg',
                size: '102400',
                imageMediaMetadata: { width: 1600, height: 2400 }
              },
              {
                id: 'imgFile00002',
                name: 'new-shot.jpg',
                mimeType: 'image/jpeg',
                size: '204800',
                imageMediaMetadata: { width: 1600, height: 1200 }
              }
            ]
          }),
          { status: 200 }
        );
      }
      return baseFetch(input, init);
    }) as typeof fetch;

    const row = await env.DB.prepare('SELECT * FROM galleries WHERE slug = ?1 LIMIT 1')
      .bind(created.slug)
      .first<GalleryRow>();
    expect(row).not.toBeNull();
    row!.synced_at = Date.now() - 7 * 60 * 60 * 1000;

    const pending: Promise<unknown>[] = [];
    const execCtx = { waitUntil: (p: Promise<unknown>) => pending.push(p) } as unknown as ExecutionContext;

    const viewRes = await app.fetch(
      new Request(`http://localhost/api/galleries/${created.slug}`),
      env,
      execCtx
    );
    expect(viewRes.status).toBe(200);
    await Promise.all(pending);
    expect(driveListCalls).toBe(1);
    expect(await env.CACHE.get(`autosync:${created.slug}`)).toBe('1');

    // Second stale view while KV lock is active does not re-trigger Drive sync
    row!.synced_at = Date.now() - 7 * 60 * 60 * 1000;
    const pending2: Promise<unknown>[] = [];
    await app.fetch(
      new Request(`http://localhost/api/galleries/${created.slug}`),
      env,
      { waitUntil: (p: Promise<unknown>) => pending2.push(p) } as unknown as ExecutionContext
    );
    await Promise.all(pending2);
    expect(driveListCalls).toBe(1);

    // Disable autoSync via Manage PATCH and confirm toggle persists
    const patchRes = await app.request(
      `/api/galleries/${created.slug}/manage`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ autoSync: false })
      },
      env
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { gallery: { autoSync: boolean } };
    expect(patched.gallery.autoSync).toBe(false);
  });

  it('includes /tools in sitemap.xml for organic discovery', async () => {
    const res = await app.request('/sitemap.xml', {}, env);
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('/tools');
  });

  it('rejects more than 3 Drive links on gallery creation and defaults heroStyle to fullscreen', async () => {
    const tooManyRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrls: [
            'https://drive.google.com/drive/folders/folderOne1234',
            'https://drive.google.com/drive/folders/folderTwo1234',
            'https://drive.google.com/drive/folders/folderThree34',
            'https://drive.google.com/drive/folders/folderFour123'
          ]
        })
      },
      env
    );
    expect(tooManyRes.status).toBe(400);
    const tooManyBody = (await tooManyRes.json()) as { code?: string };
    expect(tooManyBody.code).toBe('TOO_MANY_DRIVE_SOURCES');

    const okRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          allowDownload: false
        })
      },
      env
    );
    expect(okRes.status).toBe(201);
    const okBody = (await okRes.json()) as {
      gallery: { heroStyle: string; allowDownload: boolean; sourceCount: number };
    };
    expect(okBody.gallery.heroStyle).toBe('fullscreen');
    expect(okBody.gallery.allowDownload).toBe(false);
    expect(okBody.gallery.sourceCount).toBe(1);
  });

  it('performs zero KV writes on view/like/media and survives KV write quota exhaustion', async () => {
    const createRes = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345'
        })
      },
      env
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { slug: string };

    const putSpy = vi.spyOn(env.CACHE, 'put');

    const viewRes = await app.request(`/api/galleries/${created.slug}`, {}, env);
    expect(viewRes.status).toBe(200);
    const viewBody = (await viewRes.json()) as { items: Array<{ id: string }> };
    const itemId = viewBody.items[0].id;

    const likeRes = await app.request(
      `/api/galleries/${created.slug}/likes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: itemId, visitorId: 'visitor_12345678' })
      },
      env
    );
    expect(likeRes.status).toBe(200);

    const mediaRes = await app.request(
      `/api/media/${created.slug}/${itemId}?variant=thumb&w=800`,
      {},
      env
    );
    expect(mediaRes.status).toBe(200);

    // Zero KV writes for high-volume view, like, and media requests
    expect(putSpy).not.toHaveBeenCalled();

    // Simulate Cloudflare KV daily write quota exhaustion on low-volume create/unlock
    putSpy.mockRejectedValue(new Error('KV put() limit exceeded for the day'));

    const resilientCreate = await app.request(
      '/api/galleries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl: 'https://drive.google.com/drive/folders/folderABC12345',
          password: 'secret-password'
        })
      },
      env
    );
    expect(resilientCreate.status).toBe(201);
    const created2 = (await resilientCreate.json()) as { slug: string };

    const resilientUnlock = await app.request(
      `/api/galleries/${created2.slug}/unlock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'secret-password' })
      },
      env
    );
    expect(resilientUnlock.status).toBe(200);
  });
});
