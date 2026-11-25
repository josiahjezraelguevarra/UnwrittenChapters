export const SUPPORT_EMAIL = 'josiahjezraelguevarra.bsit@gmail.com';

export function buildSupportMailto(context?: string): string {
  const subject = context
    ? `UnwrittenChapters Support — ${context}`
    : 'UnwrittenChapters Support — API or Hosting Issue';
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
