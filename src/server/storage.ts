import type { MediaItem } from '../shared/types';
import { getPasswordVersion } from './crypto';
import type { CachedMediaManifest, GalleryRow } from './types';

const MANIFEST_TTL_SEC = 60 * 15; // 15 minutes

function manifestKey(slug: string): string {
  return `manifest:${slug}`;
}

export async function buildManifestFromRow(row: GalleryRow): Promise<CachedMediaManifest> {
  const items = JSON.parse(row.items_json) as MediaItem[];
  const fileIds: CachedMediaManifest['fileIds'] = {};
  for (const item of items) {
    fileIds[item.id] = {
      name: item.name,
      mimeType: item.mimeType,
      kind: item.kind
    };
  }
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    expiresAt: row.expires_at,
    hasPassword: Boolean(row.password_hash),
    passwordVersion: await getPasswordVersion(row.password_hash),
    allowDownload: row.allow_download === 1,
    fileIds
  };
}

export async function getGalleryBySlug(
  db: D1Database,
  slug: string
): Promise<GalleryRow | null> {
  const row = await db
    .prepare('SELECT * FROM galleries WHERE slug = ?1 LIMIT 1')
    .bind(slug)
    .first<GalleryRow>();
  return row ?? null;
}

export async function getMediaManifest(
  kv: KVNamespace,
  db: D1Database,
  slug: string
): Promise<CachedMediaManifest | null> {
  const cached = await kv.get(manifestKey(slug), 'json');
  if (cached) {
    return cached as CachedMediaManifest;
  }

  const row = await getGalleryBySlug(db, slug);
  if (!row) return null;

  const manifest = await buildManifestFromRow(row);
  await kv.put(manifestKey(slug), JSON.stringify(manifest), {
    expirationTtl: MANIFEST_TTL_SEC
  });
  return manifest;
}

export async function saveManifestCache(kv: KVNamespace, row: GalleryRow): Promise<void> {
  const manifest = await buildManifestFromRow(row);
  await kv.put(manifestKey(row.slug), JSON.stringify(manifest), {
    expirationTtl: MANIFEST_TTL_SEC
  });
}

export async function invalidateGalleryCache(kv: KVNamespace, slug: string): Promise<void> {
  await kv.delete(manifestKey(slug));
}

export async function checkRateLimit(
  kv: KVNamespace,
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const raw = await kv.get(bucketKey);
  const count = raw ? Number(raw) : 0;
  if (Number.isFinite(count) && count >= limit) {
    return false;
  }
  await kv.put(bucketKey, String((Number.isFinite(count) ? count : 0) + 1), {
    expirationTtl: windowSeconds
  });
  return true;
}
