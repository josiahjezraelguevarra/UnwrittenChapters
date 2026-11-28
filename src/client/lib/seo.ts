import { useEffect } from 'react';

export interface PageSeoOptions {
  title: string;
  description?: string;
  ogDescription?: string;
  robots?: string;
  canonicalPath?: string | null;
}

function upsertMeta(key: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Updates per-route document title, meta tags, robots directives, and canonical URL.
 */
export function usePageSeo({
  title,
  description,
  ogDescription,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1',
  canonicalPath
}: PageSeoOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta('robots', robots);
    upsertMeta('og:title', title, 'property');
    upsertMeta('twitter:title', title);

    if (description) {
      upsertMeta('description', description);
    }

    const socialDesc = ogDescription ?? description;
    if (socialDesc) {
      upsertMeta('og:description', socialDesc, 'property');
      upsertMeta('twitter:description', socialDesc);
    }

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalPath === null) {
      canonicalEl?.remove();
    } else if (typeof canonicalPath === 'string') {
      const canonicalUrl = new URL(canonicalPath, window.location.origin).toString();
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonicalUrl);
      upsertMeta('og:url', canonicalUrl, 'property');
    }
  }, [title, description, ogDescription, robots, canonicalPath]);
}
