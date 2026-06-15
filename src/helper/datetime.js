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
