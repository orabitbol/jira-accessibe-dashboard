# Claude Code prompt — WE dashboard changes

Context: This is the "Widget & Engine (WE)" team-metrics dashboard — a read-only
React + Vite app that pulls from Jira. Relevant logic before you start:

- Goal-attainment ("attainment") is computed in `src/domain/metrics.js`, inside
  `sprintCommitment()`, `sprintSummaries()` and `averageSummaries()`. Today it is
  primarily STORY-POINT based: `attainment = donePts / committedPts` (falling back
  to `committedPts || totalPts`), and item-count (`doneItems / totalItems`) is used
  only as a fallback when there are no points. `MISS_THRESHOLD = 0.8`.
- Teams are defined in `teams.config.js` (`leadTeams`: `"we"` = my team,
  `"shaul"` = צוות שאול). `myTeam = leadTeams[0]` and `setActiveTeam(id)` switches
  the active team.
- Tabs are defined in `src/components/layout/Tabs.jsx`; views live under
  `src/components/` (sprint, planning, status, impact, recommendations, compare,
  trend) and are wired in `src/App.jsx`.
- Keep the domain layer (`src/domain/metrics.js`) pure (no React, no network),
  and keep the app strictly READ-ONLY to Jira (no write/JQL paths).

Please do all three tasks below, then verify.

---

## Task 1 — Add a second goal-attainment metric based on task COMPLETION

Right now attainment is judged mainly by story points. I want a second, fully
independent measure based on how many tasks were completed in the sprint,
IGNORING story points entirely:

    completionAttainment = doneItems / totalItems   (or done vs committed items)

Both measures must be computed and exposed at the same time — do NOT replace the
points-based one:

- In `sprintCommitment` / `sprintSummaries` / `averageSummaries`, return BOTH
  `pointsAttainment` (the current story-point calculation) and
  `completionAttainment` (the pure item-count calculation), plus their respective
  "met / missed / on-track" states using `MISS_THRESHOLD`.
- Keep the existing `attainment` field working (back-compat) but drive it off a
  selected mode.

Add a UI toggle (e.g. in the sprint views' filter bar / header) to switch the
displayed metric between:

  (a) "By Story Points" — attainment based only on story points, and
  (b) "By Completed Tasks" — attainment based only on # of tasks finished,
      regardless of story points.

The toggle must update every attainment number, badge, chart and the
recommendations consistently, so I can clearly see how the team looks under each
lens. Persist the choice (`usePersistentState`) so it survives reloads.

---

## Task 2 — Team default & easy switching

Make my team (the `"we"` / Or's team) the default view everywhere (it already is
`leadTeams[0]` — keep it that way and make sure nothing overrides it). Then make
switching to צוות שאול (the `"shaul"` team) as frictionless as possible: a clearly
visible team switcher in the header with the two teams, my team preselected, one
click to swap. Persist the last selected team across reloads.

---

## Task 3 — Trim the app to 5 tabs and delete all dead code

Keep ONLY these five tabs (in this order), all already labelled in Hebrew in
`src/components/layout/Tabs.jsx`:

  1. בריאות ספרינט   (id: `"sprint"`)
  2. תכנון ספרינט    (id: `"planning"`)
  3. סטטוס חי         (id: `"status"`)
  4. ההשפעה שלי       (id: `"impact"`)
  5. המלצות           (id: `"recommendations"`)

Remove the two other tabs entirely: "השוואת צוותים" (id: `"compare"`) and
"מגמת הצוות" (id: `"trend"`). That means:

- Delete them from `TABS` in `Tabs.jsx` and remove their render branches, imports
  and any related filter UI (e.g. the period/quarter `FilterBar` that only the
  compare/trend views used) from `src/App.jsx`.
- Make sure the default selected tab is one of the remaining five (בריאות ספרינט).

Then delete ALL code that is now unused as a result — do a real dead-code sweep,
don't just hide the tabs:

- Component files/folders no longer imported anywhere (e.g.
  `src/components/compare/*`, `src/components/trend/*`, and any chart/common
  components used only by them such as `CompareBar` / `TrendBars` — verify each is
  truly unreferenced before deleting).
- Functions in `src/domain/metrics.js` that nothing imports anymore (e.g.
  `teamStatsRange`, `bySprintForTeam`, quarter helpers, and any others left
  orphaned).
- Any `services/jiraApi.js` queries, `hooks/useDashboard.js` state, and
  `teams.config.js` exports (like `otherTeams` / comparison logic) that exist ONLY
  to feed the removed views — but keep anything still used by the surviving tabs
  (e.g. `teamForIssue` must stay).
- Unused imports, variables, CSS classes and helper utils left behind.

---

## Constraints & verification

- Keep the app strictly read-only to Jira — do not add any write/JQL paths.
- Keep the domain layer pure; match the existing code style and structure.
- Update `README.md` to document the new completion-based metric + toggle and the
  reduced 5-tab layout.
- After the dead-code sweep, grep the codebase to confirm every deleted symbol has
  zero remaining references.
- Run `npm run dev` to confirm it still builds and all five tabs render under both
  attainment modes and for both teams.
- Finish by summarizing exactly what changed and which files/functions you removed.
