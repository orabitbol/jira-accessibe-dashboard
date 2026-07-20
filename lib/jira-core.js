// Shared, environment-agnostic Jira proxy logic (READ-ONLY).
// Used by the local Vite dev middleware (vite.config.js) and the optional
// Vercel function (api/jira.js). Only ever calls Jira's search + read endpoints;
// it physically cannot create, edit, or delete anything.

import { allProjects, myTeam } from "../teams.config.js";

const projectClause = allProjects.map((p) => `"${p}"`).join(", ");

// Fields reused across queries.
// Two story-point fields exist in this Jira: customfield_10032 ("Story Points",
// the one shown on the card and used by the team) and customfield_10016
// ("Story point estimate"). We fetch both and prefer 10032 (see domain/metrics).
const TREND_FIELDS = ["assignee", "issuetype", "created", "resolutiondate", "customfield_10016", "customfield_10032", "customfield_10020", "project", "status"];
const BOARD_FIELDS = ["assignee", "issuetype", "status", "statuscategorychangedate", "created", "resolutiondate", "updated", "duedate", "customfield_10016", "customfield_10032", "customfield_10020", "priority", "project", "summary", "issuelinks"];

// Whitelisted, hard-coded JQL queries. The browser only picks one by name.
const QUERIES = {
  // Completed work across all teams over a wide window — feeds my-team sprint
  // detection, the recurring-miss/bug-ratio recommendations, and My Impact.
  resolved: {
    jql: `project in (${projectClause}) AND resolutiondate >= -160d AND issuetype not in (Epic, Sub-task) ORDER BY resolutiondate ASC`,
    fields: TREND_FIELDS,
  },
  // Everything currently in progress across all teams (status board "all teams").
  active: {
    jql: `project in (${projectClause}) AND statusCategory = "In Progress" ORDER BY updated DESC`,
    fields: BOARD_FIELDS,
  },
  // All open bugs across all teams (stability KPI).
  openBugs: {
    jql: `project in (${projectClause}) AND issuetype = Bug AND statusCategory != Done`,
    fields: ["assignee", "priority", "created", "project"],
  },
  // Open items in MY team's project that are assigned to a sprint — surfaces
  // FUTURE sprints (their tickets sit in To Do, so they don't show up in
  // resolved/active). Scoped to one project to stay light. Used by Planning.
  open: {
    jql: `project = "${myTeam.key}" AND statusCategory != Done AND sprint is not EMPTY ORDER BY updated DESC`,
    fields: ["assignee", "issuetype", "status", "customfield_10016", "customfield_10032", "customfield_10020", "project", "summary", "priority", "duedate", "created"],
  },
};

function creds(env) {
  return {
    baseUrl: env.JIRA_BASE_URL,
    auth: "Basic " + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64"),
  };
}

async function jiraGet(baseUrl, auth, path) {
  const r = await fetch(`${baseUrl}${path}`, { method: "GET", headers: { Authorization: auth, Accept: "application/json" } });
  return { ok: r.ok, status: r.status, text: await r.text() };
}

async function searchJql(baseUrl, auth, jql, fields, nextPageToken) {
  const payload = { jql, fields, maxResults: 100 };
  if (nextPageToken) payload.nextPageToken = nextPageToken;
  const r = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  if (!r.ok) return { status: r.status, body: { error: `Jira ${r.status}`, detail: text.slice(0, 400) } };
  const data = JSON.parse(text);
  const issues = (data.issues || []).map((i) => ({ ...i, webUrl: `${baseUrl}/browse/${i.key}` }));
  return { status: 200, body: { issues, nextPageToken: data.nextPageToken || null, isLast: data.isLast !== undefined ? data.isLast : !data.nextPageToken } };
}

// Returns { status, body }.
export async function fetchJira({ mode, nextPageToken, key, sprintId, env }) {
  if (!env.JIRA_BASE_URL || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    return { status: 500, body: { error: "Missing JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN. Set them in .env.local" } };
  }
  const { baseUrl, auth } = creds(env);

  // ---- per-issue changelog (status history) — used lazily, scoped ----
  // Also mines the SAME payload for assignee / story-point / summary /
  // description changes, so "was this task reassigned or re-scoped
  // mid-sprint?" costs zero extra Jira calls.
  if (mode === "changelog") {
    if (!key || !/^[A-Z][A-Z0-9]+-\d+$/.test(key)) return { status: 400, body: { error: `Invalid issue key "${key}".` } };
    try {
      const r = await jiraGet(baseUrl, auth, `/rest/api/3/issue/${key}?fields=status&expand=changelog`);
      if (!r.ok) return { status: r.status, body: { error: `Jira ${r.status}`, detail: r.text.slice(0, 300) } };
      const data = JSON.parse(r.text);
      const transitions = [];
      const reassignments = [];
      const pointsChanges = [];
      const contentChanges = [];
      const trunc = (s) => (typeof s === "string" && s.length > 300 ? s.slice(0, 300) + "…" : s);
      for (const h of (data.changelog && data.changelog.histories) || []) {
        for (const it of h.items || []) {
          if (it.field === "status") transitions.push({ at: h.created, from: it.fromString, to: it.toString });
          else if (it.field === "assignee") {
            // Only count a REAL hand-off between two people (both from/to
            // present). Ticket creation always logs an "unassigned -> first
            // assignee" event — that's not a mid-sprint reassignment, it's
            // just triage, and counting it made almost every ticket look
            // "changed" the moment it was ever assigned to anyone.
            if (it.from && it.to) {
              reassignments.push({ at: h.created, fromId: it.from, fromName: it.fromString || "Unassigned", toId: it.to, toName: it.toString || "Unassigned" });
            }
          } else if (it.field === "Story Points" || it.field === "Story point estimate") {
            pointsChanges.push({ at: h.created, field: it.field, from: it.fromString, to: it.toString });
          } else if (it.field === "summary" || it.field === "description") {
            contentChanges.push({ at: h.created, field: it.field, from: trunc(it.fromString), to: trunc(it.toString) });
          }
        }
      }
      return {
        status: 200,
        body: { key, currentStatus: data.fields && data.fields.status && data.fields.status.name, transitions, reassignments, pointsChanges, contentChanges },
      };
    } catch (e) {
      return { status: 502, body: { error: "changelog fetch failed", detail: String(e && e.message ? e.message : e) } };
    }
  }

  // ---- all issues in a given sprint (commitment / sprint health) ----
  if (mode === "sprintIssues") {
    if (!sprintId || !/^\d+$/.test(String(sprintId))) return { status: 400, body: { error: `Invalid sprintId "${sprintId}".` } };
    const jql = `sprint = ${sprintId} AND issuetype not in (Epic, Sub-task) ORDER BY status ASC`;
    try { return await searchJql(baseUrl, auth, jql, BOARD_FIELDS, nextPageToken); }
    catch (e) { return { status: 502, body: { error: "Failed to reach Jira", detail: String(e && e.message ? e.message : e) } }; }
  }

  // ---- whitelisted JQL search modes ----
  const q = QUERIES[mode];
  if (!q) return { status: 400, body: { error: `Unknown mode "${mode}".` } };
  try { return await searchJql(baseUrl, auth, q.jql, q.fields, nextPageToken); }
  catch (e) { return { status: 502, body: { error: "Failed to reach Jira", detail: String(e && e.message ? e.message : e) } }; }
}
