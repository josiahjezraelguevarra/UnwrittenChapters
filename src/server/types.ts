import type {
  GalleryCaptionMode,
  GalleryCardRadius,
  GalleryCardStyle,
  GalleryFolder,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryHeroStyle,
  GalleryLayout,
  GalleryTheme,
  MediaItem
} from '../shared/types';

export interface StoredMediaItem extends MediaItem {
  publicId?: string;
  publicFolderId?: string;
}

export interface StoredGalleryFolder extends GalleryFolder {
  publicId?: string;
  publicParentId?: string | null;
}

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS?: Fetcher;
  GOOGLE_DRIVE_API_KEY: string;
  COOKIE_SIGNING_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_MODERATION_KEY?: string;
  PUBLIC_APP_NAME?: string;
  PUBLIC_DONATE_URL?: string;
  PUBLIC_FEEDBACK_FORM_URL?: string;
  PUBLIC_REPORT_FORM_URL?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
}

export interface GalleryRow {
  id: string;
  slug: string;
  drive_folder_id: string;
  title: string;
  description: string;
  cover_file_id: string | null;
  layout: GalleryLayout;
  theme: GalleryTheme;
  font_preset: GalleryFontPreset;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  hero_style: GalleryHeroStyle;
  card_style: GalleryCardStyle;
  caption_mode: GalleryCaptionMode;
  grid_gap: GalleryGridGap;
  card_radius: GalleryCardRadius;
  brand_name: string;
  brand_url: string;
  password_hash: string | null;
  admin_token_hash: string;
  allow_download: number;
  allow_likes: number;
  expires_at: number | null;
  status: string;
  items_json: string;
  folders_json: string;
  item_count: number;
  view_count: number;
  synced_at: number;
  created_at: number;
}

export interface CachedMediaManifest {
  id: string;
  slug: string;
  status: string;
  expiresAt: number | null;
  hasPassword: boolean;
  passwordVersion: string;
  allowDownload: boolean;
  fileIds: Record<
    string,
    { driveFileId: string; name: string; mimeType: string; kind: 'image' | 'video' }
  >;
}
