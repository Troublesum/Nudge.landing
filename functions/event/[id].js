// Cloudflare Pages Function — GET /event/<id>
//
// Renders a per-event share page: an Open Graph card for social crawlers
// (which DON'T run JavaScript, so the meta tags must be server-rendered here)
// plus a store-bounce interstitial for humans without the app. People WITH the
// app never reach this — the verified App/Universal Link opens the app first.
//
// Data comes from the public, unauthenticated API:
//   GET https://api.nudgeme.live/api/broadcast/<id>/share
// which 404s for events that must not be previewed (deleted / under review /
// cancelled / suspended organiser). On any miss we still render a friendly
// generic "get nudge" page so the link never dead-ends.
//
// This file is ignored by GitHub Pages; it only runs once the repo is served
// by Cloudflare Pages. Static assets (index.html, /.well-known, 404.html) are
// still served directly from the repo.

const API_BASE = "https://api.nudgeme.live/api";
const APP_STORE_URL = "https://apps.apple.com/app/id6771520018";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.nudge.mobile";
const OG_FALLBACK_IMAGE = "https://nudgeme.live/og-event.png";

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch (_) {
    return "";
  }
}

export async function onRequestGet(context) {
  const id = context.params.id;
  let event = null;

  if (/^[0-9a-fA-F-]{36}$/.test(id)) {
    try {
      const res = await fetch(`${API_BASE}/broadcast/${id}/share`, {
        headers: { Accept: "application/json" },
        // Cache successful previews briefly at the edge — events change slowly.
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (res.ok) {
        const body = await res.json();
        event = body && body.data ? body.data : null;
      }
    } catch (_) {
      // Network/API failure → fall through to the generic page.
    }
  }

  return new Response(renderPage(event), {
    status: event ? 200 : 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": event ? "public, max-age=300" : "public, max-age=60",
    },
  });
}

function renderPage(event) {
  const hasEvent = !!event;
  const name = hasEvent ? event.name : "";
  const activity = hasEvent ? (event.activityPinName || event.activityName || "meet up") : "meet up";
  const when = hasEvent ? formatWhen(event.startsAt) : "";
  // State precedence: cancelled > ended > upcoming. A cancelled event that's
  // also in the past still reads as "cancelled" (the more meaningful fact).
  const cancelled = hasEvent && event.isCancelled;
  const ended = hasEvent && !cancelled && event.hasEnded;
  const upcoming = hasEvent && !cancelled && !ended;

  // Social-card copy. Warm, lowercase brand, no exclamation marks (CLAUDE.md).
  // event === null means the link is genuinely gone (invalid id, deleted,
  // under review, or suspended organiser) — copy stays neutral, never "invited".
  let ogTitle, ogDescription, heading, lead;
  if (upcoming) {
    ogTitle = `${name} · nudge`;
    ogDescription = `${event.organiserFirstName || "Someone"} invited you to ${activity.toLowerCase()}${event.locationName ? ` at ${event.locationName}` : ""}${when ? ` — ${when}` : ""}. Get nudge to join.`;
    heading = "You're invited";
    lead = `${escapeHtml(event.organiserFirstName || "Someone")} invited you to <strong>${escapeHtml(name)}</strong>${event.locationName ? ` at ${escapeHtml(event.locationName)}` : ""}${when ? `<br><span class="when">${escapeHtml(when)}</span>` : ""}. Get nudge to see it and join.`;
  } else if (cancelled) {
    ogTitle = `${name} · nudge`;
    ogDescription = `This event on nudge was cancelled. Get the app to find what's happening near you.`;
    heading = "This event was cancelled";
    lead = `<strong>${escapeHtml(name)}</strong> is no longer happening. Get nudge to see what else is going on near you and meet real, verified people.`;
  } else if (ended) {
    ogTitle = `${name} · nudge`;
    ogDescription = `This ${activity.toLowerCase()} on nudge has ended. Get the app to find what's happening near you.`;
    heading = "This event has ended";
    lead = `<strong>${escapeHtml(name)}</strong> has wrapped up. Get nudge to see what's happening near you and meet real, verified people.`;
  } else {
    ogTitle = "nudge — meet real people nearby";
    ogDescription = "A safe way to meet real, verified people nearby. Get nudge to see what's happening around you.";
    heading = "This event isn't available";
    lead = "This link may have expired or been removed. Get nudge to see what's happening near you and meet real, verified people.";
  }
  const ogImage = (hasEvent && event.imageUrl && upcoming) ? event.imageUrl : OG_FALLBACK_IMAGE;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(ogTitle)}</title>

  <meta property="og:site_name" content="nudge" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root{--primary:#2B5CE6;--background:#F6F8FF;--surface:#EDF0FA;--text:#2D2D3A}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;padding:0}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--background);color:var(--text);min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;line-height:1.5}
    .card{background:var(--surface);border-radius:20px;padding:40px 28px;max-width:420px;width:100%;text-align:center}
    .mark{margin:0 auto 24px;display:block}
    h1{font-weight:600;font-size:24px;margin:0 0 12px;letter-spacing:-0.2px}
    p.lead{font-size:15px;margin:0 auto 28px;max-width:330px}
    .when{display:inline-block;margin-top:6px;color:var(--primary);font-weight:500}
    .stores{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
    a.btn{display:none;align-items:center;justify-content:center;gap:8px;font-weight:500;font-size:15px;text-decoration:none;border-radius:999px;padding:15px 24px;transition:transform .12s ease-out}
    a.btn:active{transform:scale(.97)}
    a.btn.primary{background:var(--primary);color:#fff}
    a.btn.secondary{background:transparent;color:var(--primary);border:1.5px solid var(--primary)}
    body[data-os="ios"] a.btn[data-os="ios"],body[data-os="android"] a.btn[data-os="android"],body[data-os="other"] a.btn{display:inline-flex}
    .open-app{font-size:13px;color:var(--primary);text-decoration:none;display:inline-block;padding:8px}
    .tagline{margin-top:28px;font-size:12px;letter-spacing:.5px;opacity:.55}
  </style>
</head>
<body data-os="other">
  <main class="card">
    <svg class="mark" width="44" height="61" viewBox="0 0 44 61" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M21.7554 29.9048C21.7554 29.9048 6.41851 36.8433 3.56584 43.8768C1.42634 49.152 4.60745 54.1737 11.0579 56.2805C17.5083 58.3874 23.5421 56.3756 25.6816 51.1004C28.5342 44.0669 21.7554 29.9048 21.7554 29.9048Z" fill="#2B5CE6"/>
      <path opacity="0.85" d="M21.3185 30.2583C21.3185 30.2583 14.5396 16.0962 17.3923 9.06267C19.5318 3.78753 25.5655 1.77569 32.016 3.88257C38.4664 5.98946 41.6475 11.0111 39.508 16.2863C36.6553 23.3198 21.3185 30.2583 21.3185 30.2583Z" fill="#2B5CE6"/>
    </svg>
    <h1>${escapeHtml(heading)}</h1>
    <p class="lead">${lead}</p>
    <div class="stores">
      <a class="btn primary" data-os="ios" href="${APP_STORE_URL}">Download on the App Store</a>
      <a class="btn primary" data-os="android" href="${PLAY_STORE_URL}">Get it on Google Play</a>
      <a class="btn secondary" data-os="android" href="${APP_STORE_URL}">Download on the App Store</a>
      <a class="btn secondary" data-os="ios" href="${PLAY_STORE_URL}">Get it on Google Play</a>
    </div>
    <a class="open-app" id="open-app" href="#">Already have nudge? Open it</a>
    <div class="tagline">nudge</div>
  </main>
  <script>
    (function(){
      var ua=navigator.userAgent||"";
      var isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
      var isAndroid=/android/i.test(ua);
      document.body.setAttribute("data-os",isIOS?"ios":isAndroid?"android":"other");
      document.getElementById("open-app").setAttribute("href",window.location.href);
    })();
  </script>
</body>
</html>`;
}
