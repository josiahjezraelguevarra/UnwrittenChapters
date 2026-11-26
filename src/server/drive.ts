import type { GalleryFolder, MediaItem } from '../shared/types';
import { SUPPORT_EMAIL } from '../shared/contact';
import { sanitizeControlChars } from './security';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{10,64}$/;
const DRIVE_FETCH_TIMEOUT_MS = 10_000;

const MAX_DEPTH = 3;
const MAX_FOLDERS = 40;
const MAX_ITEMS = 2000;

export class DriveError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (VALID_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (
    url.hostname !== 'drive.google.com' &&
    url.hostname !== 'www.drive.google.com' &&
    url.hostname !== 'docs.google.com'
  ) {
    return null;
  }

  // Matches /drive/folders/<id>, /drive/u/0/folders/<id>, /drive/mobile/folders/<id>
  const folderMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,64})/);
  if (folderMatch) {
    return folderMatch[1];
  }

  // Matches /open?id=<id> or /folderview?id=<id>
  const idParam = url.searchParams.get('id');
  if (idParam && VALID_ID_REGEX.test(idParam)) {
    return idParam;
  }

  return null;
}

interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
}

interface DriveListResponse {
  nextPageToken?: string;
  files?: RawDriveFile[];
  error?: { code?: number; message?: string };
}

function mapDriveApiFailure(status: number, bodyMessage?: string): DriveError {
  if (status === 404 || status === 403) {
    if (bodyMessage && /rate|quota|limit/i.test(bodyMessage)) {
      return new DriveError(
        `Google Drive API quota or rate limit reached. Please wait a moment and try again, or contact ${SUPPORT_EMAIL} if this persists.`,
        429,
        'RATE_LIMITED'
      );
    }
    return new DriveError(
      'Cannot access this Google Drive folder. Make sure sharing is set to "Anyone with the link → Viewer".',
      403,
      'PRIVATE_OR_NOT_FOUND'
    );
  }
  if (status === 429) {
    return new DriveError(
      `Google Drive API rate limit reached. Please try again shortly, or contact ${SUPPORT_EMAIL} if the issue continues.`,
      429,
      'RATE_LIMITED'
    );
  }
  if (bodyMessage) {
    console.warn('Drive API failure:', status, sanitizeControlChars(bodyMessage, 200));
  }
  return new DriveError(
    `Failed to read folder from Google Drive. If this persists, contact ${SUPPORT_EMAIL}.`,
    502,
    'DRIVE_API_ERROR'
  );
}

async function listSingleFolderPage(
  folderId: string,
  apiKey: string,
  pageToken: string | undefined,
  fetchFn: typeof fetch
): Promise<DriveListResponse> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: '1000',
    orderBy: 'folder,name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    fields:
      'nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis))',
    key: apiKey
  });
  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const res = await fetchFn(`${DRIVE_API_BASE}?${params.toString()}`, {
    signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS)
  });
  const data = (await res.json().catch(() => ({}))) as DriveListResponse;
  if (!res.ok) {
    throw mapDriveApiFailure(res.status, data.error?.message);
  }
  return data;
}

export interface DriveSyncResult {
  folderName: string;
  items: MediaItem[];
  folders: GalleryFolder[];
  truncated: boolean;
}

