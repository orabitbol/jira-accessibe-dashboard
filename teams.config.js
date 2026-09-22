// ============================================================================
//  TEAM DEFINITIONS — edit once; it persists forever (it's just code).
// ============================================================================
// There is no "Team" field in Jira, so lead-teams are defined here. You can
// switch the ACTIVE lead-team from the UI (top-left selector).
//
// Rule used everywhere:
//   1. If an issue's assignee is in the ACTIVE team's `members`, it belongs to
//      that team (so their work in other projects still counts as theirs).
//   2. Otherwise the issue belongs to the team that owns its project
//      (otherTeams, or the OTHER lead team's own project).
//   3. Anything else falls under "Other".
//
// --- 2026-08-19 · THE SPLIT ------------------------------------------------
// Until Aug 2026 both lead-teams shared one project+board: "Core Engine &
// accessWidget" (WE, board 397). On 2026-08-19 Or's team moved to its own
// project and board: "Accessibility Code Remediation" (ACR, board 2022,
// sprints named "ACR Sprint N ..."). Shaul's team stayed on WE/397.
//
// Everything Or's team did BEFORE that date still lives on board 397, so the
// team declares 397 as a LEGACY board with a cut-off date. That is what keeps
// My Impact / velocity / predictability trends continuous across the move
// instead of restarting from zero — while making sure Shaul's team's CURRENT
// WE sprints (which start after the cut-off) never leak into Or's numbers.
// ============================================================================

export const leadTeams = [
  {
    id: "acr",
    legacyIds: ["we"], // older persisted UI selections still resolve to this team
    name: "Or's team",
    projectName: "Accessibility Code Remediation",
    key: "ACR",
    boardId: 2022,
    sprintPrefix: "ACR ",
    managerSince: "2026-07-15",
    // Pre-split history: sprints on this board that STARTED before `until`.
    legacyBoards: [{ boardId: 397, projectKey: "WE", until: "2026-08-19" }],
    // eazyBI reports are per-project and were built before the split, so there
    // is no ACR cycle-time report yet. Leave null until one is created in
    // eazyBI — the eazyBI tab then says so, instead of presenting the WE
    // project's numbers (now Shaul's team) as "my team".
    eazybiReportKey: null,
    members: [
      { id: "712020:af53a181-c26f-4d2e-a129-075e2ac6d784", name: "Tali Shternfeld" },
      { id: "712020:3a2f9823-669f-4eaf-b233-d9aa563ec9e2", name: "Itay Berger" },
      { id: "712020:5a2ead05-ea51-4b48-8364-a5accab41098", name: "Noam Salem" },
      { id: "712020:a1e8e491-aa55-40cd-abed-b1b7e944b2b7", name: "Dolev Drori" },
      { id: "712020:149dcf18-49c8-4c17-87ba-f72edcbdbf0e", name: "Or Abitbol (lead)" },
    ],
  },
  {
    id: "shaul",
    name: "Shaul's team",
    projectName: "Core Engine & accessWidget",
    key: "WE",
    boardId: 397,
    sprintPrefix: "Widget Engine ",
    managerSince: "2026-06-15",
    legacyBoards: [],
    eazybiReportKey: "cycleTimeWidgetEngine",
    members: [
      { id: "712020:3de34656-5fb5-4655-8512-8290806730a3", name: "Yevgeni Aronov" },
      { id: "712020:f5f8d0f8-68c0-4f36-9a60-3bb939c2cf97", name: "Ofek Buchnik" },
      { id: "712020:83fe57ab-3e69-4b4a-a8b6-096337ab7639", name: "Ari Beck" },
      { id: "712020:83a0bfca-e517-40ba-9d3f-6be5ab3ca577", name: "Sizar Simaan" },
    ],
  },
];

// The active lead-team. Reassigned by setActiveTeam(); importers see the change
// (ES module live binding). Everything (metrics, views) reads `myTeam`.
export let myTeam = leadTeams[0];

// Maps an id (including an old/renamed one) to a team that actually exists.
// Keeps a value persisted in localStorage from before the split working.
export function resolveTeamId(id) {
  const t = leadTeams.find((x) => x.id === id || (x.legacyIds || []).includes(id));
  return (t || leadTeams[0]).id;
}
export function setActiveTeam(id) {
  const resolved = resolveTeamId(id);
  myTeam = leadTeams.find((t) => t.id === resolved) || leadTeams[0];
}

