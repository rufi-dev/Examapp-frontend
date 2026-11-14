/*
 * «Analitika»: the arithmetic behind the page, kept out of the markup so it can
 * be tested. Periods are Azerbaijan calendar days (UTC+4, no DST), the same days
 * the server buckets by, so "today" never lands on the wrong side of midnight.
 */

const DAY = 864e5;
const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];

// yyyy-mm-dd of a moment, in Azerbaijan time.
export const azDay = (t = Date.now()) => new Date(new Date(t).getTime() + 4 * 3600 * 1000).toISOString().slice(0, 10);
const shift = (key, days) => azDay(new Date(`${key}T12:00:00.000+04:00`).getTime() + days * DAY);
export const daysBetween = (from, to) => Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / DAY) + 1;

export const PRESETS = [
  { key: "today", label: "Bu gün" },
  { key: "yesterday", label: "Dünən" },
  { key: "7", label: "7 gün" },
  { key: "30", label: "30 gün" },
  { key: "90", label: "90 gün" },
];

// The range a preset (or a custom from/to) means, ending today.
export function periodRange(preset, custom = {}, now = Date.now()) {
  const today = azDay(now);
  if (preset === "custom" && custom.from && custom.to && custom.from <= custom.to) return { from: custom.from, to: custom.to };
  if (preset === "yesterday") return { from: shift(today, -1), to: shift(today, -1) };
  const n = Number(preset);
  if (n > 1) return { from: shift(today, -(n - 1)), to: today };
  return { from: today, to: today };
}

// The same number of days right before: what the period is compared with.
export function previousRange({ from, to }) {
  const n = daysBetween(from, to);
  return { from: shift(from, -n), to: shift(from, -1) };
}

// A chart needs some days to show a shape: a shorter period draws its last 7 days.
export function chartRange({ from, to }) {
  return daysBetween(from, to) >= 7 ? { from, to } : { from: shift(to, -6), to };
}

// Change against the period before, in whole percent; null when there is nothing to compare with.
export function change(now, before) {
  if (!before) return now ? null : 0;
  return Math.round(((now - before) / before) * 100);
}

export const dayLabel = (key, full = false) => {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  return full ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
};
export const rangeLabel = ({ from, to }) => (from === to ? dayLabel(from, true) : `${dayLabel(from)} – ${dayLabel(to, true)}`);
export const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;

export const sum = (a) => (a || []).reduce((n, x) => n + (Number(x) || 0), 0);
export const fmtNum = (n) => Number(n || 0).toLocaleString("az-AZ");

// mm:ss / h:mm:ss from seconds on the site.
export function fmtDuration(s) {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// "Chrome · Windows" from a user agent; Facebook's in-app browser is named.
export function fmtDevice(ua) {
  if (!ua) return "";
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Digər";
  const br = /FBAN|FBAV|FB_IAB|FBIOS/.test(ua) ? "Facebook" : /Instagram/.test(ua) ? "Instagram" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Brauzer";
  return `${br} · ${os}`;
}

export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" }) : "");
export const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString("az-AZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Baku" }) : "");

// Traffic sources, grouped as the server groups them.
export const SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "google", label: "Google" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "direct", label: "Birbaşa" },
  { key: "other", label: "Digər" },
];
export const sourceLabel = (k) => SOURCES.find((s) => s.key === k)?.label || k;
const SRC_RX = {
  instagram: /instagram|igsh|(^|[^a-z])ig([^a-z]|$)/i,
  facebook: /facebook|fbclid|(^|[^a-z])fb([^a-z]|$)/i,
  google: /google|gclid/i,
  tiktok: /tiktok/i,
  youtube: /youtube|youtu\.be/i,
};
export function sourceOf(row) {
  const text = [row?.affiliate, row?.referrer, row?.campaign].filter(Boolean).join(" ");
  const a = String(row?.affiliate || "").trim();
  const hit = Object.keys(SRC_RX).find((k) => SRC_RX[k].test(text));
  if (hit) return hit;
  return !a || a === "(direct)" ? "direct" : "other";
}

// A visit that looked at prices: the page or the wall.
// The visit reached a paid exam's payment page (/exam/:id/pay) — buying intent.
export const sawPlans = (pages) => (pages || []).some((p) => /^\/exam\/[^/]+\/pay(\/|\?|$)/.test(String(p || "")));

/*
 * Where teachers got to in setting up (the funnel endpoint's states). They
 * overlap, so they are shown each against all teachers, never as parts of a whole.
 */
export const SETUP = [
  { key: "finished", label: "Tam hazır", hint: "sinif, suallı imtahan və şagird" },
  { key: "readyNoStudents", label: "İmtahan hazır, şagird yox", hint: "şagird dəvət olunmayıb" },
  { key: "emptyClass", label: "Boş sinif", hint: "imtahanı olmayan sinif" },
  { key: "emptyExam", label: "Boş imtahan", hint: "sualsız imtahan" },
  { key: "notStarted", label: "Başlamayıb", hint: "nə sinif, nə imtahan" },
];
