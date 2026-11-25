export type GalleryFontPreset = 'sans' | 'serif' | 'mono';
export type GalleryGridGap = 'none' | 'compact' | 'normal' | 'airy';
export type GalleryCardRadius = 'sharp' | 'rounded' | 'soft';

export interface FontPresetMeta {
  id: GalleryFontPreset;
  label: string;
  tagline: string;
  headingFamily: string;
  bodyFamily: string;
}

export const FONT_PRESETS: Record<GalleryFontPreset, FontPresetMeta> = {
  sans: {
    id: 'sans',
    label: 'Modern Sans',
    tagline: 'Clean & balanced',
    headingFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },
  serif: {
    id: 'serif',
    label: 'Editorial Serif',
    tagline: 'Timeless & boutique',
    headingFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },
  mono: {
    id: 'mono',
    label: 'Minimal Mono',
    tagline: 'Crisp & gallery-like',
    headingFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  }
};

export const GRID_GAP_META: Record<
  GalleryGridGap,
  { id: GalleryGridGap; label: string; cssValue: string }
> = {
  none: { id: 'none', label: 'None', cssValue: '0px' },
  compact: { id: 'compact', label: 'Compact', cssValue: '0.5rem' },
  normal: { id: 'normal', label: 'Normal', cssValue: '1rem' },
  airy: { id: 'airy', label: 'Airy', cssValue: '1.75rem' }
};

export const CARD_RADIUS_META: Record<
  GalleryCardRadius,
  { id: GalleryCardRadius; label: string; cssValue: string }
> = {
  sharp: { id: 'sharp', label: 'Sharp', cssValue: '0px' },
  rounded: { id: 'rounded', label: 'Rounded', cssValue: '0.75rem' },
  soft: { id: 'soft', label: 'Soft', cssValue: '1.25rem' }
};

export interface AccentPreset {
  label: string;
  hex: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { label: 'Theme Default', hex: '' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Terracotta', hex: '#c2410c' },
  { label: 'Teal', hex: '#0d9488' }
];

export function validateFontPreset(raw: unknown): GalleryFontPreset {
  if (raw === 'serif' || raw === 'mono' || raw === 'sans') return raw;
  return 'sans';
}

export function validateGridGap(raw: unknown): GalleryGridGap {
  if (raw === 'none' || raw === 'compact' || raw === 'airy' || raw === 'normal') return raw;
  return 'normal';
}

export function validateCardRadius(raw: unknown): GalleryCardRadius {
  if (raw === 'sharp' || raw === 'soft' || raw === 'rounded') return raw;
  return 'rounded';
}

export function sanitizeHexColor(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return '';
}

/**
 * Returns '#0f172a' or '#ffffff' to maintain >= 4.5:1 WCAG contrast on top of a hex background.
 */
export function getContrastTextColor(hex: string): '#0f172a' | '#ffffff' {
  const clean = sanitizeHexColor(hex);
  if (!clean) return '#ffffff';
  const r = parseInt(clean.slice(1, 3), 16) / 255;
  const g = parseInt(clean.slice(3, 5), 16) / 255;
  const b = parseInt(clean.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.18 ? '#0f172a' : '#ffffff';
}