// The units the cross-team delivery comparison is drawn in: whole Jira
// PROJECTS, not rosters. That is deliberate and it is the one place in this
// dashboard that works that way — it mirrors how ops' eazyBI report counts
// ("Widget & Engine" vs "ACR"), so the two numbers can be put next to each
// other and next to the number ops circulates. The team's own card above it
// stays roster-scoped, which is the more accurate read of that team's work.
export const compareProjects = leadTeams.map((t) => ({
  teamId: t.id, key: t.key, label: t.projectName || t.key, boardId: t.boardId,
}));

// Projects owned by a lead-team (as opposed to the comparison projects).
export const leadProjects = [...new Set(leadTeams.flatMap((t) => [t.key, ...(t.legacyBoards || []).map((b) => b.projectKey)]))].filter(Boolean);

// Comparison teams — grouped by their Jira project.
export const otherTeams = [
  { name: "Apps & Scan", projectKey: "AS" },
  { name: "Portal", projectKey: "POR" },
  { name: "Data", projectKey: "DAT" },
  { name: "accessFlow", projectKey: "AC" },
];

// All projects the dashboard reads from (used to scope every Jira query).
// Includes each lead-team's legacy project, so pre-split history is fetched.
export const allProjects = [...new Set([
  ...leadTeams.flatMap((t) => [t.key, ...(t.legacyBoards || []).map((b) => b.projectKey)]),
  ...otherTeams.map((t) => t.projectKey),
])].filter(Boolean);

export const projectToTeam = Object.fromEntries(otherTeams.map((t) => [t.projectKey, t.name]));

// Which team an issue belongs to (reads the ACTIVE team dynamically).
export function teamForIssue(issue) {
  const a = issue.fields && issue.fields.assignee;
  if (a && myTeam.members.some((m) => m.id === a.accountId)) return myTeam.name;
  const pk = issue.fields && issue.fields.project && issue.fields.project.key;
  if (!pk) return "Other";
  if (projectToTeam[pk]) return projectToTeam[pk];
  // The other half of the split: an issue in the OTHER lead-team's own project,
  // not assigned to anyone on my roster, is that team's work — not "Other".
  // Never matches the active team's own project, so "is this mine?" keeps
  // meaning "is the assignee on my roster?" exactly as before.
  const other = leadTeams.find((t) => t.id !== myTeam.id && t.key === pk);
  return other ? other.name : "Other";
}

// True if a sprint belongs to the ACTIVE team — its current board, or a board
// it used to live on before a split (only sprints that started before the
// cut-off). Sprints with no known board are never filtered out.
export function sprintOnMyBoard(sp) {
  if (!sp) return false;
  if (!myTeam.boardId || sp.boardId == null) return true;
  if (sp.boardId === myTeam.boardId) return true;
  return (myTeam.legacyBoards || []).some((b) => {
    if (b.boardId !== sp.boardId) return false;
    if (!b.until) return true;
    const start = sp.startDate ? new Date(sp.startDate).getTime() : null;
    return start != null && !Number.isNaN(start) && start < new Date(b.until).getTime();
  });
}

// Strips the noisy project prefix from a sprint name. The ACTIVE team's own
// prefix is dropped entirely; another board's prefix is abbreviated instead of
// removed, so a pre-split sprint can never be mistaken for a current one
// (e.g. "WE·S4 Q3 2026" next to "S4 Q3 2026").
const SPRINT_PREFIXES = [
  ["ACR ", "ACR·"],
  ["Widget Engine ", "WE·"],
  ["Portal ", "POR·"],
  ["Apps & Scan ", "AS·"],
  ["accessFlow ", "AF·"],
];
export function stripSprintPrefix(name) {
  let s = String(name == null ? "" : name);
  const own = myTeam.sprintPrefix;
  if (own && s.toLowerCase().startsWith(own.toLowerCase())) return s.slice(own.length);
  for (const [p, abbr] of SPRINT_PREFIXES) {
    if (s.toLowerCase().startsWith(p.toLowerCase())) return abbr + s.slice(p.length);
  }
  return s;
}
