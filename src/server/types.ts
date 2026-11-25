import type { GalleryLayout, GalleryTheme } from '../shared/types';

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
  allowDownload: boolean;
  fileIds: Record<string, { name: string; mimeType: string; kind: 'image' | 'video' }>;
}
