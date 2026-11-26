# Changelog

All notable changes to **UnwrittenChapters** are documented in this file.

## [v1.0.0] - 2026-11-27

### Added
- **Streamlined Studio Builder:** Minimal landing-page Drive URL entry that creates the gallery and redirects directly to `/g/<slug>/manage` with an onboarding banner for layout and branding customization.
- **Whole-Gallery Theming (`0003_gallery_theming.sql`):** Persistent background, surface, text, and accent color tokens applied across the full client gallery viewport, navbar, footer, and ESV verse bar.
- **Desktop & Mobile Live Preview:** Real-time synchronized preview inside the Manage dashboard, including customizable hero styles, card styles, typography presets, captions, and studio logo handling without dark-mode logo inversion.
- **Maya Donation Modal:** Simplified support modal powered by `public/qr/maya.png`.
- **Google Forms Integration:** Configurable **Feedback & Suggestions** and **Report Gallery** external form links wired through `src/shared/contact.ts` and environment overrides (`PUBLIC_FEEDBACK_FORM_URL`, `PUBLIC_REPORT_FORM_URL`).
- **SEO & Privacy Controls:** Generated 1200×630 `public/og-cover.png`, Open Graph & Twitter Card metadata, `WebApplication` + `FAQPage` JSON-LD schema, `manifest.webmanifest`, `robots.txt`, dynamic `/sitemap.xml`, `X-Robots-Tag` headers, and per-route `usePageSeo` (`noindex, nofollow` on `/g/:slug` and `/g/:slug/manage`).
- **Documentation:** Added full Cloudflare Workers + D1 + KV deployment guide (`docs/CLOUDFLARE_DEPLOYMENT.md`), expanded `README.md`, and updated `.dev.vars.example`.

### Security & Hardening
- **30-Day `HttpOnly` Manage Cookies & Link Rotation:** Replaced browser `localStorage` manage secrets with HMAC-signed `HttpOnly` `uc_admin_<slug>` cookies (`Path=/api`, 30-day TTL) and added **Rotate Manage Link** in **Manage → Access**.
- **Opaque Drive Proxy IDs:** Public gallery metadata and `/api/media/:slug/:fileId` URLs use deterministic HMAC-derived opaque tokens instead of exposing raw Google Drive file or folder IDs.
- **Origin, Rate-Limit & Validation Guardrails:** Added same-origin CSRF checks on state-changing routes, per-IP browsing/media rate limits, PBKDF2-SHA256 password bounds (6–128 chars), bounded JSON customization schema validation, and explicit `button[data-pswp-photo="true"]` filtering for PhotoSwipe.
