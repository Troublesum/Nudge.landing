# Per-event share previews — Cloudflare Worker (static assets)

`https://nudgeme.live/event/<id>` renders a per-event social card (Open Graph)
plus a store-bounce interstitial. Cloudflare's "Pages" project type is no longer
offered for new projects, so this site runs as a **Worker with static assets**:

- `worker.js` — handles `GET /event/<id>`; fetches `https://api.nudgeme.live/api/broadcast/<id>/share`
  and server-renders OG tags + the interstitial. All other paths fall through to
  the static assets.
- `wrangler.jsonc` — `main: worker.js`, `assets.directory: "."` (binding `ASSETS`),
  `not_found_handling: 404-page`.
- `.assetsignore` — keeps `worker.js`, config, and docs from being served as assets.
- `_headers` — sets `application/json` on the `.well-known` files.
- Static files (`index.html`, `privacy.html`, `terms.html`, `404.html`,
  `.well-known/`) are served directly from the bucket.

## Prerequisites (your accounts)
1. **API deployed** — `/broadcast/{id}/share` must be live on `api.nudgeme.live`
   (committed on the API repo's `Dev` branch).
2. **og-event.png** — add a 1200×630 branded fallback image at the repo root
   (`/og-event.png`) for the generic/no-photo card. (It is NOT in `.assetsignore`,
   so it will be served once added.)
3. DNS already on Cloudflare (nameservers moved from Porkbun). `api` stays
   **DNS only (grey)**; the apex is created by the Worker custom-domain step.

## Deploy
1. **Workers & Pages → Create → (Workers) → Continue with GitHub** → select
   `Troublesum/Nudge.landing`. Cloudflare reads `wrangler.jsonc`.
2. Build settings: leave the build command empty; deploy command `npx wrangler deploy`
   (the default). Production branch `master`.
3. Deploy → test on the `*.workers.dev` URL:
   `https://nudge.<subdomain>.workers.dev/event/<real-event-guid>`.
4. **Settings → Domains (or the Domains tab) → Add custom domain → `nudgeme.live`**
   (and optionally `www`). This creates the proxied apex record automatically and
   clears the "proxying required" DNS warning.

## Verify
```
curl -sI https://nudgeme.live/.well-known/apple-app-site-association   # application/json
curl -s  "https://nudgeme.live/event/<real-event-guid>" | grep og:title
```
Paste a real event link into a Slack/WhatsApp DM → expect a rich card.
