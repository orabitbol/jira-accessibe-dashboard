// Shared, environment-agnostic eazyBI proxy logic (READ-ONLY).
// Mirrors lib/jira-core.js: used by the local Vite dev middleware
// (vite.config.js) and the optional Vercel function (api/eazybi.js).
//
// eazyBI is a separate BI app installed on top of the same Jira Cloud site.
// It has its own "report results export" endpoint, but re-uses the exact same
// Atlassian identity: email + API token (Basic Auth) — no separate eazyBI
// token needed, as long as that user has access to the eazyBI account.
// Docs: https://docs.eazybi.com/eazybi/set-up-and-administer/customization/report-results-export-api

// Whitelisted reports only — the browser picks one by key, never a raw ID.
const REPORTS = {
  throughputTrend: { accountId: 263944, reportId: 5346458, label: "Throughput Trend" },
  deliverySpeed: { accountId: 263944, reportId: 5346413, label: "Delivery Speed & Predictability Trend" },
  workflowDistribution: { accountId: 263944, reportId: 5346383, label: "Workflow Distribution" },
  cycleTimeWidgetEngine: { accountId: 263944, reportId: 5348648, label: "Core Engine & accessWidget" },
  cycleTimePortal: { accountId: 263944, reportId: 5348572, label: "Portal" },
  cycleTimeAppsScan: { accountId: 263944, reportId: 5348620, label: "Apps & Scan" },
  cycleTimeAccessFlow: { accountId: 263944, reportId: 5348533, label: "accessFlow" },
};

export const REPORT_KEYS = Object.keys(REPORTS);

// Returns { status, body }.
export async function fetchEazyBI({ reportKey, env }) {
  if (!env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    return { status: 500, body: { error: "Missing JIRA_EMAIL / JIRA_API_TOKEN. Set them in .env.local" } };
  }
  const report = REPORTS[reportKey];
  if (!report) return { status: 400, body: { error: `Unknown eazyBI report "${reportKey}".` } };

  const auth = "Basic " + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
  const url = `https://aod.eazybi.com/accounts/${report.accountId}/export/report/${report.reportId}.json`;
  try {
    const r = await fetch(url, { method: "GET", headers: { Authorization: auth, Accept: "application/json" } });
    const text = await r.text();
    if (!r.ok) return { status: r.status, body: { error: `eazyBI ${r.status}`, detail: text.slice(0, 300) } };
    const data = JSON.parse(text);
    return { status: 200, body: { key: reportKey, label: report.label, ...data } };
  } catch (e) {
    return { status: 502, body: { error: "Failed to reach eazyBI", detail: String(e && e.message ? e.message : e) } };
  }
}
