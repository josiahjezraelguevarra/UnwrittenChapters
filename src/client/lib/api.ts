import type {
  AppPublicConfig,
  GalleryCardRadius,
  GalleryFolder,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryLayout,
  GalleryTheme,
  GalleryViewResponse,
  MediaItem,
  PublicGalleryConfig,
  RecentGalleryEntry
} from '../../shared/types';

const VISITOR_KEY = 'uc_visitor_id';
const RECENT_KEY = 'uc_recent_galleries';
const ADMIN_TOKEN_PREFIX = 'uc_admin_token_';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
      res.status,
      typeof data.code === 'string' ? data.code : undefined
    );
  }
  return data as T;
}

export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const generated = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(VISITOR_KEY, generated);
    return generated;
  } catch {
    return 'anonymous_visitor';
  }
}

export function getRecentGalleries(): RecentGalleryEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentGalleryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentGallery(entry: RecentGalleryEntry): void {
  try {
    const current = getRecentGalleries().filter((g) => g.slug !== entry.slug);
    const updated = [entry, ...current].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota issues
  }
}

export function removeRecentGallery(slug: string): void {
  try {
    const updated = getRecentGalleries().filter((g) => g.slug !== slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function saveAdminToken(slug: string, token: string): void {
  try {
    localStorage.setItem(`${ADMIN_TOKEN_PREFIX}${slug}`, token);
  } catch {
    // Ignore
  }
}

export function loadAdminToken(slug: string): string {
  try {
    return localStorage.getItem(`${ADMIN_TOKEN_PREFIX}${slug}`) || '';
  } catch {
    return '';
  }
}

export async function fetchAppConfig(): Promise<AppPublicConfig> {
  const res = await fetch('/api/config');
  return parseJson<AppPublicConfig>(res);
}

export interface CreateGalleryPayload {
  driveUrl: string;
  title?: string;
  description?: string;
  brandName?: string;
  brandUrl?: string;
  layout?: GalleryLayout;
  theme?: GalleryTheme;
  fontPreset?: GalleryFontPreset;
  accentColor?: string;
  gridGap?: GalleryGridGap;
  cardRadius?: GalleryCardRadius;
  password?: string;
  expiresInDays?: number | null;
  allowDownload?: boolean;
  allowLikes?: boolean;
  customSlug?: string;
  turnstileToken?: string;
}

export interface CreateGalleryResponse {
  slug: string;
  sharePath: string;
  managePath: string;
  gallery: PublicGalleryConfig;
  truncated: boolean;
}

export async function createGallery(payload: CreateGalleryPayload): Promise<CreateGalleryResponse> {
  const res = await fetch('/api/galleries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseJson<CreateGalleryResponse>(res);
}

export async function fetchGalleryView(slug: string): Promise<GalleryViewResponse> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}`, {
    headers: { 'X-Visitor-Id': getOrCreateVisitorId() }
  });
  return parseJson<GalleryViewResponse>(res);
}

export async function unlockGallery(slug: string, password: string): Promise<void> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  await parseJson<{ unlocked: boolean }>(res);
}

export async function toggleLike(
  slug: string,
  fileId: string
): Promise<{ liked: boolean; count: number }> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, visitorId: getOrCreateVisitorId() })
  });
  return parseJson<{ liked: boolean; count: number }>(res);
}

export interface ManageGalleryResponse {
  gallery: PublicGalleryConfig;
  driveFolderId: string;
  items: MediaItem[];
  folders: GalleryFolder[];
  likeCounts: Record<string, number>;
}

export async function fetchManageGallery(
  slug: string,
  adminToken: string
): Promise<ManageGalleryResponse> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/manage`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return parseJson<ManageGalleryResponse>(res);
}

export async function updateManageGallery(
  slug: string,
  adminToken: string,
  patch: Record<string, unknown>
): Promise<{ gallery: PublicGalleryConfig }> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(patch)
  });
  return parseJson<{ gallery: PublicGalleryConfig }>(res);
}

export async function syncGalleryDrive(
  slug: string,
  adminToken: string
): Promise<{
  itemCount: number;
  syncedAt: number;
  truncated: boolean;
  items: MediaItem[];
  folders: GalleryFolder[];
}> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return parseJson(res);
}

export async function deleteGallery(slug: string, adminToken: string): Promise<void> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await parseJson<{ deleted: boolean }>(res);
}

export async function reportGallery(
  slug: string,
  reason: string,
  details: string,
  turnstileToken?: string
): Promise<void> {
  const res = await fetch(`/api/galleries/${encodeURIComponent(slug)}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, details, turnstileToken })
  });
  await parseJson<{ reported: boolean }>(res);
}

export interface BibleVerseResponse {
  reference: string;
  text: string;
  translation: string;
  source?: 'api' | 'fallback';
}

export async function fetchRandomBibleVerse(signal?: AbortSignal): Promise<BibleVerseResponse> {
  const res = await fetch('/api/bible/random', { signal, cache: 'no-store' });
  return parseJson<BibleVerseResponse>(res);
}

export function mediaThumbUrl(slug: string, fileId: string, width = 800): string {
  return `/api/media/${encodeURIComponent(slug)}/${encodeURIComponent(fileId)}?variant=thumb&w=${width}`;
}

export function mediaFullUrl(slug: string, fileId: string, download = false): string {
  return `/api/media/${encodeURIComponent(slug)}/${encodeURIComponent(fileId)}?variant=full${
    download ? '&download=1' : ''
  }`;
}
