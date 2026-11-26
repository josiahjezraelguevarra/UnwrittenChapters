import type {
  GalleryCaptionMode,
  GalleryCardRadius,
  GalleryCardStyle,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryHeroStyle
} from './customization';

export type {
  GalleryCaptionMode,
  GalleryCardRadius,
  GalleryCardStyle,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryHeroStyle
};
export type GalleryLayout = 'masonry' | 'grid' | 'justified';
export type GalleryTheme = 'light' | 'dark';
export type MediaKind = 'image' | 'video';

export interface MediaItem {
  id: string;
  name: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number;
  height: number;
  durationMs: number | null;
  folderId: string;
  folderPath: string;
  createdTime: string;
}

export interface GalleryFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  itemCount: number;
}

export interface PublicGalleryConfig {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverFileId: string | null;
  layout: GalleryLayout;
  theme: GalleryTheme;
  fontPreset: GalleryFontPreset;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  heroStyle: GalleryHeroStyle;
  cardStyle: GalleryCardStyle;
  captionMode: GalleryCaptionMode;
  gridGap: GalleryGridGap;
  cardRadius: GalleryCardRadius;
  brandName: string;
  brandUrl: string;
  allowDownload: boolean;
  allowLikes: boolean;
  hasPassword: boolean;
  expiresAt: number | null;
  itemCount: number;
  viewCount: number;
  syncedAt: number;
  createdAt: number;
}

export interface GalleryViewResponse {
  locked: boolean;
  gallery: PublicGalleryConfig;
  items: MediaItem[];
  folders: GalleryFolder[];
  likeCounts: Record<string, number>;
  visitorLikes: string[];
}

export interface AppPublicConfig {
  appName: string;
  donateUrl: string;
  feedbackFormUrl: string;
  reportFormUrl: string;
  turnstileSiteKey: string;
  turnstileRequired: boolean;
}

export interface RecentGalleryEntry {
  slug: string;
  title: string;
  sharePath: string;
  managePath: string;
  itemCount: number;
  createdAt: number;
}
