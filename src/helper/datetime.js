// Helpers to keep <input type="datetime-local"> values and stored UTC dates
// in sync. The input works in LOCAL wall-clock time; we store/transport UTC.

const pad = (n) => String(n).padStart(2, "0");

// Stored date (UTC ISO or Date) -> "YYYY-MM-DDTHH:mm" in LOCAL time,
// for use as a datetime-local input value.
export function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// datetime-local value (local wall clock) -> UTC ISO string for storage.
export function toUtcIso(localValue) {
  if (!localValue) return "";
  const d = new Date(localValue); // parsed as local time
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

// Stored date -> "DD/MM/YYYY HH:mm" in LOCAL time, for display.
export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const AZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

// A remaining-time span (ms) -> "2 gün 4 saat 12 dəq". Seconds are shown only
// when under an hour is left, so a far-off countdown stays readable while a
// near one still ticks visibly.
export function formatRemaining(ms) {
  if (!ms || ms <= 0) return "0 san";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (d) parts.push(`${d} gün`);
  if (h) parts.push(`${h} saat`);
  if (m) parts.push(`${m} dəq`);
  if (!d && !h) parts.push(`${s} san`);
  return parts.join(" ");
}

const azDay = (d) => `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}`;
const azTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Compact exam window: "20 İyun, 10:00 – 13:00" (same day),
// "20 İyun 10:00 → 21 İyun 13:00" (spanning days), or one-sided.
export function formatExamWindow(start, end) {
  let s = start ? new Date(start) : null;
  let e = end ? new Date(end) : null;
  if (s && isNaN(s.getTime())) s = null;
  if (e && isNaN(e.getTime())) e = null;
  if (s && e) {
    return s.toDateString() === e.toDateString()
      ? `${azDay(s)}, ${azTime(s)} – ${azTime(e)}`
      : `${azDay(s)} ${azTime(s)} → ${azDay(e)} ${azTime(e)}`;
  }
  if (s) return `${azDay(s)}, ${azTime(s)}-dən`;
  if (e) return `${azDay(e)}, ${azTime(e)}-dək`;
  return "";
}
