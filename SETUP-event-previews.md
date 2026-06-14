# Per-event share previews (Tier 2)

This repo can serve rich, per-event social previews at `https://nudgeme.live/event/<id>`
— but only on an edge host that can run a function at request time. GitHub Pages
can't (it's static, and serves dynamic paths as a 404). The setup below moves the
site to **Cloudflare Pages**, which keeps the same Git workflow and adds Functions.

## What's already in the repo
- `functions/event/[id].js` — renders per-event Open Graph tags (for social
  crawlers, which don't run JS) + the store-bounce interstitial. Fetches the
  public API: `GET https://api.nudgeme.live/api/broadcast/<id>/share`.
- `_headers` — sets `application/json` on the `.well-known` files (fixes the iOS
  AASA content-type GitHub Pages couldn't).
- `404.html` — fallback interstitial (still used for non-`/event` unmatched paths).
- `.well-known/` + `.nojekyll` — deep-link association files.

These are inert on GitHub Pages; they activate when Cloudflare Pages serves the repo.

## Prerequisites (one-time, your accounts)
1. **API deployed** — the `/broadcast/{id}/share` endpoint must be live on
   `api.nudgeme.live` (it's committed on the API repo's `Dev` branch; deploy it).
2. **og-event.png** — add a 1200×630 branded fallback image at the repo root
   (`/og-event.png`). Used when an event has no hero photo. Without it the
   generic card shows no image.

## Steps
1. **Move DNS to Cloudflare** (free). Currently `nudgeme.live` uses Porkbun
   nameservers. In Cloudflare: Add site → `nudgeme.live` → it imports your
   existing records (GitHub Pages A records, the `api.` CNAME to Azure, etc.) →
   change the nameservers at Porkbun to the two Cloudflare gives you. Verify the
   `api.` record and the apex still resolve before continuing.
2. **Create a Cloudflare Pages project** → Connect to Git → `Troublesum/Nudge.landing`
   → Framework preset: **None** → Build command: *(empty)* → Output dir: `/`.
3. **Add the custom domain** `nudgeme.live` (and `www` if used) to the Pages project.
   This repoints the apex from GitHub Pages to Cloudflare Pages.
4. **Deploy.** Pages auto-detects `functions/` and serves `/event/<id>` via the
   function; everything else is served static.

## Verify after cutover
```
curl -sI https://nudgeme.live/.well-known/apple-app-site-association   # application/json now
curl -s  "https://nudgeme.live/event/<a-real-event-guid>" | grep 'og:title'   # per-event title
```
Paste a real event link into a Slack/WhatsApp/Twitter DM → expect a rich card.

## Alternative (no DNS move)
If you'd rather not move DNS off Porkbun, the other option is a Cloudflare
**Worker in front of GitHub Pages** — but that still requires the zone on
Cloudflare, so the DNS move is unavoidable for any Cloudflare option. Netlify/
Vercel are alternatives but also need apex DNS pointed at them. Cloudflare Pages
is the least-friction path given the repo is already on GitHub.
