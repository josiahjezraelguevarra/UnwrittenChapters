import { useId } from 'react';

interface ToggleFieldProps {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  dark?: boolean;
}

export function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  dark = false
}: ToggleFieldProps) {
  const autoId = useId();
  const controlId = id || autoId;

  return (
    <label
      htmlFor={controlId}
      className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
        dark
          ? checked
            ? 'border-[#f4f1ea]/30 bg-[#1c1b18] shadow-2xs'
            : 'border-[#f4f1ea]/12 bg-[#161513] hover:border-[#f4f1ea]/25'
          : checked
            ? 'border-slate-900/20 bg-white shadow-2xs'
            : 'border-stone-200 bg-stone-50/70 hover:border-stone-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${dark ? 'text-[#f4f1ea]' : 'text-slate-800'}`}>
          {label}
        </span>
        {description && (
          <span className={`block text-xs ${dark ? 'text-[#f4f1ea]/60' : 'text-slate-500'}`}>
            {description}
          </span>
        )}
      </span>

      <button
        id={controlId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
          dark
            ? `${checked ? 'bg-[#f4f1ea]' : 'bg-[#3b3832]'} focus-visible:outline-[#f4f1ea]`
            : `${checked ? 'bg-slate-900' : 'bg-stone-300'} focus-visible:outline-slate-900`
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
            dark && checked ? 'bg-[#141311]' : 'bg-white'
          } ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </label>
  );
}
