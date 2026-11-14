import { record } from "@rrweb/record";
import axios from "axios";
import { toast } from "react-toastify";
import { clickLabel, milestoneFor, pathOf } from "./recorderPolicy";

/*
 * The session recorder: everything on screen (rrweb), plus what rrweb cannot
 * say on its own, written into the same timeline as custom events:
 *
 *   nav    a page change
 *   click  what was clicked, by its label ("Yadda saxla"), never typed text
 *   error  a JavaScript error or rejected promise
 *   api    a request that failed: method, path, status, the server's message
 *   slow   a request that took more than five seconds
 *   toast  a message shown to the person (error or not)
 *   milestone  a step forward that succeeded: signed up, made a class, an exam
 *   stale  the tab runs an older version of the site and one of its files is
 *          gone (a deploy happened mid-visit); the app reloads itself, so this
 *          and the error it causes are not counted as problems
 *   away / back  the tab was hidden (another tab or app) and came back, so a
 *          long still stretch in the replay is explained
 *   game   the waiting-room games in the exam builder: opened, a round, a word
 *   blobimg  a copy of a picture shown from a temporary browser link (blob:),
 *          such as an attached photo's preview; that link is dead by the time
 *          anyone watches, so the replay puts this copy in its place
 *
 * In "buffer" mode nothing leaves the browser: a visitor's visit lives in memory
 * and dies with the tab. In "live" mode (a signed-in teacher) the buffer is sent
 * first, then a slice every few seconds, and the last slice with sendBeacon as
 * the page closes. What people type is recorded as typed, key by key, so an
 * admin can read it; password fields are always hidden.
 *
 * Loaded on demand by components/SessionRecorder; policy is in recorderPolicy.
 */

const API = `${import.meta.env.VITE_BACKEND_URL}/api/rec`;
const FLUSH_MS = 3000; // short, so an admin watching live is only seconds behind
const SLICE = 300; // events per slice
const BUFFER_CAP = 15000; // a visitor's buffer restarts from the next full snapshot past this
const BEACON_MAX = 60000; // bytes a closing page may still send

