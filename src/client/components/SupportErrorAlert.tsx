import { Mail } from 'lucide-react';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';

interface SupportErrorAlertProps {
  message: string;
  context?: string;
  className?: string;
}

export function SupportErrorAlert({
  message,
  context,
  className = ''
}: SupportErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 ${className}`}
    >
      <p className="font-medium">{message}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-red-800/90">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        <span>Experiencing a problem or need help? Contact</span>
        <a
          href={buildSupportMailto(context)}
          className="font-semibold underline underline-offset-2 hover:text-red-950"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}
