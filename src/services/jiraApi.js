// Talks to the local/Vercel proxy at /api/jira.

async function call(payload) {
  const res = await fetch("/api/jira", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${payload.mode}: HTTP ${res.status}${data.error ? " — " + data.error : ""}`);
  return data;
}

async function pageAll(payload, cap = 12) {
  let token = null, out = [], pages = 0;
  do {
    const data = await call({ ...payload, nextPageToken: token });
    out = out.concat(data.issues || []);
    token = data.isLast ? null : data.nextPageToken;
    pages += 1;
  } while (token && pages < cap);
  return out;
}

export const fetchAll = (mode, cap) => pageAll({ mode }, cap);
export const fetchSprintIssues = (sprintId, cap) => pageAll({ mode: "sprintIssues", sprintId }, cap);

// Single issue's status history (for the per-ticket stage breakdown).
export const fetchChangelog = (key) => call({ mode: "changelog", key });

// Fetch changelogs for a list of issue keys with limited concurrency.
export async function fetchChangelogs(keys, { concurrency = 5, onProgress } = {}) {
  const result = {};
  let i = 0, done = 0;
  async function worker() {
    while (i < keys.length) {
      const key = keys[i++];
      try { result[key] = await call({ mode: "changelog", key }); }
      catch { result[key] = { key, transitions: [] }; }
      if (onProgress) onProgress(++done, keys.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length || 1) }, worker));
  return result;
}
