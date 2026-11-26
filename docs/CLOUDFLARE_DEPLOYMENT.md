# Cloudflare Production Deployment Guide

This guide walks through deploying **UnwrittenChapters** to Cloudflare Workers, D1, and KV on Cloudflare's free tier (**\$0/month** for typical studio usage).

---

## 1. Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free plan works)
- [Node.js 20+](https://nodejs.org/) installed locally
- A **Google Cloud Project** with the **Google Drive API** enabled and an API key created:
  1. Go to **Google Cloud Console → APIs & Services → Library** and enable **Google Drive API**.
  2. Go to **APIs & Services → Credentials → Create Credentials → API key**.
  3. Click **Edit API key → API restrictions → Restrict key → Google Drive API → Save**.
- Repository dependencies installed:
  ```bash
  npm install
  ```

---

## 2. Authenticate Wrangler CLI

Log in to your Cloudflare account from the project root:

```bash
npx wrangler login
```

Verify the active account:

```bash
npx wrangler whoami
```

---

## 3. Create Cloudflare D1 Database & KV Namespace

### 3.1 Create the D1 Database

```bash
npx wrangler d1 create unwritten_chapters_db
```

Copy the `database_id` printed by Wrangler (a UUID string).

### 3.2 Create the KV Namespace

```bash
npx wrangler kv namespace create CACHE
```

Copy the KV namespace `id` printed by Wrangler.

### 3.3 Update `wrangler.jsonc`

Open `wrangler.jsonc` and replace the placeholder all-zero IDs with your real IDs:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "unwritten-chapters-gallery",
  "compatibility_date": "2025-03-01",
  "main": "./src/server/index.ts",
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "unwritten_chapters_db",
      "database_id": "<YOUR_D1_DATABASE_ID>",
      "migrations_dir": "migrations"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<YOUR_KV_NAMESPACE_ID>"
    }
  ],
  "vars": {
    "PUBLIC_APP_NAME": "UnwrittenChapters",
    "PUBLIC_DONATE_URL": "",
    "PUBLIC_FEEDBACK_FORM_URL": "",
    "PUBLIC_REPORT_FORM_URL": "",
    "PUBLIC_TURNSTILE_SITE_KEY": ""
  }
}
```

> **Note:** Leave `PUBLIC_FEEDBACK_FORM_URL` and `PUBLIC_REPORT_FORM_URL` empty if you want to use the default URLs configured in `src/shared/contact.ts`, or set overrides here to change them without editing code.

---

## 4. Apply Remote D1 Migrations

Run all database migrations (`0001_init.sql`, `0002_visual_customization.sql`, `0003_gallery_theming.sql`) against the remote D1 database:

```bash
npm run db:migrate:remote
```

Confirm all tables exist (`galleries`, `gallery_likes`, `gallery_reports`, `rate_limits`):

```bash
npx wrangler d1 execute unwritten_chapters_db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

---

## 5. Generate & Upload Production Secrets

Generate two strong 64-character hexadecimal secrets locally (never commit these):

**PowerShell:**
```powershell
node -e "const c=require('crypto'); console.log('COOKIE_SIGNING_SECRET=' + c.randomBytes(32).toString('hex')); console.log('ADMIN_MODERATION_KEY=' + c.randomBytes(32).toString('hex'));"
```

**macOS / Linux:**
```bash
openssl rand -hex 32
openssl rand -hex 32
```

Upload the required secrets to Cloudflare Workers:

```bash
npx wrangler secret put GOOGLE_DRIVE_API_KEY
npx wrangler secret put COOKIE_SIGNING_SECRET
npx wrangler secret put ADMIN_MODERATION_KEY
```

### Optional: Enable Cloudflare Turnstile (Recommended for Public Abuse Protection)

1. In the **Cloudflare Dashboard → Turnstile → Add widget**, enter your production domain and choose **Managed**.
2. Copy the **Site Key** into `PUBLIC_TURNSTILE_SITE_KEY` inside `wrangler.jsonc`.
3. Upload the **Secret Key**:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

---

## 6. Build, Test & Deploy

Run typecheck, automated security/unit tests, production build, and Wrangler deploy:

```bash
npm run typecheck
npm test
npm run deploy
```

`npm run deploy` runs `vite build && wrangler deploy`, bundling both the Worker (`dist/unwritten_chapters_gallery/`) and static SPA assets (`dist/client/`), then prints your live `https://unwritten-chapters-gallery.<subdomain>.workers.dev` URL.

---

## 7. Connect a Custom Domain (Recommended)

1. In the **Cloudflare Dashboard**, open **Workers & Pages → unwritten-chapters-gallery → Settings → Domains & Routes**.
2. Click **Add → Custom Domain** (or Route) for your Cloudflare-managed zone (e.g., `gallery.yourdomain.com`).
3. Cloudflare automatically provisions TLS certificates and updates DNS.
4. If you enabled **Turnstile**, add your custom domain to the Turnstile widget's allowed hostnames list.

---

## 8. Post-Deployment Verification Checklist

1. **Health endpoint:** Open `https://<your-domain>/api/health` → expect `{"ok":true}`.
2. **SEO & Crawl rules:**
   - Visit `https://<your-domain>/robots.txt` → confirms `/` is allowed and `/g/` + `/api/` are disallowed.
   - Visit `https://<your-domain>/sitemap.xml` → confirms valid XML pointing to `https://<your-domain>/`.
   - Test link unfurling of `https://<your-domain>/` to confirm `og-cover.png` renders cleanly.
3. **End-to-end gallery flow:**
   - Paste a publicly shared Google Drive folder (`Anyone with the link → Viewer`).
   - Verify redirect to `/g/<slug>/manage`, confirm **Save Design** persists theme/typography changes, and test **Rotate Manage Link** under **Manage → Access**.
   - Open `/g/<slug>` in an incognito window: verify PhotoSwipe lightbox, video playback, client hearts, password lock/unlock, and batch ZIP download.
   - Confirm `/g/<slug>` response headers / DOM set `noindex, nofollow`.

---

## 9. Routine Operations & Troubleshooting

- **Applying future migrations:** Always run `npm run db:migrate:remote` **before** `npm run deploy` whenever a new file is added to `migrations/`.
- **Tail live server logs:**
  ```bash
  npx wrangler tail
  ```
- **Error `COOKIE_SIGNING_SECRET must be configured`:** Re-run `npx wrangler secret put COOKIE_SIGNING_SECRET` with a 32+ character secret and redeploy.
- **Google Drive folder returns empty or 403:** Verify the folder is shared as **Anyone with the link → Viewer**, confirm `GOOGLE_DRIVE_API_KEY` is active, and check Google Cloud quotas under **APIs & Services → Google Drive API → Quotas**.
- **Moderation takedowns:** Use `ADMIN_MODERATION_KEY` with your moderation tooling or remove offending rows from D1 via `npx wrangler d1 execute`.
