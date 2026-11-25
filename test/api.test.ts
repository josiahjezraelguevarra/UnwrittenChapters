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
              title: args[3] as string,
              description: args[4] as string,
              cover_file_id: args[5] as string | null,
              layout: args[6] as GalleryRow['layout'],
              theme: args[7] as GalleryRow['theme'],
              brand_name: args[8] as string,
              brand_url: args[9] as string,
              password_hash: args[10] as string | null,
              admin_token_hash: args[11] as string,
              allow_download: args[12] as number,
              allow_likes: args[13] as number,
              expires_at: args[14] as number | null,
              status: args[15] as string,
              items_json: args[16] as string,
              folders_json: args[17] as string,
              item_count: args[18] as number,
              view_count: args[19] as number,
              synced_at: args[20] as number,
              created_at: args[21] as number
            };
            galleries.set(row.id, row);
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

    // Unlocked gallery returns items
    const unlockedRes = await app.request(
      `/api/galleries/${created.slug}`,
      { headers: { Cookie: cookiePair } },
      env
    );
    const unlockedBody = (await unlockedRes.json()) as { locked: boolean; items: unknown[] };
    expect(unlockedBody.locked).toBe(false);
    expect(unlockedBody.items).toHaveLength(1);

    // Rejects arbitrary fileId not belonging to this gallery (no open proxy!)
    const foreignFileRes = await app.request(
      `/api/media/${created.slug}/foreignFile999?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(foreignFileRes.status).toBe(404);

    // Serves valid file with private cache header when password-protected
    const validMediaRes = await app.request(
      `/api/media/${created.slug}/imgFile00001?variant=thumb`,
      { headers: { Cookie: cookiePair } },
      env
    );
    expect(validMediaRes.status).toBe(200);
    expect(validMediaRes.headers.get('cache-control')).toBe('private, no-store');
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
    const created = (await createRes.json()) as { slug: string; managePath: string };
    const adminToken = created.managePath.split('#')[1];

    const likeRes = await app.request(
      `/api/galleries/${created.slug}/likes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: 'imgFile00001', visitorId: 'visitor_12345678' })
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
});
