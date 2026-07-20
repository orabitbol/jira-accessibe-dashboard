// OPTIONAL — only used if you deploy to Vercel. For local development you do
// NOT need this; `npm run dev` serves the same proxy via Vite middleware.
// READ-ONLY proxy to eazyBI (see lib/eazybi-core.js).
import { fetchEazyBI } from "../lib/eazybi-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const r = await fetchEazyBI({ reportKey: body && body.reportKey, env: process.env });
  res.status(r.status).json(r.body);
}
