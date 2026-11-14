/**
 * Visitor tracking → our own backend (MongoDB), viewed on the admin
 * "Ziyarətçilər" page.
 *
 * A tiny fire-and-forget client that pings POST /api/track as a visitor moves
 * around. The backend upserts ONE ROW PER VISIT (keyed by a per-visit session
 * id) that fills in with:
 *
 *   • IP + country (location)      — from Cloudflare's /cdn-cgi/trace (+ server req.ip)
 *   • Affiliate / source + referrer — captured once, at first touch
 *   • The page journey             — every page they visit, in order
 *   • Page-view count
 *   • Time on site (dwell)         — ACTIVE time only (paused while the tab is hidden)
 *
 * It NEVER throws and never blocks the app: analytics failing must never affect
 * a real visitor. No configuration — it posts to the same API the app already
 * uses (VITE_BACKEND_URL).
 */

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
const TRACK_URL = BACKEND ? `${BACKEND}/api/track` : "";

const enabled = () => TRACK_URL !== "" && typeof window !== "undefined";

// The currently logged-in user, if any — set by the app so each visit can be
// linked to a real account with no IP guessing. Included in every beacon while set.
let trackedUser = null;
export function setTrackedUser(user) {
  trackedUser = user && user._id ? { id: String(user._id), name: user.name || "" } : null;
}

// ─── Per-visit session id ────────────────────────────────────────────────────
// A stable id for the whole visit so every event collapses into one sheet row.
// A visit ends after this much inactivity; the next event opens a FRESH row
// (the standard analytics session rule). Continuous browsing keeps one row;
// coming back later starts a new one and leaves the old row untouched.
const SESSION_GAP_MS = 30 * 60 * 1000;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// In-memory fallback so a storage-blocked visitor (private mode) still gets a
// stable id for the page load instead of colliding into one shared "no-storage"
// row with everyone else.
let memSid = null;
// In-memory page-view dedup (resets on every full page load — see trackPageView).
let lastTrackedPath = null;
// Set true when sessionId() rotates to a NEW visit, so send() can record the
// current page for it even if no route change occurred (idle-gap rotation while
// staying on the same page would otherwise leave the new row with 0 page views).
let justRotated = false;

/*
 * The current visit's session id. Rotates to a new id when there is no prior
 * session OR the last activity was more than SESSION_GAP_MS ago. Rotating also
 * clears the first-touch acquisition + the page-dedup marker and resets the
 * dwell timer, so a returning visit writes a BRAND-NEW row and can never mutate
 * the previous visit's row (whose first-touch fields are $setOnInsert anyway).
 * Idempotent within a tick: it refreshes the "last seen" stamp, so calling it
 * twice for one event won't rotate twice.
 */
function sessionId() {
  const now = Date.now();
  try {
    const sid = sessionStorage.getItem("exq_vsid");
    const seen = Number(sessionStorage.getItem("exq_vts"));
    const stale = !sid || !Number.isFinite(seen) || now - seen > SESSION_GAP_MS;
    if (stale) {
      const id = newId();
      sessionStorage.setItem("exq_vsid", id);
      sessionStorage.removeItem("exq_vacq"); // recompute source for the new visit
      lastTrackedPath = null; // fresh page-dedup for the new visit
      justRotated = true; // send() will record the current page for the new visit
      resetDwell(); // new visit starts at 0 seconds
      sessionStorage.setItem("exq_vts", String(now));
      return id;
    }
    sessionStorage.setItem("exq_vts", String(now));
    return sid;
  } catch {
    if (!memSid) memSid = newId();
    return memSid;
  }
}

// ─── Acquisition, captured ONCE at first touch ───────────────────────────────
// UTM + affiliate params only exist on the ENTRY url; by the time someone has
// clicked through a few pages the query string is gone. So we read and stash it
// on the very first call and reuse it for the whole visit.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
// Common affiliate / partner parameters, in priority order.
const AFFILIATE_KEYS = ["ref", "aff", "affiliate", "affid", "aff_id", "partner", "pid", "source", "src", "fbclid", "gclid"];

