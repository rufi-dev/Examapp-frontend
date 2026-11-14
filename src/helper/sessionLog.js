/*
 * A recorded session, read as a story: the pages, clicks, errors, failed
 * requests, messages and steps forward the recorder wrote into the timeline,
 * each at its moment. Also spots rage clicks (the same thing clicked three
 * times or more within two seconds), the plainest sign someone was stuck.
 *
 * Kept free of React so it can be tested without rendering.
 */

const CUSTOM = 5; // rrweb EventType.Custom
const INCREMENTAL = 3; // rrweb EventType.IncrementalSnapshot
const VIEWPORT_RESIZE = 4; // rrweb IncrementalSource.ViewportResize
const FULL_SNAPSHOT = 2; // rrweb EventType.FullSnapshot
const MUTATION = 0; // rrweb IncrementalSource.Mutation
const INPUT = 5; // rrweb IncrementalSource.Input
const TYPING_PAUSE_MS = 15000; // keystrokes closer than this are one line

/*
 * A phone's keyboard opening or closing changes only the window's height. In a
 * replay that resizes the whole frame and the picture jumps; the page did not
 * really change size. Drop resizes that keep the width; keep real ones (a
 * rotated phone, a resized window).
 */
export const steadyFilter = () => {
  let width = null;
  return (events) =>
    (Array.isArray(events) ? events : []).filter((e) => {
      if (e?.type === 4 && e.data?.width) width = e.data.width; // Meta: the starting size
      if (e?.type !== INCREMENTAL || e.data?.source !== VIEWPORT_RESIZE) return true;
      if (width != null && e.data.width === width) return false;
      width = e.data.width;
      return true;
    });
};
/* The same, over one complete list (the stateful filter above serves a live feed in batches). */
export const steadyViewport = (events) => steadyFilter()(events);

