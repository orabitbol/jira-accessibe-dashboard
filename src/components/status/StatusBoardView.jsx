import { useMemo, useState } from "react";
import { myTeam } from "../../../teams.config.js";
import { enrichBoard, STUCK_DAYS, NOT_STARTED_FLAG_DAYS } from "../../domain/metrics.js";
import { FilterBar } from "../common/FilterBar.jsx";
import { PeopleFilter } from "../common/PeopleFilter.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { PersonCard } from "./PersonCard.jsx";

export function StatusBoardView({ active }) {
  const enriched = useMemo(() => enrichBoard(active), [active]);

  // Roster = people who have work in the CURRENT (active) sprint — matches the Jira board.
  const roster = useMemo(() => {
    const m = new Map();
    for (const a of enriched) {
      if (!a.inActiveSprint) continue;
      if (!m.has(a.assigneeId)) m.set(a.assigneeId, { id: a.assigneeId, name: a.assignee, avatar: a.avatar, team: a.team, isMine: myTeam.members.some((x) => x.id === a.assigneeId), count: 0 });
      m.get(a.assigneeId).count += 1;
    }
    return [...m.values()].sort((p, q) => (q.isMine - p.isMine) || p.name.localeCompare(q.name));
  }, [enriched]);

  const myIds = useMemo(() => roster.filter((p) => p.isMine).map((p) => p.id), [roster]);
  const [sel, setSel] = useState(null);
  const effective = sel ?? new Set(myIds);

  // Build per-person groups: current-sprint items + "fell through the cracks" (in
  // progress but NOT in the active sprint) for those same people.
  const byPerson = new Map();
  for (const a of enriched) {
    if (!a.inActiveSprint || !effective.has(a.assigneeId)) continue;
    if (!byPerson.has(a.assigneeId)) byPerson.set(a.assigneeId, { name: a.assignee, avatar: a.avatar, team: a.team, items: [], stale: [] });
    byPerson.get(a.assigneeId).items.push(a);
  }
  for (const a of enriched) {
    if (a.inActiveSprint) continue;
    const p = byPerson.get(a.assigneeId);
    if (p) p.stale.push(a);
  }
  for (const p of byPerson.values()) p.stale.sort((x, y) => y.ageDays - x.ageDays);

  const groups = [...byPerson.values()].sort((p, q) =>
    (q.items.some((i) => i.delayed) - p.items.some((i) => i.delayed)) ||
    (Math.max(...q.items.map((i) => i.inCurrentDays)) - Math.max(...p.items.map((i) => i.inCurrentDays))));

  return (
    <>
      <FilterBar>
        <PeopleFilter roster={roster} selected={effective} myIds={myIds} onChange={setSel} />
        <span className="muted small">Showing the current sprint only (matches the board).</span>
      </FilterBar>

      <Explainer>
        <b>What's shown here:</b> only items in the active sprint (matching the board), for the people you selected.
        <ul>
          <li><b>Not started</b> (gray) — the item is still in To Do. Not a delay, just not picked up yet.</li>
          <li><b>At risk</b> (orange) — still in To Do with ≤ {NOT_STARTED_FLAG_DAYS} days left in the sprint, so it likely won't close in time.</li>
          <li><b>Delayed / blocked</b> (red) — one of: past the Due date, blocked by another item, stuck over {STUCK_DAYS} days <u>in a working status</u> (In Progress / Code Review / QA…), or the sprint ended and the item is still open.</li>
          <li>A plain <b>"in progress"</b> item gets no label — the status pill already shows the stage.</li>
        </ul>
        <b>"Time in each stage":</b> computed from the item's status history (changelog), and measures <b>cycle time</b> — from the moment work actually started (To Do wait time isn't included in the bar, but is shown separately).
        <br /><b>"Tasks outside the sprint":</b> open items for that same person that aren't in the current sprint — candidates for being forgotten.
        <br /><span className="muted">Thresholds are configurable in code (metrics.js): STUCK_DAYS={STUCK_DAYS}, NOT_STARTED_FLAG_DAYS={NOT_STARTED_FLAG_DAYS}.</span>
      </Explainer>
      {!groups.length && <div className="banner load">No items currently in the active sprint for the selected scope.</div>}
      <div className="people">
        {groups.map((p) => <PersonCard key={p.name} person={p} />)}
      </div>
    </>
  );
}
