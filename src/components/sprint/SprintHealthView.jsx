import { useMemo } from "react";
import { myTeam } from "../../../teams.config.js";
import { sprintCommitment, commitmentTrend, stageStatsByPerson, fillMissingMembers, otherWorkByPerson, round } from "../../domain/metrics.js";
import { fmt } from "../../utils/format.js";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { DevCard } from "./DevCard.jsx";
import { CommitmentTrend } from "./CommitmentTrend.jsx";
import { StageAnalysis } from "./StageAnalysis.jsx";

export function SprintHealthView({ selectedSprint, recentSprints, issuesById, loading, stageData, stageLoading, onLoadStages, mode = "points", activeIssues }) {
  const issues = (selectedSprint && issuesById[selectedSprint.id]) || null;
  const rows = useMemo(() => (issues ? sprintCommitment(issues, selectedSprint, mode) : []), [issues, selectedSprint, mode]);
  const trend = useMemo(() => {
    const per = recentSprints
      .map((s) => ({ sprint: s, rows: issuesById[s.id] ? sprintCommitment(issuesById[s.id], s, mode) : [] }))
      .filter((p) => p.rows.length);
    return commitmentTrend(per);
  }, [recentSprints, issuesById, mode]);
  // Always show every declared team member — someone with zero items this
  // sprint (e.g. a manager doing less hands-on work) shouldn't just vanish.
  // NOTE: must run unconditionally (before the early returns below) — every
  // hook in this component has to fire on every render, or React throws
  // "Rendered more hooks than during the previous render".
  const displayRows = useMemo(() => fillMissingMembers(rows, myTeam.members, (m) => ({
    id: m.id, name: m.name, avatar: null,
    committedPts: 0, addedPts: 0, donePts: 0, totalPts: 0, committedItems: 0,
    totalItems: 0, doneItems: 0, carryOver: 0, addedMid: 0, noEstimate: 0,
    openItems: [], doneList: [], lateList: [],
    pointsAttainment: 0, completionAttainment: 0, pointsState: "none", completionState: "none",
    attainment: 0, state: "none",
  })), [rows]);

  // Deliberately scoped to the ACTIVE sub-team's roster (not the whole WE
  // project) — Or's team and Shaul's team share one Jira project/board, so a
  // project-only scope (like eazyBI's per-project cycle-time reports) would
  // merge both sub-teams together and stop being a per-lead view. The
  // otherWorkByPerson() layer below covers the "does someone have work
  // outside what's being measured" concern without collapsing that split.
  // Also must run unconditionally, before the early returns — see note above.
  const scopedKeys = useMemo(
    () => (issues ? issues.filter((n) => n.fields.assignee && myTeam.members.some((m) => m.id === n.fields.assignee.accountId)).map((n) => n.key) : []),
    [issues]
  );
  const otherWork = useMemo(() => otherWorkByPerson(activeIssues, myTeam.members, scopedKeys), [activeIssues, scopedKeys]);

  if (loading && !issues) return <div className="banner load">Loading sprint data…</div>;
  if (!issues) return <div className="banner load">No data for the selected sprint.</div>;

  const teamCommittedPts = round(rows.reduce((a, r) => a + r.committedPts, 0), 1);
  const teamDonePts = round(rows.reduce((a, r) => a + r.donePts, 0), 1);
  const teamCommittedItems = rows.reduce((a, r) => a + r.committedItems, 0);
  const teamDoneItems = rows.reduce((a, r) => a + r.doneItems, 0);
  const isCompletion = mode === "completion";
  const teamCommitted = isCompletion ? teamCommittedItems : teamCommittedPts;
  const teamDone = isCompletion ? teamDoneItems : teamDonePts;
  const teamPct = teamCommitted ? Math.round((teamDone / teamCommitted) * 100) : 0;
  const teamUnit = isCompletion ? "tasks" : "SP";

  const scopedIssues = issues.filter((n) => n.fields.assignee && myTeam.members.some((m) => m.id === n.fields.assignee.accountId));
  const stages = stageData ? fillMissingMembers(
    stageStatsByPerson(scopedIssues, stageData.byKey, selectedSprint),
    myTeam.members,
    (m) => ({ id: m.id, name: m.name, avatar: null, byStatus: {}, items: 0, excluded: [], changed: [], stages: [], groups: [], total: 0, cycleDays: 0, cyclePerItem: 0, excludedCount: 0, changedCount: 0 })
  ).map((p) => ({ ...p, otherWork: otherWork.get(p.id) || [] })) : null;

  return (
    <>
      <Explainer>
        <b>What's shown here:</b> the selected sprint's state — how much each developer committed to vs. closed, and the trend across sprints.
        <ul>
          <li><b>Goal attainment (say/do)</b> is measured with two independent methods, per the toggle at the top of the page:
            <b> by Story Points</b> = SP closed <u>within</u> the sprint ÷ SP committed at planning, or
            <b> by tasks completed</b> = number of tasks closed ÷ number of tasks committed at planning (ignores Story Points entirely).</li>
          <li>An item closed after the sprint ended is not counted toward this sprint.</li>
          <li><b>Added mid-sprint</b> = an item created after the sprint started (wasn't in the plan) — not counted toward commitment.</li>
          <li><b>Carry-over</b> = an item that came from a previous sprint (was in more than one sprint).</li>
          <li>The state color (on track/at risk/behind) compares the developer's pace to the time elapsed in the sprint, per the selected method.</li>
          <li>Under the Story Points method, tasks with no estimate aren't counted toward attainment (can't measure commitment without an estimate).</li>
        </ul>
      </Explainer>
      <div className="kpis">
        <Kpi label={selectedSprint && selectedSprint.state === "active" ? "Team progress (in progress)" : "Team progress in sprint"}
          value={`${teamPct}%`} hint={`${teamDone} / ${teamCommitted} ${teamUnit} closed${selectedSprint && selectedSprint.state === "active" ? " · updating until the end" : ""}`}
          tone={selectedSprint && selectedSprint.state === "active" ? undefined : teamPct >= 80 ? "good" : teamPct >= 50 ? undefined : "bad"}
          info={isCompletion ? "Number of tasks closed in the sprint ÷ number of tasks the team committed to at planning." : "Sum of SP closed in the sprint ÷ sum of SP the team committed to at planning."} />
        <Kpi label="Active team members" value={rows.filter((r) => r.id !== "none").length} info="Number of developers with at least one item in the sprint." />
        <Kpi label="Added mid-sprint" value={fmt(rows.reduce((a, r) => a + r.addedMid, 0))} hint={`${round(rows.reduce((a, r) => a + r.addedPts, 0), 1)} SP outside the plan`} info="Items created after the sprint started — a sign of scope creep. Not counted toward commitment." />
        <Kpi label="Carry-over" value={fmt(rows.reduce((a, r) => a + r.carryOver, 0))} hint="Carried over from a previous sprint" info="Items that were already in a previous sprint and spilled over into this one." />
      </div>

      <Card title="Goal attainment by developer" desc={isCompletion ? "How many tasks were committed (at planning) vs. how many closed. Color = status vs. sprint pace." : "How many Story Points were committed (at planning) vs. how many closed. Color = status vs. sprint pace."}>
        <div className="devs">
          {displayRows.filter((r) => r.id !== "none").map((r) => <DevCard key={r.id} r={r} mode={mode} />)}
          {displayRows.some((r) => r.id === "none") && <DevCard r={displayRows.find((r) => r.id === "none")} mode={mode} />}
        </div>
      </Card>

      <CommitmentTrend trend={trend} recentSprints={recentSprints} sprintIssuesById={issuesById} mode={mode} />

      <StageAnalysis stages={stages} loading={stageLoading} onLoad={onLoadStages} sprint={selectedSprint} />
    </>
  );
}
