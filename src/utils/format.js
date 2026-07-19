// Display formatting helpers.
export const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString();

// Readable duration: hours under a day, days above (so "0.9d" -> "22h").
export function fmtDur(days) {
  if (days == null) return "—";
  if (days <= 0) return "0h";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  return `${Math.round(days * 10) / 10}d`;
}

export const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("en-GB") : "—");
