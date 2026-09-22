# Team Metrics Dashboard

A small, self-contained **React + Vite** dashboard for Or's team — the
*Accessibility Code Remediation* (**ACR**, board 2022) Jira project — with
Shaul's team (*Core Engine & accessWidget*, **WE**, board 397) selectable from
the same header. It pulls data from Jira **read-only** and shows sprint health,
planning, live status, leadership-impact, and rule-based recommendations. It
never writes anything back to Jira.

## The 2026-08-19 split

Both teams used to share the WE project and board 397. On 2026-08-19 Or's team
moved to its own ACR project + board (sprints now read `ACR Sprint N …`).
Everything before that date still lives on board 397, so `teams.config.js`
declares 397 as a **legacy board** for Or's team, with a cut-off date:

- sprints on board 397 that **started before** 2026-08-19 → still counted as
  Or's team history (trends, velocity, My Impact stay continuous);
- sprints on 397 that started after → Shaul's team's, never mixed in;
- pre-split sprint labels are shown abbreviated (`WE·S4 Q3 2026`) so they can't
  be confused with a current `S4 Q3 2026`.

Changing team → project/board membership is a one-file edit in
`teams.config.js`; nothing else hard-codes a project key or board id.

## What it shows (5 tabs)

- **בריאות ספרינט (Sprint health)** — per-developer commitment vs. delivery for
  the selected sprint, a multi-sprint commitment matrix with recurring-miss
  detection, and on-demand per-status time analysis (from the Jira changelog).
- **תכנון ספרינט (Planning)** — every ticket already assigned to the current or
  a future sprint, so you can spot missing Story-Point estimates ahead of
  planning.
- **סטטוס חי (Status board)** — everyone currently in progress: their current
  task, status, days in status, days remaining (by Due date, else sprint end),
  and a red flag with reasons when something is delayed (overdue / stuck /
  blocked).
- **ההשפעה שלי (My impact)** — before/after comparison of team metrics, split
  at the date you became lead: attainment, velocity, throughput, lead time,
  bug ratio.
- **המלצות (Recommendations)** — transparent, rule-based suggestions (missing
  estimates, recurring misses, over-commitment, scope creep, bug load, stuck
  items), each with the evidence behind it.

## Goal-attainment: two independent lenses

"Goal attainment" (say/do) can be judged two different ways, and the dashboard
computes **both, always** — nothing is dropped, one is just selected for
display:

- **לפי Story Points** — `SP done ÷ SP committed` (the classic effort-weighted
  measure).
- **לפי משימות שהושלמו** — `tasks done ÷ tasks committed`, which **ignores
  Story Points entirely** and just counts finished tickets.

A toggle in the header (next to the team switcher) switches which lens drives
every attainment number, badge, chart, and recommendation across the app —
Sprint Health, My Impact, and Recommendations. The choice is persisted
(`localStorage`) so it survives a reload. See `sprintCommitment` /
`sprintSummaries` / `averageSummaries` in `src/domain/metrics.js`, which
return `pointsAttainment` + `completionAttainment` (and matching `state`s)
side by side, with the back-compat `attainment`/`state` fields driven by
whichever mode is selected.

## Teams

There is no "Team" field in Jira, so teams are defined once in
**`teams.config.js`**: your team (`"we"`) and צוות שאול (`"shaul"`) are each a
list of people (seeded from the boards your admin created); any work a
teammate does in another project still counts as their team's. A segmented
switcher in the header (your team preselected) swaps the active team in one
click, reloading all data for the newly selected team; the choice is persisted
across reloads. Edit `teams.config.js` to adjust membership — it persists
forever. Other Jira projects are still mapped to their own team name (via
`otherTeams`/`projectToTeam`) purely so the Status board can label cross-team
assignees correctly.

## How it stays safe (read-only)

- The Atlassian **API token lives only on the server** (a Vercel serverless
  function in `api/jira.js`), never in the browser bundle.
