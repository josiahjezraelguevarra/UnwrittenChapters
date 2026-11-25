import { useId } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import {
  ACCENT_PRESETS,
  CARD_RADIUS_META,
  FONT_PRESETS,
  GRID_GAP_META,
  getContrastTextColor,
  sanitizeHexColor,
  type GalleryCardRadius,
  type GalleryFontPreset,
  type GalleryGridGap
} from '../../shared/customization';
import type { GalleryTheme } from '../../shared/types';

export interface GalleryStyleValues {
  theme: GalleryTheme;
  fontPreset: GalleryFontPreset;
  accentColor: string;
  gridGap: GalleryGridGap;
  cardRadius: GalleryCardRadius;
}

interface GalleryStyleControlsProps {
  values: GalleryStyleValues;
  onChange: <K extends keyof GalleryStyleValues>(key: K, value: GalleryStyleValues[K]) => void;
  previewTitle?: string;
  previewBrand?: string;
  showMiniPreview?: boolean;
  compact?: boolean;
  dark?: boolean;
}

const FONT_LIST = Object.values(FONT_PRESETS);
const GAP_LIST = Object.values(GRID_GAP_META);
const RADIUS_LIST = Object.values(CARD_RADIUS_META);

export function GalleryStyleControls({
  values,
  onChange,
  previewTitle,
  previewBrand,
  showMiniPreview = true,
  compact = false,
  dark = false
}: GalleryStyleControlsProps) {
  const customColorId = useId();
  const customHexId = useId();

  const isDark = values.theme === 'dark';
  const validAccent = sanitizeHexColor(values.accentColor);
  const resolvedAccentBg = validAccent || (isDark ? '#ffffff' : '#0f172a');
  const resolvedAccentFg = validAccent
    ? getContrastTextColor(validAccent)
    : isDark
      ? '#020617'
      : '#ffffff';
  const fontMeta = FONT_PRESETS[values.fontPreset];
  const gapPx =
    values.gridGap === 'none'
      ? '0px'
      : values.gridGap === 'compact'
        ? '4px'
        : values.gridGap === 'airy'
          ? '12px'
          : '8px';
  const previewRadius =
    values.cardRadius === 'sharp' ? '0px' : values.cardRadius === 'soft' ? '12px' : '6px';

  return (
    <div
      className={`space-y-4 rounded-xl border p-4 sm:col-span-2 ${
        dark
          ? 'border-[#f4f1ea]/15 bg-[#161513] text-[#f4f1ea]'
          : 'border-stone-200 bg-white text-slate-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <Palette className={`h-4 w-4 ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`} />
        <h3
          className={`text-xs font-semibold tracking-wide uppercase ${
            dark ? 'text-[#f4f1ea]' : 'text-slate-800'
          }`}
        >
          Visual Styling & Typography
        </h3>
      </div>

      {/* Typography Presets */}
      <div>
        <span
          className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
        >
          Typography Preset
        </span>
        <div
          role="radiogroup"
          aria-label="Typography Preset"
          className={`mt-1.5 grid grid-cols-1 gap-2 ${compact ? '' : 'sm:grid-cols-3'}`}
        >
          {FONT_LIST.map((preset) => {
            const selected = values.fontPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange('fontPreset', preset.id)}
                className={`flex min-h-[52px] items-center justify-between rounded-lg border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  dark
                    ? `${
                        selected
                          ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                          : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/35'
                      } focus-visible:outline-[#f4f1ea]`
                    : `${
                        selected
                          ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                          : 'border-stone-200 bg-stone-50/60 hover:border-stone-300 hover:bg-stone-100/70'
                      } focus-visible:outline-slate-900`
                }`}
              >
                <div>
                  <span
                    className={`block text-sm font-semibold ${
                      dark ? 'text-[#f4f1ea]' : 'text-slate-900'
                    }`}
                    style={{ fontFamily: preset.headingFamily }}
                  >
                    {preset.label}
                  </span>
                  <span
                    className={`block text-[11px] ${
                      dark ? 'text-[#f4f1ea]/60' : 'text-slate-500'
                    }`}
                  >
                    {preset.tagline}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={`text-lg font-bold ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
                  style={{ fontFamily: preset.headingFamily }}
                >
                  Aa
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <span
          className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
        >
          Accent Color
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const active = validAccent === preset.hex;
            const isDefault = preset.hex === '';
            return (
              <button
                key={preset.label}
                type="button"
                aria-label={preset.label}
                aria-pressed={active}
                title={preset.label}
                onClick={() => onChange('accentColor', preset.hex)}
                className={`relative flex h-9 min-w-[36px] items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isDefault ? 'px-3 text-xs font-medium' : 'w-9'
                } ${
                  dark
                    ? `${
                        active
                          ? 'border-[#f4f1ea] ring-2 ring-[#f4f1ea]/35'
                          : 'border-[#f4f1ea]/25 hover:scale-105'
                      } focus-visible:outline-[#f4f1ea]`
                    : `${
                        active
                          ? 'border-slate-900 ring-2 ring-slate-900/25'
                          : 'border-stone-300 hover:scale-105'
                      } focus-visible:outline-slate-900`
                }`}
                style={
                  isDefault
                    ? { backgroundColor: isDark ? '#0f172a' : '#f5f5f4', color: isDark ? '#fff' : '#0f172a' }
                    : { backgroundColor: preset.hex, color: getContrastTextColor(preset.hex) }
                }
              >
                {isDefault ? (
                  <span>Default</span>
                ) : (
                  active && <Check className="h-4 w-4 stroke-[2.5]" />
                )}
              </button>
            );
          })}

          <div
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 ${
              dark ? 'border-[#f4f1ea]/20 bg-[#1c1b18]' : 'border-stone-300 bg-stone-50'
            }`}
          >
            <label htmlFor={customColorId} className="sr-only">
              Custom accent color picker
            </label>
            <input
              id={customColorId}
              type="color"
              value={validAccent || '#0f172a'}
              onChange={(e) => onChange('accentColor', e.target.value.toLowerCase())}
              className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            <label htmlFor={customHexId} className="sr-only">
              Custom hex color
            </label>
            <input
              id={customHexId}
              type="text"
              value={values.accentColor}
              onChange={(e) => onChange('accentColor', e.target.value)}
              placeholder="#hex"
              maxLength={7}
              className={`w-16 bg-transparent font-mono text-xs focus:outline-none ${
                dark ? 'text-[#f4f1ea]' : 'text-slate-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Spacing & Corner Radius */}
      <div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div>
          <span
            className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
          >
            Photo Spacing
          </span>
          <div
            role="radiogroup"
            aria-label="Photo Spacing"
            className={`mt-1.5 grid grid-cols-2 gap-1 rounded-lg border p-1 sm:grid-cols-4 ${
              dark ? 'border-[#f4f1ea]/15 bg-[#1c1b18]' : 'border-stone-200 bg-stone-100'
            }`}
          >
            {GAP_LIST.map((opt) => {
              const selected = values.gridGap === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange('gridGap', opt.id)}
                  className={`min-h-[34px] rounded-md text-xs font-medium transition ${
                    dark
                      ? selected
                        ? 'bg-[#f4f1ea] text-[#141311] shadow-2xs'
                        : 'text-[#f4f1ea]/65 hover:text-[#f4f1ea]'
                      : selected
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span
            className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
          >
            Corner Style
          </span>
          <div
            role="radiogroup"
            aria-label="Corner Style"
            className={`mt-1.5 grid grid-cols-3 gap-1 rounded-lg border p-1 ${
              dark ? 'border-[#f4f1ea]/15 bg-[#1c1b18]' : 'border-stone-200 bg-stone-100'
            }`}
          >
            {RADIUS_LIST.map((opt) => {
              const selected = values.cardRadius === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange('cardRadius', opt.id)}
                  className={`min-h-[34px] rounded-md text-xs font-medium transition ${
                    dark
                      ? selected
                        ? 'bg-[#f4f1ea] text-[#141311] shadow-2xs'
                        : 'text-[#f4f1ea]/65 hover:text-[#f4f1ea]'
                      : selected
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Mini Preview */}
      {showMiniPreview && (
        <div
          aria-label="Live style preview"
          className={`rounded-xl border p-3.5 transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-950 text-slate-100'
              : 'border-stone-200 bg-stone-50 text-slate-900'
          }`}
          style={{ fontFamily: fontMeta.bodyFamily }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase opacity-70">
                <Sparkles className="h-3 w-3" style={validAccent ? { color: validAccent } : undefined} />
                <span className="truncate">{previewBrand || 'Your Studio'}</span>
              </p>
              <p
                className="truncate text-base font-bold"
                style={{ fontFamily: fontMeta.headingFamily }}
              >
                {previewTitle || 'Client Gallery Preview'}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: resolvedAccentBg, color: resolvedAccentFg }}
            >
              Download ZIP
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4" style={{ gap: gapPx }}>
            {[
              'from-amber-200/80 to-stone-300/80',
              'from-rose-200/80 to-amber-100/80',
              'from-emerald-200/80 to-teal-100/80',
              'from-slate-300/80 to-stone-200/80'
            ].map((grad, idx) => (
              <div
                key={idx}
                className={`aspect-[4/3] bg-gradient-to-br ${grad} ${
                  isDark ? 'opacity-80' : 'opacity-95'
                }`}
                style={{ borderRadius: previewRadius }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
