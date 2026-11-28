import { getPasswordVersion } from './crypto';
import type { CachedMediaManifest, GalleryRow, StoredMediaItem } from './types';

const MANIFEST_TTL_SEC = 60 * 60 * 24; // 24 hours (explicitly refreshed on mutations)
const ISOLATE_MANIFEST_TTL_MS = 60 * 1000; // 60 seconds in-isolate L1 cache
const MAX_ISOLATE_MANIFESTS = 250;
const MAX_ISOLATE_RL_BUCKETS = 2000;

interface IsolateManifestEntry {
  manifest: CachedMediaManifest;
  expiresAt: number;
}

interface IsolateRateBucket {
  count: number;
  resetAt: number;
}

const isolateManifestCache = new Map<string, IsolateManifestEntry>();
const isolateRateLimits = new Map<string, IsolateRateBucket>();

function manifestKey(slug: string): string {
  return `manifest:${slug}`;
}

function setIsolateManifest(slug: string, manifest: CachedMediaManifest): void {
  if (isolateManifestCache.size >= MAX_ISOLATE_MANIFESTS) {
    const oldestKey = isolateManifestCache.keys().next().value;
    if (oldestKey) isolateManifestCache.delete(oldestKey);
  }
  isolateManifestCache.set(slug, {
    manifest,
    expiresAt: Date.now() + ISOLATE_MANIFEST_TTL_MS
  });
}

export async function buildManifestFromRow(row: GalleryRow): Promise<CachedMediaManifest> {
  const items = JSON.parse(row.items_json) as StoredMediaItem[];
  const fileIds: CachedMediaManifest['fileIds'] = {};
  for (const item of items) {
    const publicKey = item.publicId || item.id;
    fileIds[publicKey] = {
      driveFileId: item.id,
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
  const now = Date.now();
  const l1 = isolateManifestCache.get(slug);
  if (l1 && l1.expiresAt > now) {
    return l1.manifest;
  }

  try {
    const cached = await kv.get(manifestKey(slug), 'json');
    if (cached) {
      const manifest = cached as CachedMediaManifest;
      setIsolateManifest(slug, manifest);
      return manifest;
    }
  } catch {
    // Fall back to D1 if KV read fails
  }

  const row = await getGalleryBySlug(db, slug);
  if (!row) return null;

  const manifest = await buildManifestFromRow(row);
  setIsolateManifest(slug, manifest);
  try {
    await kv.put(manifestKey(slug), JSON.stringify(manifest), {
      expirationTtl: MANIFEST_TTL_SEC
    });
  } catch {
    // Graceful fallback when KV daily write limit is reached
  }
  return manifest;
}

export async function saveManifestCache(kv: KVNamespace, row: GalleryRow): Promise<void> {
  const manifest = await buildManifestFromRow(row);
  setIsolateManifest(row.slug, manifest);
  try {
    await kv.put(manifestKey(row.slug), JSON.stringify(manifest), {
      expirationTtl: MANIFEST_TTL_SEC
    });
  } catch {
    // Graceful fallback when KV daily write limit is reached
  }
}

export async function invalidateGalleryCache(kv: KVNamespace, slug: string): Promise<void> {
  isolateManifestCache.delete(slug);
  try {
    await kv.delete(manifestKey(slug));
  } catch {
    // Graceful fallback when KV daily delete limit is reached
  }
}

/**
 * Zero-KV fixed-window rate limiter in isolate memory for high-volume read/media endpoints.
 */
export function checkEdgeRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number
): boolean {
  const now = Date.now();
  const existing = isolateRateLimits.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    if (isolateRateLimits.size >= MAX_ISOLATE_RL_BUCKETS) {
      for (const [key, entry] of isolateRateLimits) {
        if (entry.resetAt <= now) isolateRateLimits.delete(key);
      }
      if (isolateRateLimits.size >= MAX_ISOLATE_RL_BUCKETS) {
        const oldestKey = isolateRateLimits.keys().next().value;
        if (oldestKey) isolateRateLimits.delete(oldestKey);
      }
    }
    isolateRateLimits.set(bucketKey, {
      count: 1,
      resetAt: now + windowSeconds * 1000
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }
  existing.count += 1;
  return true;
}

/**
 * Global KV-backed rate limiter for low-volume security mutations, falling back to
 * isolate memory if KV quota is exceeded.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const raw = await kv.get(bucketKey);
    const count = raw ? Number(raw) : 0;
    if (Number.isFinite(count) && count >= limit) {
      return false;
    }
    await kv.put(bucketKey, String((Number.isFinite(count) ? count : 0) + 1), {
      expirationTtl: windowSeconds
    });
    return true;
  } catch {
    return checkEdgeRateLimit(bucketKey, limit, windowSeconds);
  }
}
