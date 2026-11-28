export const SUPPORT_EMAIL = 'unwrittenchapters.support@gmail.com';

// Paste your Google Forms URLs here (or set PUBLIC_FEEDBACK_FORM_URL / PUBLIC_REPORT_FORM_URL in wrangler/vars)
export const FEEDBACK_FORM_URL = 'https://forms.gle/WMc6seyhcdsagxwF7';
export const REPORT_FORM_URL = 'https://forms.gle/6vnSTLan1Pc5CZih9';

export function buildSupportMailto(context?: string): string {
  const subject = context
    ? `UnwrittenChapters Support — ${context}`
    : 'UnwrittenChapters Support — API or Hosting Issue';
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
