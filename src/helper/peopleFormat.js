/*
 * Small readings for the people directory: dates as Baku sees them, and the
 * device someone uses, from the browser string the server keeps.
 *
 * Dates are formatted by hand: the browser's own Azerbaijani formatting prints
 * "2026 M10 02" on many machines (no month names in their locale data).
 */

const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const BAKU = 4 * 3600000; // UTC+4, no daylight saving

const baku = (d) => {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isFinite(t) ? new Date(t + BAKU) : null;
};

/* "2 okt 2026". */
export const formatDay = (d) => {
  const b = baku(d);
  return b ? `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}` : "—";
};

/* "2 okt 2026, 14:05". */
export const formatDayTime = (d) => {
  const b = baku(d);
  if (!b) return "—";
  const hh = String(b.getUTCHours()).padStart(2, "0");
  const mm = String(b.getUTCMinutes()).padStart(2, "0");
  return `${formatDay(d)}, ${hh}:${mm}`;
};

// Order matters: Edge, Opera, Samsung and Yandex all also say "Chrome", and
// Chrome also says "Safari".
const BROWSERS = [
  [/EdgA?\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
  [/YaBrowser\/(\d+)/, "Yandex"],
  [/FxiOS\/(\d+)|Firefox\/(\d+)/, "Firefox"],
  [/CriOS\/(\d+)|Chrome\/(\d+)/, "Chrome"],
  [/Version\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari/, "Safari"],
];
const SYSTEMS = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

/* { browser: "Chrome 154", system: "Android", mobile: true } from a user-agent string. */
export const readDevice = (ua) => {
  const s = String(ua || "");
  if (!s) return null;
  let browser = "";
  for (const [re, name] of BROWSERS) {
    const m = s.match(re);
    if (m) {
      const v = m.slice(1).find(Boolean);
      browser = v ? `${name} ${v}` : name;
      break;
    }
  }
  const sys = SYSTEMS.find(([re]) => re.test(s));
  return {
    browser: browser || "Brauzer",
    system: sys ? sys[1] : "",
    mobile: /Mobile|Android|iPhone|iPad/.test(s),
  };
};

/*
 * Where a visitor came from, in one line: "tiktok · oktyabr · AZ". A visit with
 * no source is "birbaşa" (typed in or a bookmark); none known at all is "".
 */
export const sourceLabel = (source) => {
  if (!source) return "";
  const from = source.affiliate && source.affiliate !== "(direct)" ? source.affiliate : "birbaşa";
  return [from, source.campaign, source.country].filter(Boolean).join(" · ");
};

/* The path of a landing URL, without the host: "/register?ref=x" → "/register". */
export const landingPath = (url) => {
  const s = String(url || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s, "https://bunkermath.az");
    return u.pathname || "/";
  } catch {
    return s;
  }
};
