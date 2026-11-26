# UnwrittenChapters — Free Google Drive Client Photo Galleries

Turn any publicly shared Google Drive folder (`Anyone with the link → Viewer`) into a fast, client-ready photo and HD video gallery hosted for **\$0/month** on Cloudflare Workers, D1, and KV.

Files never leave your Google Drive—UnwrittenChapters indexes metadata and proxies media cleanly while adding client favorites, password locks, custom visual themes, and browser-side batch ZIP downloads.

---

## Features

- **Zero Sign-Up Workflow:** Paste any public Google Drive folder URL to generate a client **Share Link** (`/g/<slug>`) and a private **Manage Link** (`/g/<slug>/manage#<token>`).
- **30-Day Manage Sessions & Link Rotation:** Manage links exchange seamlessly into an `HttpOnly`, HMAC-signed 30-day session cookie (`uc_admin_<slug>`), with one-click token rotation in **Manage → Access**.
- **Whole-Gallery Customization & Live Preview:** Choose Masonry, Justified, or Square Grid layouts, typography presets (`sans`, `serif`, `fineart`, `mono`), color tokens (`light`, `dark`, `warm`, `sage`, `midnight` or custom hex), hero styles (`banner`, `minimal`, `split`), card styles (`clean`, `framed`, `mat`), captions, cover image, and custom studio branding with desktop/mobile live preview.
- **Nested Folders & HD Media:** Walks Drive subfolders up to 3 levels deep (up to 40 subfolders and 2,000 items), supports PhotoSwipe zoomable lightbox viewing, and streams HD video via HTTP `Range` requests.
- **Client Favorites & Batch ZIP Export:** Visitors can heart favorite shots, copy filenames, or export client selections as `.txt` / `.csv` (for Lightroom / Capture One filtering), plus stream full-resolution batch ZIPs in-browser via `client-zip`.
- **Security & Abuse Guardrails:** PBKDF2-SHA256 gallery passwords, HMAC `HttpOnly` unlock cookies, configurable expiry dates, opaque Drive IDs, Cloudflare Turnstile verification, per-IP rate limiting, strict `(slug, fileId)` proxy validation, and configurable Google Forms links for **Feedback** and **Report Gallery**.
- **SEO & Privacy Ready:** Built-in Open Graph (`public/og-cover.png`), Twitter Card metadata, `WebApplication` + `FAQPage` JSON-LD schema, `robots.txt` (`Disallow: /g/`), `/sitemap.xml`, and `noindex, nofollow` enforcement on private gallery and manage routes.

---

## Repository Structure

```text
├── migrations/                  # Cloudflare D1 SQL schema migrations (0001..0003)
├── public/                      # Static assets (logo, og-cover.png, icons, qr, robots.txt, manifest)
├── src/
│   ├── client/                  # React 19 + Tailwind CSS v4 frontend
│   │   ├── components/          # StudioBuilder, GallerySurface, GalleryStyleControls, DonateModal, etc.
│   │   ├── config/              # Donation QR config & select options
│   │   ├── lib/                 # API client, browser ZIP builder, SEO hook
│   │   └── pages/               # HomePage, GalleryPage, ManagePage
│   ├── server/                  # Hono Worker API & Google Drive proxy
│   │   ├── routes/              # bible.ts, galleries.ts, media.ts
│   │   ├── crypto.ts            # PBKDF2 password hashing & HMAC cookie signing
│   │   ├── drive.ts             # Google Drive API v3 folder crawler & metadata fetcher
│   │   ├── opaqueIds.ts         # Opaque file/folder ID mapping
│   │   └── security.ts          # Rate limits, Turnstile check, origin validation
│   └── shared/                  # Shared TS types, customization presets, contact/form URLs
├── test/                        # Vitest suite (api.test.ts, crypto.test.ts, drive.test.ts)
├── docs/
│   └── CLOUDFLARE_DEPLOYMENT.md # Full production deployment guide for Cloudflare Workers + D1 + KV
├── CHANGELOG.md                 # Release notes and version history
└── wrangler.jsonc               # Cloudflare Workers, D1, KV, and public vars configuration
```

---

## Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS v4, PhotoSwipe 5, Lucide Icons, `client-zip`
- **Backend / Edge:** Cloudflare Workers (`@cloudflare/vite-plugin`), Hono 4
- **Storage & Caching:** Cloudflare D1 (SQLite), Cloudflare KV, Google Drive API v3
- **Testing:** Vitest + Cloudflare Vitest Pool Workers

---

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure `.dev.vars`

Copy `.dev.vars.example` to `.dev.vars` (never commit `.dev.vars`):

```env
GOOGLE_DRIVE_API_KEY=your_google_cloud_api_key_here
COOKIE_SIGNING_SECRET=replace_with_at_least_32_character_random_hex_string
TURNSTILE_SECRET_KEY=
ADMIN_MODERATION_KEY=replace_with_strong_random_moderation_key
PUBLIC_DONATE_URL=
PUBLIC_FEEDBACK_FORM_URL=
PUBLIC_REPORT_FORM_URL=
PUBLIC_TURNSTILE_SITE_KEY=
```

> **Tip:** To obtain a free Google Drive API key, open **Google Cloud Console → APIs & Services → Library**, enable **Google Drive API**, create an **API key**, and restrict it to **Google Drive API**.

### 3. Apply Local D1 Migrations

```bash
npm run db:migrate:local
```

### 4. Start the Dev Server

```bash
npm run dev
```

### 5. Run Verification Checks

```bash
npm run typecheck
npm test
npm run build
```

---

## Customization Notes

- **Feedback & Report Forms:** Update `FEEDBACK_FORM_URL` and `REPORT_FORM_URL` in `src/shared/contact.ts`, or override them in production with `PUBLIC_FEEDBACK_FORM_URL` / `PUBLIC_REPORT_FORM_URL`.
- **Donations (Maya QR):** Replace `public/qr/maya.png` (and update copy in `src/client/config/donate.ts` if needed) and/or set `PUBLIC_DONATE_URL`.

---

## Production Deployment (Cloudflare Free Tier)

See the complete step-by-step guide in **[docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md)** covering:

1. Creating the Cloudflare D1 database and KV namespace
2. Updating `wrangler.jsonc` bindings and running remote migrations
3. Generating and setting encrypted Wrangler secrets
4. Optional Turnstile bot protection and custom domain routing
5. Post-deploy health, SEO, and security checks

Quick deploy command once D1, KV, and secrets are configured:

```bash
npm run db:migrate:remote
npm run deploy
```

---

## Releases & Versioning

Release notes and upgrade steps are tracked in **[CHANGELOG.md](CHANGELOG.md)** and tagged on GitHub under **Releases**.

To create a new release from an updated `main` branch:

```bash
npm run typecheck && npm test && npm run build
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --follow-tags
```

Then open **GitHub → Releases → Draft a new release**, select the pushed tag, paste the matching notes from `CHANGELOG.md`, and publish.
