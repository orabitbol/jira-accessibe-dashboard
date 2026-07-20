// ============================================================================
//  TEAM DEFINITIONS — edit once; it persists forever (it's just code).
// ============================================================================
// There is no "Team" field in Jira, so lead-teams are defined here. You can
// switch the ACTIVE lead-team from the UI (top-left selector).
//
// Rule used everywhere:
//   1. If an issue's assignee is in the ACTIVE team's `members`, it belongs to
//      that team (so their work in other projects still counts as theirs).
//   2. Otherwise the issue belongs to the team that owns its project (otherTeams).
//   3. Anything else falls under "Other".
//
// Members seeded from the boards/filters the Jira admin created (filters 15240
// for Widget & Engine, 15306 for Shaul's team).
// ============================================================================

export const leadTeams = [
  {
    id: "we",
    name: "Or's team",
    key: "WE",
    boardId: 397,
    managerSince: "2026-07-15",
    members: [
      { id: "712020:af53a181-c26f-4d2e-a129-075e2ac6d784", name: "Tali Shternfeld" },
      { id: "712020:3a2f9823-669f-4eaf-b233-d9aa563ec9e2", name: "Itay Berger" },
      { id: "712020:5a2ead05-ea51-4b48-8364-a5accab41098", name: "Noam Salem" },
      { id: "712020:149dcf18-49c8-4c17-87ba-f72edcbdbf0e", name: "Or Abitbol (lead)" },
    ],
  },
  {
    id: "shaul",
    name: "Shaul's team",
    key: "WE",
    boardId: 397,
    managerSince: "2026-06-15",
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
export function setActiveTeam(id) {
  myTeam = leadTeams.find((t) => t.id === id) || leadTeams[0];
}

// Comparison teams — grouped by their Jira project.
export const otherTeams = [
  { name: "Apps & Scan", projectKey: "AS" },
  { name: "Portal", projectKey: "POR" },
  { name: "Data", projectKey: "DAT" },
  { name: "accessFlow", projectKey: "AC" },
];

// All projects the dashboard reads from (used to scope every Jira query).
export const allProjects = [...new Set([...leadTeams.map((t) => t.key), ...otherTeams.map((t) => t.projectKey)])];

export const projectToTeam = Object.fromEntries(otherTeams.map((t) => [t.projectKey, t.name]));

// Which team an issue belongs to (reads the ACTIVE team dynamically).
export function teamForIssue(issue) {
  const a = issue.fields && issue.fields.assignee;
  if (a && myTeam.members.some((m) => m.id === a.accountId)) return myTeam.name;
  const pk = issue.fields && issue.fields.project && issue.fields.project.key;
  return projectToTeam[pk] || "Other";
}
