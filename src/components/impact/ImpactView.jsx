import { useMemo } from "react";
import { sprintSummaries, averageSummaries, sprintCommitment, shortSprint, leadershipStartSprint } from "../../domain/metrics.js";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { DevCard } from "../sprint/DevCard.jsx";
import { ImpactStat } from "./ImpactStat.jsx";
import { SprintTrendTable } from "./SprintTrendTable.jsx";

const dt = (s) => (s ? new Date(s).toLocaleDateString("en-GB") : "—");
const msOf = (s) => (s.startDate ? new Date(s.startDate).getTime() : null);

export function ImpactView({ sprints, sprintIssuesById, sprintLoading, managerSince, mode = "points" }) {
  const firstLeadSprint = useMemo(() => leadershipStartSprint(sprints, managerSince), [sprints, managerSince]);
  const boundaryMs = useMemo(
    () => (firstLeadSprint && firstLeadSprint.startDate ? new Date(firstLeadSprint.startDate).getTime() : new Date(managerSince).getTime()),
    [firstLeadSprint, managerSince]
  );
  const summaries = useMemo(() => sprintSummaries(sprints, sprintIssuesById, boundaryMs, mode), [sprints, sprintIssuesById, boundaryMs, mode]);

  const completed = summaries.filter((s) => s.state === "closed" && s.hasDate);
  const baseline = averageSummaries(completed.filter((s) => msOf(s) < boundaryMs));
  const since = averageSummaries(completed.filter((s) => msOf(s) >= boundaryMs));
  const live = summaries.find((s) => s.state === "active");

  if (sprintLoading && !summaries.length) return <div className="banner load">Loading sprint data…</div>;
  if (!summaries.length) return <div className="banner load">No sprint data to calculate yet.</div>;

  // live sprint detail
  const liveObj = live && sprints.find((s) => s.id === live.id);
  const liveRows = liveObj && sprintIssuesById[live.id] ? sprintCommitment(sprintIssuesById[live.id], liveObj, mode) : [];
  let elapsedPct = null;
  if (live && live.startDate && live.endDate) {
    const st = new Date(live.startDate).getTime(), en = new Date(live.endDate).getTime();
    elapsedPct = en > st ? Math.max(0, Math.min(100, Math.round(((Date.now() - st) / (en - st)) * 100))) : null;
  }

  return (
    <>
      <h2 className="bigtitle">
        My Impact
        <span className="bigtitle-sub">
          {firstLeadSprint
            ? <>Measuring from {shortSprint(firstLeadSprint.name)} ({dt(firstLeadSprint.startDate)}) — your first sprint as team lead</>
            : "Waiting for an active sprint"}
        </span>
      </h2>

      <Explainer>
        <b>What's shown here:</b> a comparison of the team's state before you became team lead vs. since.
        <ul>
          <li>The boundary is set by the start of your first sprint as team lead (shown above). If leadership started mid-sprint, the sprint before it is also included in "since," so as not to cut a sprint's commitment in half.</li>
          <li><b>Baseline</b> = average of the metrics across sprints completed <u>before</u> your first sprint. <b>Since</b> = average of sprints completed from your first sprint onward (inclusive).</li>
          <li>An active (in-progress) sprint is <u>not</u> included in the averages — it's shown separately as an "in progress" card, until it closes.</li>
          <li>Once another sprint closes, the "since" side updates and the delta appears/updates.</li>
          <li>"Goal attainment" is measured per the toggle at the top of the page — Story Points or tasks completed.</li>
          <li><b>Median lead time</b> = workdays (weekends excluded) from a card's creation to its resolution — the full lifecycle, not clipped to one sprint. <b>Velocity</b> and <b>Items closed</b> are scoped to your team's roster (wherever they worked), not to a single project — so these aren't directly comparable to eazyBI's per-project Throughput Trend on the eazyBI tab, which counts everyone in that Jira project regardless of who's on your roster.</li>
        </ul>
      </Explainer>
      <Card title="Before vs. since you've been leading"
        desc={`Baseline = average of the ${baseline ? baseline.count : 0} sprints completed before you led. Since = average of ${since ? since.count : 0} sprints completed under your leadership. The current sprint is in progress and not included in the averages.`}>
        <div className="istats">
          <ImpactStat label={`Goal attainment (average · ${mode === "completion" ? "tasks completed" : "Story Points"})`} before={baseline && baseline.attainment} after={since && since.attainment} unit="%" hint="Will be measured once your first sprint ends" />
          <ImpactStat label="Velocity (SP per sprint)" before={baseline && baseline.velocity} after={since && since.velocity} hint="Will be measured once your first sprint ends" />
          <ImpactStat label="Items closed (per sprint)" before={baseline && baseline.throughput} after={since && since.throughput} hint="Will be measured once your first sprint ends" />
          <ImpactStat label="Median lead time (workdays)" before={baseline && baseline.lead} after={since && since.lead} unit="d" betterWhenLower hint="Will be measured once your first sprint ends" />
          <ImpactStat label="Bug ratio" before={baseline && baseline.bug} after={since && since.bug} unit="%" betterWhenLower hint="Will be measured once your first sprint ends" />
        </div>
        {!since && (
          <div className="estbanner ok" style={{ marginTop: 14 }}>
            <span className="estbanner-ic">i</span>
            <div>
              <b>This is your baseline</b>
              <div className="muted small">No sprint under your leadership has closed yet. Once the current sprint closes, we'll compare it to the baseline and show the delta.</div>
            </div>
          </div>
        )}
      </Card>

      {live && (
        <Card title={`Current sprint (in progress) · ${shortSprint(live.name)}`}
          desc="Partial data — updating until the end of the sprint. Not yet included in the baseline comparison.">
          <div className="kpis" style={{ marginBottom: 14 }}>
            <Kpi label="Time elapsed" value={elapsedPct != null ? `${elapsedPct}%` : "—"} hint="How much of the sprint has passed" />
            <Kpi label="Closed so far"
              value={mode === "completion" ? `${live.doneItems} / ${live.committedItems} tasks` : `${live.donePts} / ${live.committedPts} SP`}
              hint={`${live.attainment}% of commitment`} />
            <Kpi label="Items closed" value={`${live.doneItems}/${live.totalItems}`} />
            <Kpi label="Pace" value={elapsedPct != null ? (live.attainment >= elapsedPct ? "On good pace" : "Behind pace") : "—"}
              tone={elapsedPct != null ? (live.attainment >= elapsedPct ? "good" : "bad") : undefined} hint="Progress vs. time elapsed" />
          </div>
          <div className="devs">
            {liveRows.filter((r) => r.id !== "none").map((r) => <DevCard key={r.id} r={r} mode={mode} />)}
          </div>
        </Card>
      )}

      <Card title="Trend across sprints" desc="Each sprint on its own — baseline / since / current. Click a row to expand it.">
        <SprintTrendTable summaries={summaries} selectedId={live ? live.id : null} />
      </Card>
    </>
  );
}