const zero = () => ({ c: 0, e: 0, a: 0, o: 0, g: 0 });
// Lines other parts of the app may write into the recording (helper/recEvent).
const ALLOWED = new Set(["game"]);
const REC_EVENT = "bunkermath:rec";
// Pictures from blob: links: how many per visit, and how large the copy is.
const BLOB_IMG_MAX = 40;
const BLOB_IMG_SIDE = 480;
// A code file of the site (as opposed to an image or a font).
const SITE_FILE = /\/assets\/[^/?#]+\.(js|css)(\?|#|$)/;
// Errors in the few seconds after such a file goes missing are its echo.
const STALE_ECHO_MS = 5000;
let staleAt = 0;
const looksStale = (msg) => /dynamically imported module|Importing a module script failed|Loading chunk|module script/i.test(String(msg || ""));
const s = {
  mode: "off",
  stop: null,
  paused: false,
  events: [],
  counts: zero(),
  pages: [],
  firstT: null,
  lastT: null,
  entry: "",
  lastPath: "",
  rid: null,
  token: null,
  seq: 0,
  timer: null,
  starting: false,
  sending: false,
  hiddenAt: 0,
  blobs: new Set(),
};

const reset = () => {
  s.mode = "off";
  s.paused = false;
  s.events = [];
  s.counts = zero();
  s.pages = [];
  s.firstT = null;
  s.lastT = null;
  s.entry = "";
  s.rid = null;
  s.token = null;
  s.seq = 0;
  s.starting = false;
  s.sending = false;
  s.hiddenAt = 0;
  s.blobs = new Set();
  if (s.timer) clearInterval(s.timer);
  s.timer = null;
};

const custom = (tag, payload) => {
  if (!s.stop) return;
  try {
    record.addCustomEvent(tag, payload);
  } catch {
    /* recorder between snapshots */
  }
};

function emit(event, isCheckout) {
  if (s.mode === "off") return;
  // A visitor who stays for hours: keep memory bounded by starting again at
  // the next full snapshot.
  if (isCheckout && s.mode === "buffer" && s.events.length > BUFFER_CAP) {
    s.events = [];
    s.counts = zero();
    s.pages = [];
  }
  if (s.firstT == null) s.firstT = event.timestamp;
  s.lastT = event.timestamp;
  s.events.push(event);
  if (s.mode === "live" && s.rid && s.events.length >= SLICE * 2) flush();
}

function startRecorder() {
  if (s.stop) return;
  s.stop =
    record({
      emit,
      // What is typed is kept (the owner reads it to understand where people
      // get stuck); a password never is, whatever else changes here.
      maskAllInputs: false,
      maskInputOptions: { password: true },
      // Marks each input as typed by the person or set by a script, so the
      // story's "yazdı" lines are only what was really typed.
      userTriggeredOnInput: true,
      // Every keystroke's value, not just the last of a burst, so typing replays
      // as it happened.
      // canvas: two pictures a second of anything drawn on a canvas (a PDF page
      // being cropped, a pen explaining an answer). Unchanged frames are not
      // sent again, so a still canvas costs one picture.
      sampling: { mousemove: 50, scroll: 100, media: 800, canvas: 2 },
      dataURLOptions: { type: "image/webp", quality: 0.6 },
      slimDOMOptions: "all",
      checkoutEveryNms: 5 * 60 * 1000,
      recordCanvas: true,
      collectFonts: false,
      inlineImages: false,
      blockClass: "rr-block",
      // The ad pixel's hidden form and frame (Facebook makes one per event):
      // nothing a person sees, but every value it sets was recorded as typing.
      blockSelector: 'form[target^="fb"], iframe[name^="fb0"]',
      ignoreClass: "rr-ignore",
    }) || null;
  onRoute(window.location.pathname);
}

function stopRecorder() {
  try {
    s.stop?.();
  } catch {
    /* already stopped */
  }
  s.stop = null;
}

function onRoute(path) {
  if (!path || path === s.lastPath) return;
  s.lastPath = path;
  if (!s.entry) s.entry = path;
  s.pages.push(path);
  custom("nav", { path });
}

function apiFailed(info) {
  if (s.mode === "off") return;
  // A 401 is usually the session quietly renewing itself; it is kept on the
  // timeline but not counted as a problem the person met.
  if (info.status !== 401) s.counts.a += 1;
  custom("api", info);
}

const readMessage = (body) => {
  if (!body || typeof body !== "object") return "";
  return String(body.message || body.error || "").slice(0, 300);
};

let hooked = false;
function installHooks() {
  if (hooked) return;
  hooked = true;

  document.addEventListener(
    "click",
    (e) => {
      if (s.mode === "off" || !s.stop) return;
      // A part of the page that tells its own story (the games) is not clicks.
      if (e.target?.closest?.("[data-rec-quiet]")) return;
      const l = clickLabel(e.target);
      if (!l) return;
      s.counts.c += 1;
      custom("click", l);
    },
    true
  );

  for (const name of ["pushState", "replaceState"]) {
    const orig = history[name];
    history[name] = function (...args) {
      const out = orig.apply(this, args);
      onRoute(window.location.pathname);
      return out;
    };
  }
  window.addEventListener("popstate", () => onRoute(window.location.pathname));

  window.addEventListener(
    "error",
    (e) => {
      if (s.mode === "off") return;
      const t = e?.target;
      if (t && t !== window && t.tagName) {
        const src = pathOf(t.src || t.href || "");
        if (SITE_FILE.test(src)) {
          staleAt = Date.now();
          custom("stale", { src });
        } else {
          custom("resource", { tag: t.tagName.toLowerCase(), src });
        }
        return;
      }
      if (Date.now() - staleAt < STALE_ECHO_MS || looksStale(e?.message)) {
        custom("stale", { message: String(e?.message || "Error").slice(0, 300) });
        return;
      }
      s.counts.e += 1;
      custom("error", {
        message: String(e?.message || "Error").slice(0, 500),
        source: pathOf(e?.filename || ""),
        line: e?.lineno || 0,
        col: e?.colno || 0,
        stack: String(e?.error?.stack || "").slice(0, 1500),
      });
    },
    true
  );
  window.addEventListener("unhandledrejection", (e) => {
    if (s.mode === "off") return;
    const r = e?.reason;
    if (Date.now() - staleAt < STALE_ECHO_MS || looksStale(r?.message || r)) {
      custom("stale", { message: String(r?.message || r || "Rejected").slice(0, 300) });
      return;
    }
    s.counts.e += 1;
    custom("error", { kind: "promise", message: String(r?.message || r || "Rejected").slice(0, 500), stack: String(r?.stack || "").slice(0, 1500) });
  });

  // Every request, whichever axios instance or fetch made it.
  const X = XMLHttpRequest.prototype;
  const open = X.open;
  const send = X.send;
  X.open = function (method, url, ...rest) {
    this.__rec = { method: String(method || "GET").toUpperCase(), url: String(url || "") };
    return open.call(this, method, url, ...rest);
  };
  X.send = function (...args) {
    const info = this.__rec;
    if (info && !info.url.includes("/api/rec/") && !info.url.endsWith("/api/rec/start")) {
      const t0 = performance.now();
      this.addEventListener("loadend", () => {
        const ms = Math.round(performance.now() - t0);
        const status = this.status;
        const path = pathOf(info.url);
        if (status >= 400 || status === 0) {
          let body = null;
          try {
            body = this.responseType === "json" ? this.response : this.responseType === "" || this.responseType === "text" ? JSON.parse(this.responseText) : null;
          } catch {
            body = null;
          }
          apiFailed({ method: info.method, path, status, message: status === 0 ? "Şəbəkə xətası" : readMessage(body), ms });
        } else {
          const step = milestoneFor(info.method, path);
          if (step) custom("milestone", { label: step, path });
          if (ms > 5000) custom("slow", { method: info.method, path, ms });
        }
      });
    }
    return send.apply(this, args);
  };

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input?.url || String(input || "");
      if (url.includes("/api/rec/")) return nativeFetch.call(this, input, init);
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      const t0 = performance.now();
      try {
        const res = await nativeFetch.call(this, input, init);
        if (!res.ok) {
          let body = null;
          try {
            body = await res.clone().json();
          } catch {
            body = null;
          }
          apiFailed({ method, path: pathOf(url), status: res.status, message: readMessage(body), ms: Math.round(performance.now() - t0) });
        } else {
          const step = milestoneFor(method, pathOf(url));
          if (step) custom("milestone", { label: step, path: pathOf(url) });
        }
        return res;
      } catch (err) {
        apiFailed({ method, path: pathOf(url), status: 0, message: String(err?.message || "Şəbəkə xətası").slice(0, 300), ms: Math.round(performance.now() - t0) });
        throw err;
      }
    };
  }

  // The messages people were shown: what the screen said when it went wrong.
  for (const kind of ["error", "warn", "warning", "info", "success"]) {
    const orig = toast[kind];
    if (typeof orig !== "function") continue;
    toast[kind] = function (content, opts) {
      try {
        if (s.mode !== "off") {
          const text = typeof content === "string" ? content : typeof content?.props?.children === "string" ? content.props.children : "";
          if (kind === "error" || kind.startsWith("warn")) s.counts.o += 1;
          custom("toast", { type: kind, text: String(text).slice(0, 300) });
        }
      } catch {
        /* never let recording break a message */
      }
      return orig.call(this, content, opts);
    };
  }

  // Lines written by the app itself (helper/recEvent), e.g. the games.
  window.addEventListener(REC_EVENT, (e) => {
    if (s.mode === "off" || !s.stop) return;
    const tag = e?.detail?.tag;
    if (!ALLOWED.has(tag)) return;
    const payload = e.detail.payload && typeof e.detail.payload === "object" ? e.detail.payload : {};
    if (tag === "game" && payload.action === "open") s.counts.g += 1;
    custom(tag, payload);
  });

  document.addEventListener("visibilitychange", () => {
    if (s.mode === "off") return;
    if (document.visibilityState === "hidden") {
      s.hiddenAt = Date.now();
      custom("away", {});
      flush();
    } else if (s.hiddenAt) {
      custom("back", { ms: Date.now() - s.hiddenAt });
      s.hiddenAt = 0;
    }
  });
  window.addEventListener("pagehide", lastWords);
}