function acquisition() {
  try {
    const stored = sessionStorage.getItem("exq_vacq");
    if (stored) return JSON.parse(stored);
  } catch {
    /* recompute below */
  }

  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }

  // A TikTok ad click (?ttclid=): kept for the sign-up, so the server's Events
  // API can tie the account to the ad (Backend services/tiktokEvents).
  const ttclid = (params.get("ttclid") || "").slice(0, 300);

  // A single friendly "affiliate / source" label: an explicit utm_source or
  // affiliate param wins; otherwise fall back to the referring site's host;
  // otherwise "(direct)".
  let affiliate = utm.utm_source || "";
  if (!affiliate) {
    for (const k of AFFILIATE_KEYS) {
      const v = params.get(k);
      if (v) { affiliate = `${k}:${v}`.slice(0, 200); break; }
    }
  }
  if (!affiliate && ttclid) affiliate = "tiktok";
  const referrer = document.referrer || "(direct)";
  if (!affiliate) {
    try {
      affiliate = referrer && referrer !== "(direct)" ? new URL(referrer).hostname : "(direct)";
    } catch {
      affiliate = "(direct)";
    }
  }

  const acq = {
    landing: window.location.pathname,
    referrer,
    affiliate,
    utm,
    ...(ttclid ? { ttclid } : {}),
  };
  try {
    sessionStorage.setItem("exq_vacq", JSON.stringify(acq));
  } catch {
    /* best effort */
  }
  return acq;
}

// The visit's first-touch source, normalised for the sign-up payload so a new
// account records WHERE it came from (utm_source / ?ref / referring site). Reads
// the same stash the tracker fills, so no extra work at sign-up time.
export function getAcquisition() {
  try {
    const raw = sessionStorage.getItem("exq_vacq");
    const a = raw ? JSON.parse(raw) : null;
    if (!a) return null;
    const utm = a.utm || {};
    return {
      source: a.affiliate || "",
      medium: utm.utm_medium || "",
      campaign: utm.utm_campaign || "",
      referrer: a.referrer || "",
      landing: a.landing || "",
      ...(a.ttclid ? { ttclid: a.ttclid } : {}),
    };
  } catch {
    return null;
  }
}

// ─── IP + country, from Cloudflare's /cdn-cgi/trace (same-origin) ─────────────
let clientIp = "";
let clientCountry = "";
let ipRequested = false;
function loadIp() {
  if (ipRequested || typeof fetch === "undefined") return;
  ipRequested = true;
  fetch("/cdn-cgi/trace", { cache: "no-store" })
    .then((r) => r.text())
    .then((t) => {
      const ipM = t.match(/^ip=(.*)$/m);
      if (ipM) clientIp = ipM[1].trim();
      const locM = t.match(/^loc=(.*)$/m);
      if (locM) {
        const code = locM[1].trim();
        try {
          clientCountry = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
        } catch {
          clientCountry = code; // fall back to the 2-letter code
        }
      }
      // Enrich the row the first page_view created with IP/country. This must
      // NOT count as another page view, so it is its own event.
      send("visitor_info", {});
    })
    .catch(() => {
      /* IP/country is best-effort — a non-Cloudflare origin (e.g. localhost) just skips it */
    });
}

// ─── Dwell time (ACTIVE seconds on site) ─────────────────────────────────────
// We accumulate time only while the tab is visible, so a page left open in a
// background tab for an hour doesn't report an hour of "engagement".
let activeMs = 0;
let activeSince = 0; // 0 = currently paused/hidden
let heartbeat = null;

function resume() {
  if (activeSince === 0) activeSince = Date.now();
}
function pause() {
  if (activeSince !== 0) {
    activeMs += Date.now() - activeSince;
    activeSince = 0;
  }
}
function durationSeconds() {
  const live = activeSince !== 0 ? Date.now() - activeSince : 0;
  return Math.round((activeMs + live) / 1000);
}
// Reset to zero for a brand-new visit (called on session rotation). Resume the
// clock immediately if the tab is currently visible.
function resetDwell() {
  activeMs = 0;
  activeSince = typeof document !== "undefined" && document.visibilityState !== "hidden" ? Date.now() : 0;
}