- The browser cannot run arbitrary JQL — it only asks for one of a handful of
  named, hard-coded queries, all scoped to the configured projects.
- The only Jira endpoint ever called is the **search** endpoint, so the app
  physically cannot create, edit, or delete anything in Jira.

## Configure

Create an Atlassian API token: https://id.atlassian.com/manage-profile/security/api-tokens

Set these environment variables (locally in `.env.local`, and in Vercel under
**Project Settings → Environment Variables**):

| Variable          | Example                                |
|-------------------|----------------------------------------|
| `JIRA_BASE_URL`   | `https://accessibe-org.atlassian.net`  |
| `JIRA_EMAIL`      | `orab@accessibe.com`                   |
| `JIRA_API_TOKEN`  | *(your token — keep secret)*           |
| `JIRA_PROJECT_KEY`| `ACR` *(informational — real scope is `teams.config.js`)* |

See `.env.example`.

## Run locally (no Vercel needed)

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

The Jira proxy runs as middleware **inside the Vite dev server** (see
`vite.config.js` → `localJiraApi`), reading credentials from `.env.local`. The
token stays server-side and is never sent to the browser. No Vercel CLI, no
extra terminal, no separate backend.

## Deploy to Vercel (optional)

```bash
vercel            # first deploy / link the project
vercel --prod     # production deploy
```

Or connect the Git repo in the Vercel dashboard. Remember to add the four
environment variables before the first deploy.

## Project structure

```
teams.config.js          # team definitions (shared by client + server)
lib/jira-core.js         # read-only Jira proxy logic (used by dev middleware + Vercel fn)
api/jira.js              # Vercel serverless entry (optional deploy)
vite.config.js           # dev server + local Jira proxy middleware
src/
  main.jsx               # React entry
  App.jsx                # thin shell: composes layout + views
  styles.css
  services/jiraApi.js    # client API layer (fetch, pagination, changelogs)
  domain/
    metrics.js           # pure domain logic (no React, no network) — unit-testable
    recommendations.js   # rule-based recommendation engine
  hooks/
    useDashboard.js      # state + data orchestration for the whole app
    useOutsideClick.js
  utils/                 # format + label helpers
  components/
    layout/          Header (team switcher + attainment-mode toggle), Tabs
    common/          Card, Kpi, FilterBar, SprintMeta, PeopleFilter, Glossary, Explainer
    charts/          StageBar (+ tooltip/legend)
    sprint/          SprintHealthView, DevCard, CommitmentTrend, StageAnalysis
    planning/        PlanningView, EstimationBanner, TicketList
    status/          StatusBoardView, PersonCard, TaskCard, TicketStages
    impact/          ImpactView, ImpactStat, SprintTrendTable
    recommendations/ RecommendationsView, RecommendationCard
```

Separation of concerns: **domain** (pure calculations) ← **services** (network) ← **hooks**
(state/orchestration) ← **components** (presentation, one component per file).

## Customize

- **Different project / board:** edit `teams.config.js` — `key`, `boardId`,
  `sprintPrefix`, `members`, and `legacyBoards` for anything the team used to
  live on. `JIRA_PROJECT_KEY` in the env is informational only; the projects
  actually queried are derived from `allProjects` in that file.
- **eazyBI:** its reports are per Jira project and hard-coded by id in
  `lib/eazybi-core.js`. A team with no report of its own sets
  `eazybiReportKey: null` and the eazyBI tab says so rather than labelling
  another project's numbers "your team".
- **Different story-points field:** this Jira instance uses `customfield_10032`
  (falling back to `customfield_10016`). Other instances may differ — adjust
  in `lib/jira-core.js` and `src/domain/metrics.js`.
- **Recent-sprint window:** see `slice(-6)` / `slice(Math.max(0, upto - 5), upto)`
  in `src/hooks/useDashboard.js`.
