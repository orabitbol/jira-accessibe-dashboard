import { useMemo } from "react";
import { myTeam } from "../../../teams.config.js";
import { sprintCommitment, commitmentTrend, teamCommitmentSeries, stageStatsByPerson, fillMissingMembers, otherWorkByPerson, round } from "../../domain/metrics.js";
import { fmt } from "../../utils/format.js";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { DevCard } from "./DevCard.jsx";
import { CommitmentTrend } from "./CommitmentTrend.jsx";
import { PredictabilityChart } from "./PredictabilityChart.jsx";
import { StageAnalysis } from "./StageAnalysis.jsx";

export function SprintHealthView({ selectedSprint, recentSprints, issuesById, loading, stageData, stageLoading, onLoadStages, mode = "points", activeIssues, t }) {
  const issues = (selectedSprint && issuesById[selectedSprint.id]) || null;
  // Real added/removed-mid-sprint detection needs each issue's "Sprint" field
  // history — reuse whatever Stage Analysis has already loaded for THIS
  // sprint (its own lazy changelog cache) rather than fetching it again.
  // Before that button's been clicked, changelogByKey is just {} and
  // sprintCommitment falls back to its old creation-date heuristic.
  const changelogByKey = stageData && stageData.sprintId === selectedSprint?.id ? stageData.byKey : {};
  const rows = useMemo(() => (issues ? sprintCommitment(issues, selectedSprint, mode, Date.now(), myTeam.name, changelogByKey) : []), [issues, selectedSprint, mode, changelogByKey]);
  // Computed once, shared by the per-developer % trend table AND the
  // team-level committed-vs-done bar chart below — same underlying
  // per-sprint sprintCommitment() rows, two different views of them.
  const per = useMemo(
    () => recentSprints.map((s) => ({ sprint: s, rows: issuesById[s.id] ? sprintCommitment(issuesById[s.id], s, mode) : [] })),
    [recentSprints, issuesById, mode]
  );
  const trend = useMemo(() => commitmentTrend(per.filter((p) => p.rows.length)), [per]);
  const series = useMemo(() => teamCommitmentSeries(per.filter((p) => p.rows.length)), [per]);
  // Always show every declared team member — someone with zero items this
  // sprint (e.g. a manager doing less hands-on work) shouldn't just vanish.
  // NOTE: must run unconditionally (before the early returns below) — every
  // hook in this component has to fire on every render, or React throws
  // "Rendered more hooks than during the previous render".
  const displayRows = useMemo(() => fillMissingMembers(rows, myTeam.members, (m) => ({
    id: m.id, name: m.name, avatar: null,
    committedPts: 0, addedPts: 0, removedPts: 0, donePts: 0, totalPts: 0, committedItems: 0,
    totalItems: 0, doneItems: 0, carryOver: 0, addedMid: 0, removedItems: 0, noEstimate: 0,
    addedDoneItems: 0, addedDonePts: 0, reopenedItems: 0,
    openItems: [], doneList: [], lateList: [], removedList: [], addedDoneList: [], reopenedList: [], carryOverList: [],
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

  if (loading && !issues) return <div className="banner load">{t("app.loading")}</div>;
  if (!issues) return <div className="banner load">{t("trend.noData")}</div>;

  const teamCommittedPts = round(rows.reduce((a, r) => a + r.committedPts, 0), 1);
  const teamDonePts = round(rows.reduce((a, r) => a + r.donePts, 0), 1);
  const teamCommittedItems = rows.reduce((a, r) => a + r.committedItems, 0);
  const teamDoneItems = rows.reduce((a, r) => a + r.doneItems, 0);
  const isCompletion = mode === "completion";
  const teamCommitted = isCompletion ? teamCommittedItems : teamCommittedPts;
  const teamDone = isCompletion ? teamDoneItems : teamDonePts;
  const teamPct = teamCommitted ? Math.round((teamDone / teamCommitted) * 100) : 0;
  const teamUnit = isCompletion ? t("dev.unit.tasks") : t("dev.unit.sp");

  const scopedIssues = issues.filter((n) => n.fields.assignee && myTeam.members.some((m) => m.id === n.fields.assignee.accountId));
  // Lets each Stage Analysis card show the SAME on-track/at-risk/behind pill
  // as the Goal Attainment card above, so "is this person meeting the
  // standard" doesn't require scrolling up and cross-referencing by name —
  // the two sections agree because they're reading the exact same `rows`.
  const commitmentById = new Map(displayRows.map((r) => [r.id, { state: r.state, attainment: r.attainment }]));
  const stages = stageData ? fillMissingMembers(
    stageStatsByPerson(scopedIssues, stageData.byKey, selectedSprint),
    myTeam.members,
    (m) => ({ id: m.id, name: m.name, avatar: null, byStatus: {}, items: 0, excluded: [], changed: [], reopened: [], stages: [], groups: [], total: 0, cycleDays: 0, cyclePerItem: 0, excludedCount: 0, changedCount: 0, reopenedCount: 0 })
  ).map((p) => ({ ...p, otherWork: otherWork.get(p.id) || [], commitment: commitmentById.get(p.id) || null })) : null;

  return (
    <>
      <Explainer t={t}>
        <b>{t("sprint.explainer.intro")}</b>
        <ul>
          <li>{t("sprint.explainer.attainment")}</li>
          <li>{t("sprint.explainer.lateClose")}</li>
          <li>{t("sprint.explainer.committed")}</li>
          <li>{t("sprint.explainer.addedDoneCap")}</li>
          <li>{t("sprint.explainer.reopened")}</li>
          <li>{t("sprint.explainer.carryover")}</li>
          <li>{t("sprint.explainer.pace")}</li>
          <li>{t("sprint.explainer.noEstimate")}</li>
        </ul>
      </Explainer>
      <div className="kpis">
        <Kpi label={selectedSprint && selectedSprint.state === "active" ? t("sprint.kpi.progressActive") : t("sprint.kpi.progress")}
          value={`${teamPct}%`} hint={t("sprint.kpi.progressHint", { done: teamDone, committed: teamCommitted, unit: teamUnit }) + (selectedSprint && selectedSprint.state === "active" ? t("sprint.kpi.updating") : "")}
          tone={selectedSprint && selectedSprint.state === "active" ? undefined : teamPct >= 80 ? "good" : teamPct >= 50 ? undefined : "bad"}
          info={isCompletion ? t("sprint.kpi.progressInfoCompletion") : t("sprint.kpi.progressInfoPoints")} />
        <Kpi label={t("sprint.kpi.activeMembers")} value={rows.filter((r) => r.id !== "none").length} info={t("sprint.kpi.activeMembersInfo")} />
        <Kpi label={t("sprint.kpi.added")} value={fmt(rows.reduce((a, r) => a + r.addedMid, 0))} hint={t("sprint.kpi.addedHint", { sp: round(rows.reduce((a, r) => a + r.addedPts, 0), 1) })} info={t("sprint.kpi.addedInfo")} />
        <Kpi label={t("sprint.kpi.removed")} value={fmt(rows.reduce((a, r) => a + r.removedItems, 0))} hint={t("sprint.kpi.removedHint", { sp: round(rows.reduce((a, r) => a + r.removedPts, 0), 1) })} info={t("sprint.kpi.removedInfo")} />
        <Kpi label={t("sprint.kpi.carryover")} value={fmt(rows.reduce((a, r) => a + r.carryOver, 0))} hint={t("sprint.kpi.carryoverHint")} info={t("sprint.kpi.carryoverInfo")} />
        <Kpi label={t("sprint.kpi.reopened")} value={fmt(rows.reduce((a, r) => a + r.reopenedItems, 0))} hint={t("sprint.kpi.reopenedHint")} info={t("sprint.kpi.reopenedInfo")} />
      </div>

      <Card title={t("sprint.card.attainmentTitle")} desc={isCompletion ? t("sprint.card.attainmentDescCompletion") : t("sprint.card.attainmentDescPoints")}>
        <div className="devs">
          {displayRows.filter((r) => r.id !== "none").map((r) => <DevCard key={r.id} r={r} mode={mode} t={t} />)}
          {displayRows.some((r) => r.id === "none") && <DevCard r={displayRows.find((r) => r.id === "none")} mode={mode} t={t} />}
        </div>
      </Card>

      <PredictabilityChart series={series} mode={mode} t={t} />

      <CommitmentTrend trend={trend} recentSprints={recentSprints} sprintIssuesById={issuesById} mode={mode} t={t} />

      <StageAnalysis stages={stages} loading={stageLoading} onLoad={onLoadStages} sprint={selectedSprint} t={t} />
    </>
  );
}