// ─── Transport: sendBeacon (survives unload) → fetch no-cors keepalive ───────
function send(event, extra) {
  if (!enabled()) return;
  // Resolve the session id FIRST — it may rotate (new visit) and clear the
  // stored acquisition, so acquisition() must be read AFTER it to pick up the
  // fresh source for the new row.
  const sid = sessionId();
  // If the session just rotated onto the SAME page (an idle-gap rotation while
  // staying put) it was created by THIS beacon, not a route change — so record
  // the current page as a page_view first, else the new row shows 0 page views.
  if (justRotated) {
    justRotated = false;
    if (event !== "page_view") {
      lastTrackedPath = null;
      trackPageView(window.location.pathname);
    }
  }
  const acq = acquisition();
  const payload = {
    ts: new Date().toISOString(),
    session_id: sid,
    event,
    path: window.location.pathname,
    title: document.title,
    ip: clientIp,
    country: clientCountry,
    landing: acq.landing,
    referrer: acq.referrer,
    affiliate: acq.affiliate,
    utm: acq.utm,
    duration: durationSeconds(),
    ua: navigator.userAgent,
    ...(trackedUser ? { uid: trackedUser.id, uname: trackedUser.name } : {}),
    ...extra,
  };
  const body = JSON.stringify(payload);
  try {
    // text/plain keeps this a "simple" request, so a sendBeacon on unload isn't
    // blocked by a CORS preflight it can't attach. The API parses text/plain.
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(TRACK_URL, new Blob([body], { type: "text/plain;charset=utf-8" }));
      if (ok) return;
    }
    void fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      keepalive: true,
      mode: "no-cors",
    });
  } catch {
    /* tracking must never break the app */
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

let started = false;
/** Call once on app start. Safe to call again (idempotent). */
export function initVisitorTracking() {
  if (!enabled() || started) return;
  started = true;

  loadIp();
  resume();

  // Pause/resume dwell with tab visibility, and flush a final duration on hide.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pause();
      send("heartbeat", {});
    } else {
      resume();
    }
  });
  // pagehide is the reliable "leaving" signal on mobile + bfcache.
  window.addEventListener("pagehide", () => {
    pause();
    send("end", {});
  });

  // Periodic heartbeat so a visitor who never fires an unload event (crash,
  // battery death, killed tab) still has an approximate time-on-site recorded.
  heartbeat = window.setInterval(() => {
    if (document.visibilityState === "visible") send("heartbeat", {});
  }, 15000);
}

/** Stop the heartbeat (used in tests / teardown). */
export function stopVisitorTracking() {
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  started = false;
}

/**
 * Record a route change / page load. Deduped IN MEMORY (lastTrackedPath, declared
 * with the module state) so StrictMode/rerenders don't double-count WITHIN a page
 * load — but a genuine RELOAD of the same page resets it and IS counted. (A
 * sessionStorage marker used to persist across reloads and silently dropped every
 * page_view on same-path refreshes → pageViews stuck at 0 with an empty journey.)
 */
let firstView = true;
export function trackPageView(path) {
  if (!enabled()) return;
  const p = path || window.location.pathname;
  // Resolve the session FIRST so a returning visit can rotate to a new id before
  // we compare paths.
  sessionId();
  if (lastTrackedPath === p) return; // StrictMode / rerender guard, per page load
  lastTrackedPath = p;
  // On the FIRST page view of this page-load, report how long from page open to
  // the app painting (React mounted) — the render-timing signal vs the early
  // "open" beacon in index.html.
  const extra = { path: p };
  if (firstView) {
    firstView = false;
    try {
      const t = typeof performance !== "undefined" && performance.now ? Math.round(performance.now()) : null;
      if (t != null) extra.render_ms = t;
    } catch { /* ignore */ }
  }
  send("page_view", extra);
}
