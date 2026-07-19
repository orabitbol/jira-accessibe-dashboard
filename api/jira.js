// OPTIONAL — only used if you deploy to Vercel. For local development you do
// NOT need this; `npm run dev` serves the same proxy via Vite middleware.
// READ-ONLY proxy to Jira (see lib/jira-core.js).
import { fetchJira } from "../lib/jira-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const r = await fetchJira({
    mode: body && body.mode,
    nextPageToken: body && body.nextPageToken,
    key: body && body.key,
    sprintId: body && body.sprintId,
    env: process.env,
  });
  res.status(r.status).json(r.body);
}