// ── pictures behind blob: links ──

// A small copy of each picture shown from a temporary browser link, written
// into the timeline once. Runs with every slice, so a new preview is caught
// within a few seconds; a picture still loading is caught on a later pass.
function copyBlobImages() {
  if (s.mode === "off" || !s.stop || s.blobs.size >= BLOB_IMG_MAX) return;
  let imgs;
  try {
    imgs = document.querySelectorAll('img[src^="blob:"]');
  } catch {
    return;
  }
  for (const img of imgs) {
    if (s.blobs.size >= BLOB_IMG_MAX) break;
    const url = img.getAttribute("src");
    if (!url || s.blobs.has(url) || !img.complete || !img.naturalWidth) continue;
    s.blobs.add(url);
    try {
      const k = Math.min(1, BLOB_IMG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      custom("blobimg", { url, data: c.toDataURL("image/jpeg", 0.72) });
    } catch {
      /* not drawable: the replay shows an empty frame, as before */
    }
  }
}

// ── sending ──

const b64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function gzip(text) {
  const Gzip = globalThis.CompressionStream; // Chrome 80+, Safari 16.4+, Firefox 113+
  if (typeof Gzip === "undefined") return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new Gzip("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

const takeMeta = () => {
  const m = { ...s.counts, p: s.pages.slice(-50), t1: s.lastT };
  s.counts = zero();
  s.pages = [];
  return m;
};
const giveBack = (events, m) => {
  s.events = events.concat(s.events);
  s.counts.c += m.c;
  s.counts.e += m.e;
  s.counts.a += m.a;
  s.counts.o += m.o;
  s.counts.g += m.g || 0;
  s.pages = m.p.concat(s.pages);
};
const chunkUrl = (m, z, final) =>
  `${API}/${s.rid}/chunk?seq=${s.seq++}&t=${encodeURIComponent(s.token)}&z=${z}&m=${b64(JSON.stringify(m))}${final ? "&final=1" : ""}`;

async function sendSlice(events, final = false) {
  if (!s.rid) return false;
  const m = takeMeta();
  const text = JSON.stringify(events);
  const packed = await gzip(text);
  const body = packed || text;
  const size = packed ? packed.byteLength : text.length;
  try {
    const res = await fetch(chunkUrl(m, packed ? 1 : 0, final), {
      method: "POST",
      body,
      headers: { "Content-Type": "text/plain" },
      credentials: "omit",
      keepalive: size < BEACON_MAX,
    });
    if (res.status === 403 || res.status === 404 || res.status === 413) {
      // The server will not take more of this visit.
      stopRecorder();
      reset();
      return false;
    }
    if (!res.ok) throw new Error(String(res.status));
    return true;
  } catch {
    giveBack(events, m);
    return false;
  }
}

async function flush(final = false) {
  copyBlobImages();
  if (!s.rid || s.sending) return;
  s.sending = true;
  try {
    while (s.events.length) {
      const slice = s.events.splice(0, SLICE);
      const ok = await sendSlice(slice, final && !s.events.length);
      if (!ok) break;
    }
    if (final && !s.events.length && s.rid) await sendSlice([], true);
  } finally {
    s.sending = false;
  }
}

// The page is closing: send what is left without waiting for anything.
function lastWords() {
  if (s.mode !== "live" || !s.rid || !navigator.sendBeacon) return;
  const events = s.events.splice(0);
  const m = takeMeta();
  let piece = [];
  let size = 2;
  const out = [];
  for (const ev of events) {
    const len = JSON.stringify(ev).length + 1;
    if (size + len > BEACON_MAX && piece.length) {
      out.push(piece);
      piece = [];
      size = 2;
    }
    piece.push(ev);
    size += len;
  }
  out.push(piece);
  out.forEach((p, i) => {
    const last = i === out.length - 1;
    const meta = i === 0 ? m : { c: 0, e: 0, a: 0, o: 0, g: 0, p: [], t1: m.t1 };
    try {
      navigator.sendBeacon(chunkUrl(meta, 0, last), new Blob([JSON.stringify(p)], { type: "text/plain" }));
    } catch {
      /* the tab is going anyway */
    }
  });
}

// The visitor tracker's id for this visit (where they came from), if it has one.
const visitId = () => {
  try {
    return sessionStorage.getItem("exq_vsid") || null;
  } catch {
    return null;
  }
};

async function beginLive(registered) {
  if (s.starting || s.rid) return;
  s.starting = true;
  try {
    const res = await axios.post(`${API}/start`, {
      t0: s.firstT,
      registered,
      entry: s.entry,
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      visit: visitId(),
    });
    if (res.status !== 201 || !res.data?.rid || s.mode !== "live") {
      stopRecorder();
      reset();
      return;
    }
    s.rid = res.data.rid;
    s.token = res.data.token;
    s.timer = setInterval(() => flush(), FLUSH_MS);
    flush();
  } catch {
    stopRecorder();
    reset();
  } finally {
    s.starting = false;
  }
}

async function finishLive() {
  stopRecorder();
  if (s.timer) clearInterval(s.timer);
  s.timer = null;
  if (s.rid) await flush(true);
  reset();
}

/*
 * Move to a mode decided by recorderPolicy.decide():
 *   buffer → record into memory; live → keep and send; pause → stop for this
 *   page and pick up after it; off → stop, sending what a live visit has left.
 */
export function setMode(next, { justRegistered = false } = {}) {
  installHooks();
  const prev = s.mode;

  if (next === "off") {
    if (prev === "live") finishLive();
    else {
      stopRecorder();
      reset();
    }
    return;
  }

  if (next === "pause") {
    if (s.stop) {
      custom("pause", { path: window.location.pathname });
      stopRecorder();
    }
    s.paused = true;
    if (prev === "off") s.mode = "buffer";
    return;
  }

  if (next === "buffer" && prev === "live") {
    // Signed out in the middle of a kept visit: it ends here.
    finishLive();
    return;
  }

  s.mode = next;
  if (!s.stop) startRecorder();
  s.paused = false;
  if (next === "live" && !s.rid) beginLive(prev === "buffer" && justRegistered);
}
