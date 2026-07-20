// Talks to the local/Vercel proxy at /api/eazybi.

export async function fetchEazyBiReport(reportKey) {
  const res = await fetch("/api/eazybi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${reportKey}: HTTP ${res.status}${data.error ? " — " + data.error : ""}`);
  return data;
}
