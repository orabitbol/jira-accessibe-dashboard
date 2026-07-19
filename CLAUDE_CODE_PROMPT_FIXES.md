# Claude Code prompt — WE dashboard fixes (round 2)

Good progress — the 5-tab layout and the Story Points / Completed Tasks toggle
look great. A few corrections:

## 1. Team names & default

There should be exactly TWO teams in the header switcher:
- **צוות אור** (Or's team) — this is the current `"we"` / "Widget & Engine" lead
  team. Rename its display name to **צוות אור**. It must be the DEFAULT team on
  load.
- **צוות שאול** (Shaul's team) — unchanged.

Update `teams.config.js` (`leadTeams[0].name` → "צוות אור") and anywhere the team
name is shown. Keep the app title "Widget & Engine · Team Metrics" as-is; only the
team switcher/labels change.

## 2. Attainment mode must apply to EVERY page

The "By Story Points" / "By Completed Tasks" toggle currently doesn't propagate to
all views. Make it a single global setting (shared state / context, persisted via
`usePersistentState`) that ALL tabs read from. When I flip it, every attainment
number, badge, chart, table and recommendation on every tab must recompute under
the selected mode — not just the Sprint Health tab.

## 3. Fix the "ההשפעה שלי" (My Impact) tab specifically

On the My Impact tab the Story Points vs Completed Tasks toggle appears to have NO
effect at all. It must respond to the mode:
- The KPI cards (עמידה ביעד, Velocity (SP), איטמים שנסגרו, Lead time, Bug ratio)
  and the before/after baseline comparison must recompute under the selected mode.
- The "מגמה לאורך הספרינטים" trend table — specifically the **עמידה ביעד** column
  and its met/missed coloring — must reflect the selected mode.
- This tab uses `sprintSummaries` / `averageSummaries` in `src/domain/metrics.js`;
  make sure they return and consume both `pointsAttainment` and
  `completionAttainment`, and that `ImpactView` / `SprintTrendTable` pick the one
  matching the active mode.

## 4. Leadership start date & which sprints count

I became team lead on **15.7.2026** (not 15.6). Update the manager/leadership
start date accordingly in `teams.config.js` (`managerSince`).

I also want **S1 Q3 2026** counted as "under my leadership", together with the
current S2 Q3 2026 — right now only S2 Q3 2026 shows as נוכחי and S1 Q3 2026 is
treated as בסיס (baseline). Adjust the sprint-inclusion rule so BOTH S1 Q3 2026 and
S2 Q3 2026 (and anything newer) fall under "my leadership", and everything before
S1 Q3 2026 is the baseline. Update the "מודדים החל מ‑…" caption and the
"הספרינט הראשון שלך כראש צוות" label to reflect S1 Q3 2026 as the first sprint.

## Verify

Run `npm run dev`, then confirm: (a) default team is צוות אור with one-click switch
to צוות שאול; (b) flipping the mode changes numbers on ALL five tabs including
My Impact; (c) the My Impact trend table shows S1 Q3 2026 and S2 Q3 2026 as
"under my leadership". Summarize what changed.
