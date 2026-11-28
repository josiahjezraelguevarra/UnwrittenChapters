import { FolderOpen, Lock, Palette, QrCode, RefreshCw } from 'lucide-react';

interface HomeIllustrationProps {
  dark: boolean;
}

export function DriveToGalleryIllustration({ dark }: HomeIllustrationProps) {
  const card = dark
    ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
    : 'border-[#141311]/12 bg-white text-[#141311]';
  const subtle = dark
    ? 'border-[#f4f1ea]/12 bg-[#252320] text-[#f4f1ea]/75'
    : 'border-[#141311]/10 bg-[#f4f1ea] text-[#141311]/75';
  const arrow = dark ? 'text-[#f4f1ea]/35' : 'text-[#141311]/35';

  return (
    <div
      aria-hidden="true"
      className={`mt-6 rounded-2xl border p-4 ${
        dark ? 'border-[#f4f1ea]/14 bg-[#171613]' : 'border-[#141311]/12 bg-[#f1ede5]/75'
      }`}
    >
      <div className="grid grid-cols-11 items-center gap-1.5">
        {/* Step A: Drive */}
        <div className={`col-span-3 rounded-xl border p-2.5 text-center shadow-2xs ${card}`}>
          <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border ${subtle}`}>
            <FolderOpen className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1.5 text-[11px] leading-tight font-semibold">Drive</p>
          <p className="mt-0.5 text-[9px] opacity-60">1–3 links</p>
        </div>

        <div className={`col-span-1 flex justify-center text-xs font-bold ${arrow}`}>→</div>

        {/* Step B: Style */}
        <div className={`col-span-3 rounded-xl border p-2.5 text-center shadow-2xs ${card}`}>
          <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border ${subtle}`}>
            <Palette className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1.5 text-[11px] leading-tight font-semibold">Style</p>
          <div className="mt-1 flex justify-center gap-1">
            <span className="h-2 w-2 rounded-full bg-stone-400" />
            <span className="h-2 w-2 rounded-full bg-stone-600" />
            <span className="h-2 w-2 rounded-full bg-amber-600/80" />
          </div>
        </div>

        <div className={`col-span-1 flex justify-center text-xs font-bold ${arrow}`}>→</div>

        {/* Step C: Deliver */}
        <div className={`col-span-3 rounded-xl border p-2.5 text-center shadow-2xs ${card}`}>
          <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border ${subtle}`}>
            <QrCode className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1.5 text-[11px] leading-tight font-semibold">Deliver</p>
          <p className="mt-0.5 text-[9px] opacity-60">Link &amp; ZIP</p>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksIllustration({
  step,
  dark
}: {
  step: '01' | '02' | '03';
  dark: boolean;
}) {
  const frame = dark
    ? 'border-[#f4f1ea]/14 bg-[#1b1a17] text-[#f4f1ea]'
    : 'border-[#141311]/12 bg-[#f1ede5]/80 text-[#141311]';
  const card = dark
    ? 'border-[#f4f1ea]/16 bg-[#24221e] text-[#f4f1ea]'
    : 'border-[#141311]/12 bg-white text-[#141311]';
  const chip = dark
    ? 'bg-[#f4f1ea]/10 text-[#f4f1ea]/80'
    : 'bg-stone-100 text-slate-700';

  if (step === '01') {
    return (
      <div
        aria-hidden="true"
        className={`flex h-24 items-center justify-center rounded-xl border px-3 ${frame}`}
      >
        <div className={`w-full max-w-[230px] rounded-lg border px-2.5 py-2 shadow-2xs ${card}`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${chip}`}>
              <FolderOpen className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="h-1.5 w-20 rounded-full bg-current opacity-25" />
              <p className="mt-1 truncate text-[10px] font-medium opacity-80">
                Anyone with the link · Viewer
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === '02') {
    return (
      <div
        aria-hidden="true"
        className={`flex h-24 items-center justify-center rounded-xl border px-3 ${frame}`}
      >
        <div className={`w-full max-w-[230px] rounded-lg border p-2 shadow-2xs ${card}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${chip}`}>+3 folders</span>
              <span className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${chip}`}>
                <Lock className="h-2.5 w-2.5" />
                PIN
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-800" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <span className="h-6 rounded bg-current opacity-12" />
            <span className="h-6 rounded bg-current opacity-20" />
            <span className="h-6 rounded bg-current opacity-15" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex h-24 items-center justify-center rounded-xl border px-3 ${frame}`}
    >
      <div className="flex w-full max-w-[230px] items-center gap-2">
        <div className={`flex-1 rounded-lg border px-2.5 py-2 shadow-2xs ${card}`}>
          <p className="font-mono text-[9px] opacity-60">/g/your-story</p>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
            <RefreshCw className="h-2.5 w-2.5" />
            Auto-sync on
          </div>
        </div>
        <div className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border p-1 shadow-2xs ${card}`}>
          <QrCode className="h-7 w-7 opacity-80" />
          <span className="mt-0.5 text-[7px] font-semibold opacity-60">4×6</span>
        </div>
      </div>
    </div>
  );
}
