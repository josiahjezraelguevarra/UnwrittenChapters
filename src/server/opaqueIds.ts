import type { GalleryFolder, MediaItem } from '../shared/types';
import { randomToken } from './crypto';
import type { StoredGalleryFolder, StoredMediaItem } from './types';

export function assignOpaqueIds(
  items: MediaItem[],
  folders: GalleryFolder[],
  prevItems: StoredMediaItem[] = [],
  prevFolders: StoredGalleryFolder[] = []
): { storedItems: StoredMediaItem[]; storedFolders: StoredGalleryFolder[] } {
  const existingFileMap = new Map<string, string>();
  for (const prev of prevItems) {
    if (prev.publicId) existingFileMap.set(prev.id, prev.publicId);
  }

  const existingFolderMap = new Map<string, string>();
  for (const prev of prevFolders) {
    if (prev.publicId) existingFolderMap.set(prev.id, prev.publicId);
  }

  const folderPublicIdByDriveId = new Map<string, string>();
  for (const f of folders) {
    const pubId = existingFolderMap.get(f.id) || randomToken(8);
    folderPublicIdByDriveId.set(f.id, pubId);
  }

  const storedFolders: StoredGalleryFolder[] = folders.map((f) => ({
    ...f,
    publicId: folderPublicIdByDriveId.get(f.id)!,
    publicParentId: f.parentId ? folderPublicIdByDriveId.get(f.parentId) || null : null
  }));

  const storedItems: StoredMediaItem[] = items.map((item) => ({
    ...item,
    publicId: existingFileMap.get(item.id) || randomToken(9),
    publicFolderId: folderPublicIdByDriveId.get(item.folderId) || randomToken(8)
  }));

  return { storedItems, storedFolders };
}

export function toPublicItems(storedItems: StoredMediaItem[]): MediaItem[] {
  return storedItems.map((item) => ({
    id: item.publicId || item.id,
    name: item.name,
    mimeType: item.mimeType,
    kind: item.kind,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
    durationMs: item.durationMs,
    folderId: item.publicFolderId || item.folderId,
    folderPath: item.folderPath,
    createdTime: item.createdTime
  }));
}

export function toPublicFolders(storedFolders: StoredGalleryFolder[]): GalleryFolder[] {
  return storedFolders.map((folder) => ({
    id: folder.publicId || folder.id,
    name: folder.name,
    path: folder.path,
    parentId: folder.publicParentId !== undefined ? folder.publicParentId : folder.parentId,
    itemCount: folder.itemCount
  }));
}

export function toPublicFileId(
  storedItems: StoredMediaItem[],
  driveFileId: string | null
): string | null {
  if (!driveFileId) return null;
  const match = storedItems.find((item) => item.id === driveFileId);
  if (!match) return null;
  return match.publicId || match.id;
}

export function resolveDriveFileId(
  storedItems: StoredMediaItem[],
  incomingId: string
): string | null {
  const match = storedItems.find((item) => (item.publicId || item.id) === incomingId);
  return match ? match.id : null;
}