export async function fetchDriveFolderTree(
  rootFolderId: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<DriveSyncResult> {
  if (!apiKey) {
    throw new DriveError(
      `Server Google Drive API key is not configured. Contact ${SUPPORT_EMAIL} for assistance.`,
      500,
      'MISSING_API_KEY'
    );
  }

  const rootMetaParams = new URLSearchParams({
    fields: 'id,name,mimeType',
    supportsAllDrives: 'true',
    key: apiKey
  });
  const rootRes = await fetchFn(
    `${DRIVE_API_BASE}/${encodeURIComponent(rootFolderId)}?${rootMetaParams.toString()}`,
    { signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS) }
  );
  const rootData = (await rootRes.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    mimeType?: string;
    error?: { message?: string };
  };

  if (!rootRes.ok) {
    throw mapDriveApiFailure(rootRes.status, rootData.error?.message);
  }
  if (rootData.mimeType !== FOLDER_MIME) {
    throw new DriveError(
      'That link points to a single file, not a Google Drive folder.',
      400,
      'NOT_A_FOLDER'
    );
  }

  const safeRootName = sanitizeControlChars(rootData.name || 'Gallery', 120) || 'Gallery';
  const items: MediaItem[] = [];
  const folders: GalleryFolder[] = [
    {
      id: rootFolderId,
      name: safeRootName,
      path: '',
      parentId: null,
      itemCount: 0
    }
  ];
  const folderById = new Map<string, GalleryFolder>([[rootFolderId, folders[0]]]);

  interface QueueNode {
    id: string;
    path: string;
    depth: number;
  }

  const queue: QueueNode[] = [{ id: rootFolderId, path: '', depth: 0 }];
  const visited = new Set<string>([rootFolderId]);
  let truncated = false;

  while (queue.length > 0 && items.length < MAX_ITEMS) {
    const current = queue.shift()!;
    let pageToken: string | undefined;

    do {
      const page = await listSingleFolderPage(current.id, apiKey, pageToken, fetchFn);
      const files = page.files || [];

      for (const file of files) {
        if (file.mimeType === FOLDER_MIME) {
          if (
            VALID_ID_REGEX.test(file.id) &&
            current.depth < MAX_DEPTH &&
            folders.length < MAX_FOLDERS &&
            !visited.has(file.id)
          ) {
            visited.add(file.id);
            const cleanFolderName = sanitizeControlChars(file.name || 'Folder', 120) || 'Folder';
            const subPath = current.path ? `${current.path}/${cleanFolderName}` : cleanFolderName;
            const folderEntry: GalleryFolder = {
              id: file.id,
              name: cleanFolderName,
              path: subPath,
              parentId: current.id,
              itemCount: 0
            };
            folders.push(folderEntry);
            folderById.set(file.id, folderEntry);
            queue.push({ id: file.id, path: subPath, depth: current.depth + 1 });
          }
          continue;
        }

        if (!VALID_ID_REGEX.test(file.id)) continue;

        // Exclude SVG images to prevent active script execution if opened inline
        const isImage =
          file.mimeType.startsWith('image/') && !/svg|xml/i.test(file.mimeType);
        const isVideo = file.mimeType.startsWith('video/');
        if (!isImage && !isVideo) continue;

        if (items.length >= MAX_ITEMS) {
          truncated = true;
          break;
        }

        const width = isImage
          ? file.imageMediaMetadata?.width || 1200
          : file.videoMediaMetadata?.width || 1280;
        const height = isImage
          ? file.imageMediaMetadata?.height || 900
          : file.videoMediaMetadata?.height || 720;
        const durationMs =
          isVideo && file.videoMediaMetadata?.durationMillis
            ? Number(file.videoMediaMetadata.durationMillis)
            : null;
        const cleanFileName = sanitizeControlChars(file.name || 'media', 200) || 'media';

        items.push({
          id: file.id,
          name: cleanFileName,
          mimeType: file.mimeType,
          kind: isImage ? 'image' : 'video',
          sizeBytes: file.size ? Number(file.size) : 0,
          width,
          height,
          durationMs: Number.isFinite(durationMs) ? durationMs : null,
          folderId: current.id,
          folderPath: current.path,
          createdTime: file.createdTime || ''
        });

        const ownerFolder = folderById.get(current.id);
        if (ownerFolder) ownerFolder.itemCount += 1;
      }

      if (items.length >= MAX_ITEMS) {
        truncated = true;
        break;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }

  return {
    folderName: sanitizeControlChars(rootData.name || 'Untitled Gallery', 120) || 'Untitled Gallery',
    items,
    folders,
    truncated
  };
}

export async function fetchDriveThumbnailUrl(
  fileId: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<string | null> {
  const params = new URLSearchParams({
    fields: 'thumbnailLink',
    supportsAllDrives: 'true',
    key: apiKey
  });
  const res = await fetchFn(
    `${DRIVE_API_BASE}/${encodeURIComponent(fileId)}?${params.toString()}`,
    { signal: AbortSignal.timeout(DRIVE_FETCH_TIMEOUT_MS) }
  );
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { thumbnailLink?: string };
  return data.thumbnailLink || null;
}

export function buildThumbnailSizedUrl(thumbnailLink: string, width: number): string {
  const clamped = width <= 400 ? 400 : width <= 800 ? 800 : width <= 1200 ? 1200 : 1600;
  if (/=s\d+$/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=s\d+$/, `=w${clamped}`);
  }
  if (/=w\d+-h\d+/.test(thumbnailLink)) {
    return thumbnailLink.replace(/=w\d+-h\d+.*$/, `=w${clamped}`);
  }
  return thumbnailLink;
}

export function buildDriveMediaStreamUrl(fileId: string, apiKey: string): string {
  return `${DRIVE_API_BASE}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`;
}
