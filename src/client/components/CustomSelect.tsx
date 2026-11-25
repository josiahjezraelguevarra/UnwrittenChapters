import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  thumbUrl?: string;
  icon?: ReactNode;
}

interface CustomSelectProps<T extends string = string> {
  id?: string;
  label?: string;
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  dark?: boolean;
  className?: string;
}

export function CustomSelect<T extends string = string>({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  dark = false,
  className = ''
}: CustomSelectProps<T>) {
  const autoId = useId();
  const buttonId = id || autoId;
  const listboxId = `${buttonId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActiveIndex(idx);
  }, [value, options]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return;

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const chosen = options[activeIndex];
      if (chosen) {
        onChange(chosen.value);
        setOpen(false);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={buttonId}
          className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
        >
          {label}
        </label>
      )}
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`mt-1 flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left text-sm shadow-2xs transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          dark
            ? `bg-[#1c1b18] text-[#f4f1ea] ${
                open
                  ? 'border-[#f4f1ea] ring-2 ring-[#f4f1ea]/15'
                  : 'border-[#f4f1ea]/18 hover:border-[#f4f1ea]/35'
              } focus-visible:border-[#f4f1ea] focus-visible:ring-2 focus-visible:ring-[#f4f1ea]/20 disabled:bg-[#252320]`
            : `bg-white text-slate-900 ${
                open
                  ? 'border-slate-900 ring-2 ring-slate-900/10'
                  : 'border-stone-300 hover:border-stone-400'
              } focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/15 disabled:bg-stone-100`
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.thumbUrl && (
            <img
              src={selectedOption.thumbUrl}
              alt=""
              className="h-6 w-6 shrink-0 rounded-md object-cover ring-1 ring-black/10"
            />
          )}
          {selectedOption?.icon && (
            <span className={`shrink-0 ${dark ? 'text-[#f4f1ea]/65' : 'text-slate-500'}`}>
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open
              ? dark
                ? 'rotate-180 text-[#f4f1ea]'
                : 'rotate-180 text-slate-900'
              : dark
                ? 'text-[#f4f1ea]/60'
                : 'text-slate-500'
          }`}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={buttonId}
          className={`uc-dropdown-menu absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border p-1.5 shadow-xl ring-1 ${
            dark
              ? 'border-[#f4f1ea]/15 bg-[#1b1a17] ring-black/40'
              : 'border-stone-200 bg-white ring-black/5'
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === activeIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                  isSelected
                    ? dark
                      ? 'bg-[#f4f1ea] text-[#141311]'
                      : 'bg-slate-900 text-white'
                    : isHighlighted
                      ? dark
                        ? 'bg-[#2a2824] text-[#f4f1ea]'
                        : 'bg-stone-100 text-slate-900'
                      : dark
                        ? 'text-[#f4f1ea]/85 hover:bg-[#2a2824]'
                        : 'text-slate-700 hover:bg-stone-100'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {opt.thumbUrl && (
                    <img
                      src={opt.thumbUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-black/10"
                    />
                  )}
                  {opt.icon && (
                    <span
                      className={`shrink-0 ${
                        isSelected
                          ? dark
                            ? 'text-[#141311]'
                            : 'text-white/90'
                          : dark
                            ? 'text-[#f4f1ea]/65'
                            : 'text-slate-500'
                      }`}
                    >
                      {opt.icon}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{opt.label}</span>
                    {opt.description && (
                      <span
                        className={`block truncate text-xs ${
                          isSelected
                            ? dark
                              ? 'text-[#141311]/70'
                              : 'text-slate-300'
                            : dark
                              ? 'text-[#f4f1ea]/55'
                              : 'text-slate-500'
                        }`}
                      >
                        {opt.description}
                      </span>
                    )}
                  </span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