/* "4:07", or "1:02:09" past an hour. */
export const clock = (ms) => {
  const t = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/* "12 dəq", "45 san", "1 saat 5 dəq". */
export const lasted = (ms) => {
  const t = Math.round((Number(ms) || 0) / 1000);
  if (t < 60) return `${t} san`;
  const m = Math.round(t / 60);
  if (m < 60) return `${m} dəq`;
  return `${Math.floor(m / 60)} saat ${m % 60} dəq`;
};

// A code file of the site, and the errors a missing one causes.
const SITE_FILE = /\/assets\/[^/?#]+\.(js|css)(\?|#|$)/;
const STALE_ECHO_MS = 5000;

const toastTone = (type) => (type === "error" ? "bad" : String(type).startsWith("warn") ? "warn" : type === "success" ? "good" : "info");

const GAME_NAMES = { hesab: "Sürətli hesab", soz: "Söz tap" };
const gameName = (id) => GAME_NAMES[id] || "oyun";

// One line of the story for a waiting-room game event (recorder tag "game").
const gameItem = (t, p) => {
  const name = gameName(p.game);
  switch (p.action) {
    case "open":
      return { t, kind: "game", tone: "info", title: `Oyun açdı: ${name}`, detail: "AI imtahanı yazarkən gözləmə oyunu" };
    case "close":
      return { t, kind: "game", tone: "muted", title: `Oyunu bağladı: ${name}`, detail: "" };
    case "start":
      return { t, kind: "game", tone: "info", title: `Raund başladı: ${name}`, detail: "" };
    case "end":
      return {
        t,
        kind: "game",
        tone: p.record ? "good" : "info",
        title: `Raund bitdi: ${Number(p.score) || 0} xal`,
        detail: `${Number(p.right) || 0} düz · ${Number(p.wrong) || 0} səhv · ən uzun seriya ${Number(p.streak) || 0}${p.record ? " · yeni rekord" : ""}`,
      };
    case "word":
      return { t, kind: "game", tone: "info", title: `Söz tapdı: ${p.word || "?"}`, detail: `+${Number(p.gained) || 0} · cəmi ${Number(p.score) || 0} xal${p.hints ? ` · ${p.hints} ipucu` : ""}` };
    case "skip":
      return { t, kind: "game", tone: "muted", title: `Sözü keçdi: ${p.word || "?"}`, detail: name };
    // The live class game ("Canlı oyun") on the teacher's screen.
    case "class-open":
      return { t, kind: "game", tone: "info", title: "Sinif oyununu açdı", detail: p.exam ? String(p.exam) : "" };
    case "class-start":
      return { t, kind: "game", tone: "good", title: "Sinif oyununu başlatdı", detail: `${Number(p.players) || 0} şagird · ${Number(p.questions) || 0} sual` };
    case "class-end":
      return { t, kind: "game", tone: "good", title: "Sinif oyunu bitdi", detail: `${Number(p.players) || 0} şagird · ${Number(p.questions) || 0} sual oynandı` };
    default:
      return null;
  }
};

/*
 * What a field is called, for "typed «…» into <field>". Read from the page as
 * recorded: an aria-label, the placeholder, or the name, whichever it has.
 */
const fieldLabel = (attrs = {}) =>
  String(attrs["aria-label"] || attrs.placeholder || attrs.name || attrs.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

// Every element the recording knows by id: tag and the attributes that name it.
const collectFields = (list) => {
  const fields = new Map();
  const adForms = new Set(); // ids of the ad pixel's hidden forms
  // The ad pixel (Facebook) posts each event through a hidden form it fills
  // itself; its fields are never typing.
  const isAdForm = (node) => {
    const a = node.attributes || {};
    return /^fb/i.test(String(a.target || "")) || /facebook\.com\/tr/i.test(String(a.action || ""));
  };
  const visit = (node, inAd) => {
    if (!node || typeof node !== "object") return;
    const tag = String(node.tagName || "").toLowerCase();
    const ad = inAd || (tag === "form" && isAdForm(node));
    if (ad && tag === "form" && node.id != null) adForms.add(node.id);
    if (node.id != null && (tag === "input" || tag === "textarea" || tag === "select")) {
      fields.set(node.id, { tag, type: String(node.attributes?.type || "").toLowerCase(), label: fieldLabel(node.attributes), ad });
    }
    for (const c of node.childNodes || []) visit(c, ad);
  };
  for (const e of list) {
    if (e.type === FULL_SNAPSHOT) visit(e.data?.node, false);
    else if (e.type === INCREMENTAL && e.data?.source === MUTATION) for (const a of e.data.adds || []) visit(a.node, adForms.has(a.parentId));
  }
  return fields;
};

export const buildLog = (events) => {
  const list = (Array.isArray(events) ? events : []).filter((e) => e && Number.isFinite(e.timestamp));
  const start = list.length ? list[0].timestamp : 0;
  const end = list.length ? list[list.length - 1].timestamp : 0;
  const items = [];
  const clicks = [];
  let staleAt = -Infinity;
  const fields = collectFields(list);
  // Per field, the line still being typed into: { item, last }. Kept per field,
  // so going back and forth between two boxes does not make a line per hop.
  const typing = new Map();
  // How many fields got a value at each instant (see the burst rule below).
  const burst = new Map();
  for (const e of list) {
    if (e.type === INCREMENTAL && e.data?.source === INPUT) burst.set(e.timestamp, (burst.get(e.timestamp) || 0) + 1);
  }
  // One site update is a burst of missing files and their echoes: one line.
  const stale = (t, detail) => {
    const last = items[items.length - 1];
    if (last?.kind === "stale" && t - last.t < STALE_ECHO_MS) {
      last.count += 1;
      last.detail = `${last.count} köhnə fayl və onların xətası · səhifə özü yeniləndi`;
      return;
    }
    items.push({ t, kind: "stale", tone: "warn", count: 1, title: "Sayt yenilənmişdi: köhnə versiyanın faylı tapılmadı", detail: `${detail} · səhifə özü yeniləndi` });
  };

  for (const e of list) {
    // What was typed, one line per field and burst of typing, showing the text
    // as it stood at the end of the burst. Passwords arrive masked and are
    // skipped; ticked boxes are not typing.
    // (rrweb sends isChecked on every input event, text boxes included, so the
    // field's own type is what tells a tick box apart.)
    if (e.type === INCREMENTAL && e.data?.source === INPUT && typeof e.data.text === "string") {
      const known = fields.get(e.data.id);
      const f = known || { tag: "input", type: "", label: "" };
      const text = e.data.text.replace(/\s+/g, " ").trim();
      const t = e.timestamp - start;
      if (f.type === "password" || /^\*+$/.test(text) || ["checkbox", "radio", "range", "color", "file", "hidden"].includes(f.type)) continue;
      if (!known && e.data.isChecked === true) continue; // an unknown field that is ticked is a tick box
      if (f.ad) continue; // the ad pixel's own hidden form
      // Only what a person typed: a value set by a script (the ad pixel fills a
      // hidden form on every page, 15,000 times in one visit) is not typing.
      if (e.data.userTriggered === false) continue;
      // Older recordings carry no such mark. There, values landing in three or
      // more fields at the same instant are the page filling itself in (the AI's
      // questions arriving in the builder): nobody types into three boxes at once.
      if (e.data.userTriggered !== true && (burst.get(e.timestamp) || 0) >= 3) continue;
      const open = typing.get(e.data.id);
      if (open && t - open.last <= TYPING_PAUSE_MS) {
        open.last = t;
        open.item.text = text;
        continue;
      }
      const item = { t, kind: "input", tone: "plain", text, field: f.label, select: f.tag === "select" };
      items.push(item);
      typing.set(e.data.id, { item, last: t });
      continue;
    }
    if (e.type !== CUSTOM || !e.data) continue;
    const p = e.data.payload || {};
    const t = e.timestamp - start;
    switch (e.data.tag) {
      case "nav":
        items.push({ t, kind: "nav", tone: "info", title: p.path || "/", detail: "səhifə açdı" });
        break;
      case "click": {
        const what = p.href ? `keçid → ${p.href}` : p.tag === "a" ? "keçid" : ["input", "textarea", "select"].includes(p.tag) ? "sahə" : "düymə";
        items.push({ t, kind: "click", tone: "plain", title: `«${p.label || "?"}»`, detail: what, label: p.label });
        clicks.push({ t, label: p.label });
        break;
      }
      case "stale":
        staleAt = t;
        stale(t, p.src || p.message || "");
        break;
      case "error":
        // Recorded before the recorder knew the difference: an error right after
        // a missing site file is that file's echo, not a separate problem.
        if (t - staleAt < STALE_ECHO_MS) {
          stale(t, p.message || "");
          break;
        }
        items.push({
          t,
          kind: "error",
          tone: "bad",
          title: p.message || "Xəta",
          detail: p.kind === "promise" ? "cavabsız qalan əməliyyat" : p.source ? `${p.source}:${p.line || 0}` : "JavaScript xətası",
          stack: p.stack || "",
        });
        break;
      case "api":
        items.push({
          t,
          kind: "api",
          tone: p.status === 401 ? "muted" : "bad",
          title: `${p.method || "GET"} ${p.path || ""}`,
          detail: p.status === 0 ? p.message || "şəbəkə xətası" : p.status === 401 ? "401 · sessiya yeniləndi" : `${p.status}${p.message ? ` · ${p.message}` : ""}`,
        });
        break;
      case "slow":
        items.push({ t, kind: "slow", tone: "warn", title: `Yavaş cavab: ${p.method || ""} ${p.path || ""}`, detail: `${((p.ms || 0) / 1000).toFixed(1)} san` });
        break;
      case "toast":
        items.push({ t, kind: "toast", tone: toastTone(p.type), title: p.text || "(mesaj)", detail: "ekranda göstərilən mesaj" });
        break;
      case "milestone":
        items.push({ t, kind: "milestone", tone: "good", title: p.label || "Addım", detail: p.path || "" });
        break;
      case "resource":
        if (SITE_FILE.test(p.src || "")) {
          staleAt = t;
          stale(t, p.src);
        } else {
          items.push({ t, kind: "resource", tone: "warn", title: "Fayl yüklənmədi", detail: p.src || "" });
        }
        break;
      case "pause":
        items.push({ t, kind: "pause", tone: "muted", title: "Qeydə alınmayan səhifə", detail: p.path || "" });
        break;
      case "game": {
        const it = gameItem(t, p);
        if (it) items.push(it);
        break;
      }
      case "away":
        items.push({ t, kind: "away", tone: "muted", title: "Başqa taba və ya proqrama keçdi", detail: "sayt arxada açıq qaldı" });
        break;
      case "back":
        items.push({ t, kind: "away", tone: "muted", title: "Sayta qayıtdı", detail: `${lasted(p.ms)} sonra` });
        break;
      default:
        break;
    }
  }

  // Typed lines get their words once the burst is over.
  for (const it of items) {
    if (it.kind !== "input") continue;
    const shown = it.text.length > 140 ? `${it.text.slice(0, 140)}…` : it.text;
    it.title = shown ? `«${shown}»` : "(sahəni təmizlədi)";
    it.detail = `${it.select ? "seçdi" : "yazdı"}${it.field ? ` · ${it.field}` : ""}`;
    it.tone = shown ? "plain" : "muted";
  }

  // Rage clicks: three or more on the same thing inside two seconds.
  for (let i = 0; i < clicks.length; i += 1) {
    let j = i;
    while (j + 1 < clicks.length && clicks[j + 1].label === clicks[i].label && clicks[j + 1].t - clicks[i].t <= 2000) j += 1;
    if (j - i >= 2) {
      items.push({ t: clicks[j].t, kind: "rage", tone: "warn", title: `Təkrar-təkrar klik: «${clicks[i].label}»`, detail: `${j - i + 1} dəfə, ${((clicks[j].t - clicks[i].t) / 1000).toFixed(1)} saniyədə` });
      i = j;
    }
  }

  items.sort((a, b) => a.t - b.t);
  const count = (fn) => items.filter(fn).length;
  return {
    start,
    end,
    duration: end - start,
    items,
    counts: {
      pages: count((i) => i.kind === "nav"),
      clicks: count((i) => i.kind === "click"),
      problems: count((i) => i.tone === "bad"),
      rage: count((i) => i.kind === "rage"),
      typed: count((i) => i.kind === "input"),
      games: count((i) => i.kind === "game" && /^Oyun açdı/.test(i.title)),
    },
    milestones: items.filter((i) => i.kind === "milestone").map((i) => i.title),
  };
};

/* Which items a filter keeps. */
export const FILTERS = [
  { key: "all", label: "Hamısı", test: () => true },
  { key: "problems", label: "Problemlər", test: (i) => i.tone === "bad" || i.tone === "warn" },
  { key: "clicks", label: "Kliklər", test: (i) => i.kind === "click" || i.kind === "rage" },
  { key: "typed", label: "Yazdıqları", test: (i) => i.kind === "input" },
  { key: "pages", label: "Səhifələr", test: (i) => i.kind === "nav" || i.kind === "pause" },
  { key: "steps", label: "Addımlar", test: (i) => i.kind === "milestone" },
];

/*
 * Long stretches where nothing at all happened (the tab left open, the person
 * away) are shortened in the replay to a few seconds, so watching a visit is
 * watching what was done. Real pace is kept everywhere else: a pause under a
 * minute (reading, thinking) plays as it was.
 *
 * Returns the shortened events plus two clocks to move between them: the story
 * keeps REAL times (what the person lived), the player runs on the short one.
 */
export const IDLE_OVER_MS = 60000;
export const IDLE_KEEP_MS = 3000;

export const squeezeIdle = (events, { over = IDLE_OVER_MS, keep = IDLE_KEEP_MS } = {}) => {
  const list = Array.isArray(events) ? events : [];
  const gaps = []; // { at: real offset where the still stretch begins, ms: its real length, cut: ms removed }
  if (list.length < 2) return { events: list, gaps, toShort: (t) => t, toReal: (t) => t };
  const start = list[0].timestamp;
  let cut = 0;
  const out = new Array(list.length);
  out[0] = list[0];
  for (let i = 1; i < list.length; i += 1) {
    const gap = list[i].timestamp - list[i - 1].timestamp;
    if (gap > over) {
      gaps.push({ at: list[i - 1].timestamp - start, ms: gap, cut: gap - keep });
      cut += gap - keep;
    }
    out[i] = cut ? { ...list[i], timestamp: list[i].timestamp - cut } : list[i];
  }
  if (!gaps.length) return { events: list, gaps, toShort: (t) => t, toReal: (t) => t };
  // Real offset → short offset: take away every cut that ended before it.
  const toShort = (real) => {
    let r = real;
    for (const g of gaps) {
      if (real >= g.at + g.ms) r -= g.cut;
      else if (real > g.at + keep) r -= real - (g.at + keep);
    }
    return Math.max(0, r);
  };
  // Short offset → real offset: add back every cut whose kept part is behind it.
  const toReal = (short) => {
    let r = short;
    for (const g of gaps) {
      const shortStart = toShort(g.at);
      if (short >= shortStart + keep) r += g.cut;
    }
    return r;
  };
  return { events: out, gaps, toShort, toReal };
};

/* The story lines for those shortened stretches. */
export const idleItems = (gaps) =>
  (gaps || []).map((g) => ({ t: g.at + 1, kind: "idle", tone: "muted", title: `${lasted(g.ms)} heç nə olmadı`, detail: "videoda bir neçə saniyəyə qısaldıldı" }));

/*
 * What was on a canvas (a PDF page in the crop window, a pen explaining an
 * answer) is recorded as a picture twice a second. rrweb replays those by
 * drawing into the canvas, which works while playing but not after a jump: the
 * page is rebuilt, the canvas size is set again afterwards, and setting a
 * canvas's size wipes it, so after clicking a line of the story the canvas was
 * an empty box. Here each picture becomes the canvas's CSS background instead,
 * a plain style change that a jump replays like any other; the canvas itself
 * stays transparent on top. Returns a new list; pictures in the first page
 * (rr_dataURL) are moved in place.
 */
const CANVAS_MUTATION = 9; // rrweb IncrementalSource.CanvasMutation
const asBackground = (url) => ({
  "background-image": `url("${url}")`,
  "background-size": "100% 100%",
  "background-repeat": "no-repeat",
});
const frameUrl = (data) => {
  // [clearRect?, drawImage(ImageBitmap(Blob([ArrayBuffer base64], type)), 0, 0)]: one whole frame.
  const cmds = Array.isArray(data?.commands) ? data.commands : null;
  if (!cmds || cmds.length > 2) return null;
  const draw = cmds[cmds.length - 1];
  if (draw?.property !== "drawImage" || (cmds.length === 2 && cmds[0]?.property !== "clearRect")) return null;
  const bmp = draw.args?.[0];
  const blob = bmp?.rr_type === "ImageBitmap" ? bmp.args?.[0] : null;
  const b64 = blob?.rr_type === "Blob" ? blob.data?.[0]?.base64 : null;
  return typeof b64 === "string" ? `data:${blob.type || "image/webp"};base64,${b64}` : null;
};
const canvasStyle = (attrs) => {
  if (!attrs || typeof attrs.rr_dataURL !== "string") return;
  const bg = asBackground(attrs.rr_dataURL);
  const css = Object.entries(bg).map(([k, v]) => `${k}:${v}`).join(";");
  attrs.style = attrs.style ? `${String(attrs.style).replace(/;?\s*$/, ";")}${css}` : css;
  delete attrs.rr_dataURL;
};
export const canvasFramesAsBackground = (events) => {
  const list = Array.isArray(events) ? events : [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (String(node.tagName || "").toLowerCase() === "canvas") canvasStyle(node.attributes);
    for (const c of node.childNodes || []) visit(c);
  };
  return list.map((e) => {
    if (e?.type === FULL_SNAPSHOT) visit(e.data?.node);
    if (e?.type !== INCREMENTAL) return e;
    if (e.data?.source === MUTATION) {
      for (const a of e.data.adds || []) visit(a.node);
      return e;
    }
    if (e.data?.source !== CANVAS_MUTATION) return e;
    const url = frameUrl(e.data);
    if (!url) return e;
    return { ...e, data: { source: MUTATION, texts: [], removes: [], adds: [], attributes: [{ id: e.data.id, attributes: { style: asBackground(url) } }] } };
  });
};

/*
 * A picture shown from a temporary browser link (blob:) is dead by the time the
 * visit is watched. The recorder keeps a small copy of each ("blobimg"); this
 * puts the copies in place of the dead links, in the page as first recorded and
 * in everything added later. Changes the events in place; running it twice is
 * harmless.
 */
export const inlineBlobImages = (events) => {
  const list = Array.isArray(events) ? events : [];
  const copies = new Map();
  for (const e of list) {
    if (e?.type === CUSTOM && e.data?.tag === "blobimg" && e.data.payload?.url && e.data.payload?.data) copies.set(e.data.payload.url, e.data.payload.data);
  }
  if (!copies.size) return 0;
  let swapped = 0;
  const fix = (attrs) => {
    if (attrs && typeof attrs.src === "string" && copies.has(attrs.src)) {
      attrs.src = copies.get(attrs.src);
      swapped += 1;
    }
  };
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    fix(node.attributes);
    for (const c of node.childNodes || []) visit(c);
  };
  for (const e of list) {
    if (e?.type === FULL_SNAPSHOT) visit(e.data?.node);
    else if (e?.type === INCREMENTAL && e.data?.source === MUTATION) {
      for (const a of e.data.adds || []) visit(a.node);
      for (const a of e.data.attributes || []) fix(a.attributes);
    }
  }
  return swapped;
};
