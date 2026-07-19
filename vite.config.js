import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fetchJira } from "./lib/jira-core.js";

// Local dev needs no external server and no Vercel. This plugin serves the
// read-only Jira proxy as middleware inside Vite's own dev server, reading
// credentials from .env.local. The token stays server-side (Node), never in
// the browser bundle.
function localJiraApi(env) {
  return {
    name: "local-jira-api",
    configureServer(server) {
      server.middlewares.use("/api/jira", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          let parsed = {};
          try { parsed = JSON.parse(body || "{}"); } catch { /* ignore */ }
          const r = await fetchJira({ mode: parsed.mode, nextPageToken: parsed.nextPageToken, key: parsed.key, sprintId: parsed.sprintId, env });
          res.statusCode = r.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(r.body));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load ALL vars (prefix "") from .env / .env.local so the middleware can use them.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), localJiraApi(env)],
  };
});
