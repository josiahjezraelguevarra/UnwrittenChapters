# UnwrittenChapters — Zero-Account Google Drive Client Galleries

Turn any publicly shared Google Drive folder (`Anyone with the link → Viewer`) into a clean, branded photo & video client gallery hosted for **\$0/month** on Cloudflare Workers + D1 + KV.

## Features
- **No Account Needed:** Paste a Google Drive folder link and get both a **Share Link** (`/g/<slug>`) and a secret **Manage Link** (`/g/<slug>/manage#<token>`).
- **Nested Subfolders:** Traverses Drive subfolders (up to depth 3) with breadcrumb tabs and preserved folder paths inside ZIP downloads.
- **Photos & HD Video:** Masonry, Justified, and Square Grid layouts; PhotoSwipe zoomable lightbox; HTML5 `<video>` modal with HTTP `Range` seeking.
- **Client Favorites & Lightroom Export:** Visitors can heart items, filter favorites, and creators can export selected filenames as `.txt` or `.csv`.
- **Client-Side Batch ZIP:** Streams full-resolution files directly in the browser via `client-zip` (zero server ZIP memory/CPU cost).
- **Security & Abuse Guardrails:** PBKDF2 password locks, HMAC `HttpOnly` unlock cookies, expiration dates, Cloudflare Turnstile support, rate limiting, strict `(slug, fileId)` proxy allowlisting, and abuse reporting.
- **Donation Ready:** Drop QR code images into `public/qr/` (`gcash.png`, `maya.png`, `kofi.png`) and/or set `PUBLIC_DONATE_URL`.

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.dev.vars`** (copied from `.dev.vars.example`):
   ```env
   GOOGLE_DRIVE_API_KEY=your_google_cloud_api_key
   COOKIE_SIGNING_SECRET=replace_with_32_plus_char_random_secret
   TURNSTILE_SECRET_KEY=
   ADMIN_MODERATION_KEY=replace_with_moderation_secret
   ```
   > **How to get a free Google Drive API Key:**
   > Google Cloud Console → Create Project → *APIs & Services → Library* → enable **Google Drive API** → *Credentials → Create Credentials → API Key*. Restrict the key to **Google Drive API**.

3. **Apply local D1 database migrations:**
   ```bash
   npm run db:migrate:local
   ```

4. **Start local dev server:**
   ```bash
   npm run dev
   ```

## Adding Your Donation QR Codes
1. Place your QR image(s) inside `public/qr/` (for example `public/qr/gcash.png`, `public/qr/maya.png`, `public/qr/kofi.png`).
2. Update `src/client/config/donate.ts` if you want custom labels or filenames.

## Deploying to Cloudflare (\$0 Free Tier)
1. Create a D1 database and KV namespace:
   ```bash
   npx wrangler d1 create unwritten_chapters_db
   npx wrangler kv namespace create CACHE
   ```
2. Paste the returned `database_id` and KV `id` into `wrangler.jsonc`.
3. Apply remote migrations and upload secrets:
   ```bash
   npm run db:migrate:remote
   npx wrangler secret put GOOGLE_DRIVE_API_KEY
   npx wrangler secret put COOKIE_SIGNING_SECRET
   npx wrangler secret put ADMIN_MODERATION_KEY
   ```
   *(Optional: also set `TURNSTILE_SECRET_KEY` and `PUBLIC_TURNSTILE_SITE_KEY` for bot protection.)*
4. Deploy:
   ```bash
   npm run deploy
   ```
