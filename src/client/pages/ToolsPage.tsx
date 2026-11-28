import { useState } from 'react';
import { ArrowLeft, Columns, QrCode, ShieldCheck, Stamp } from 'lucide-react';
import type { AppPublicConfig } from '../../shared/types';
import { CarouselCropperTool } from '../components/tools/CarouselCropperTool';
import { ExifStripperTool } from '../components/tools/ExifStripperTool';
import { QrTool } from '../components/tools/QrTool';
import { WatermarkTool } from '../components/tools/WatermarkTool';
import { usePageSeo } from '../lib/seo';

type ToolTab = 'watermark' | 'qr' | 'exif' | 'carousel';

interface ToolsPageProps {
  config: AppPublicConfig;
  onNavigate: (path: string) => void;
}

const TOOL_TABS: Array<{
  id: ToolTab;
  label: string;
  tagline: string;
  icon: typeof Stamp;
}> = [
  { id: 'watermark', label: 'Batch Watermark', tagline: 'Text or PNG logo up to 40 photos', icon: Stamp },
  { id: 'qr', label: 'QR & Print Card', tagline: 'PNG, SVG & 4×6 table card', icon: QrCode },
  { id: 'exif', label: 'EXIF Stripper', tagline: 'Remove GPS & camera metadata', icon: ShieldCheck },
  { id: 'carousel', label: 'Social Crop & Split', tagline: '3:4, 4:5, 9:16 & IG carousels', icon: Columns }
];

function initialTabFromUrl(): ToolTab {
  const param = new URLSearchParams(window.location.search).get('tool');
  if (param === 'qr' || param === 'exif' || param === 'carousel' || param === 'watermark') {
    return param;
  }
  return 'watermark';
}

export function ToolsPage({ config, onNavigate }: ToolsPageProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>(initialTabFromUrl);

  usePageSeo({
    title: `Free Browser Photo Tools — ${config.appName}`,
    description:
      'Free client-side photographer utilities: batch watermark up to 40 photos, generate QR 4×6 print cards, strip EXIF/GPS metadata, and split Instagram carousels.',
    robots: 'index, follow',
    canonicalPath: '/tools'
  });

  const selectTab = (tab: ToolTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tool', tab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#141311]">
      <header className="sticky top-0 z-20 border-b border-[#141311]/12 bg-[#f8f6f2]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#141311]/15 bg-white px-3.5 text-xs font-semibold text-[#141311] transition hover:bg-stone-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>
            <div>
              <h1 className="uc-font-serif text-lg font-semibold tracking-tight sm:text-xl">
                Creator Photo Tools
              </h1>
              <p className="text-[11px] text-[#141311]/60">
                100% browser-side — zero uploads, zero accounts, instant ZIP export.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex min-h-[38px] items-center rounded-full bg-[#141311] px-4 text-xs font-semibold text-[#f8f6f2] transition hover:bg-[#2a2824]"
          >
            Create Free Gallery
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div
          role="tablist"
          aria-label="Client-side photo utilities"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {TOOL_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(tab.id)}
                className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                  selected
                    ? 'border-[#141311] bg-[#141311] text-[#f8f6f2] shadow-sm'
                    : 'border-stone-200 bg-white text-slate-800 hover:border-stone-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-2 text-xs font-bold sm:text-sm">{tab.label}</span>
                <span
                  className={`mt-0.5 text-[11px] ${
                    selected ? 'text-[#f8f6f2]/75' : 'text-slate-500'
                  }`}
                >
                  {tab.tagline}
                </span>
              </button>
            );
          })}
        </div>

        <section aria-label="Active tool workspace">
          {activeTab === 'watermark' && <WatermarkTool />}
          {activeTab === 'qr' && <QrTool />}
          {activeTab === 'exif' && <ExifStripperTool />}
          {activeTab === 'carousel' && <CarouselCropperTool />}
        </section>
      </main>
    </div>
  );
}
