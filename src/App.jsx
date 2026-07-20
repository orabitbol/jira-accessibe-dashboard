import { useDashboard } from "./hooks/useDashboard.js";
import { shortSprint } from "./domain/metrics.js";
import { planningRows } from "./domain/metrics.js";
import { Header } from "./components/layout/Header.jsx";
import { Tabs } from "./components/layout/Tabs.jsx";
import { FilterBar } from "./components/common/FilterBar.jsx";
import { SprintMeta } from "./components/common/SprintMeta.jsx";
import { SprintClock } from "./components/common/SprintClock.jsx";
import { StatusBoardView } from "./components/status/StatusBoardView.jsx";
import { PlanningView } from "./components/planning/PlanningView.jsx";
import { SprintHealthView } from "./components/sprint/SprintHealthView.jsx";
import { ImpactView } from "./components/impact/ImpactView.jsx";
import { RecommendationsView } from "./components/recommendations/RecommendationsView.jsx";
import { EazyBiView } from "./components/eazybi/EazyBiView.jsx";
import { Glossary } from "./components/common/Glossary.jsx";

export default function App() {
  const d = useDashboard();
  const { tab, setTab, phase, error, base, updatedAt, reload } = d;

  return (
    <div className="wrap">
      <Header updatedAt={updatedAt} loading={phase === "loading"} onReload={reload}
        leadTeams={d.leadTeams} activeTeamId={d.activeTeamId} onTeamChange={d.setActiveTeamId}
        attainmentMode={d.attainmentMode} onAttainmentModeChange={d.setAttainmentMode} />
      <Tabs tab={tab} onChange={setTab} />

      {phase === "loading" && <div className="banner load">Loading data from Jira…</div>}
      {phase === "error" && <div className="banner err">Error: {error}</div>}

      {phase === "ready" && base && (
        <>
          {error && <div className="banner err">Error loading: {error} — if you changed code, try restarting <code>npm run dev</code>.</div>}

          {(tab === "sprint" || tab === "status") && (
            <FilterBar>
              <label>Sprint:</label>
              <select value={d.sprintId ?? ""} onChange={(e) => d.setSprintId(Number(e.target.value))}>
                {d.sprints.slice().reverse().map((s) => (
                  <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? " (current)" : ""}</option>
                ))}
              </select>
              {d.selectedSprint && <SprintMeta s={d.selectedSprint} />}
            </FilterBar>
          )}

          {(tab === "sprint" || tab === "status") && d.selectedSprint && (
            <SprintClock sprint={d.selectedSprint} title={`${tab === "sprint" ? "Sprint Health" : "Live Status"} · ${shortSprint(d.selectedSprint.name)}`} />
          )}

          {tab === "impact" && (
            <ImpactView
              sprints={d.sprints}
              sprintIssuesById={d.sprintIssuesById}
              sprintLoading={d.sprintLoading}
              managerSince={d.managerSince}
              mode={d.attainmentMode}
            />
          )}
          {tab === "recommendations" && (
            <RecommendationsView
              base={base}
              openData={d.openData}
              sprintIssuesById={d.sprintIssuesById}
              recentSprints={d.recentSprints}
              loading={d.sprintLoading || d.openLoading}
              mode={d.attainmentMode}
            />
          )}
          {tab === "status" && <StatusBoardView active={base.active} />}
          {tab === "eazybi" && <EazyBiView />}
          {tab === "sprint" && (
            <SprintHealthView
              selectedSprint={d.selectedSprint}
              recentSprints={d.recentSprints}
              issuesById={d.sprintIssuesById}
              loading={d.sprintLoading}
              stageData={d.stageData}
              stageLoading={d.stageLoading}
              onLoadStages={d.loadStages}
              mode={d.attainmentMode}
              activeIssues={base.active}
            />
          )}
          {tab === "planning" && (
            <>
              {d.openLoading && !d.openData && <div className="banner load">Loading tickets from Jira…</div>}
              {d.openData && !d.planSprints.length && <div className="banner load">No current/future sprints with assigned tickets found.</div>}
              {d.openData && d.planSprints.length > 0 && (() => {
                const ps = d.planSprints.find((s) => s.id === d.planSprintId) || d.planSprints[0];
                return (
                  <>
                    <FilterBar>
                      <label>Sprint:</label>
                      <select value={d.planSprintId ?? ""} onChange={(e) => d.setPlanSprintId(Number(e.target.value))}>
                        {d.planSprints.map((s) => (
                          <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? " (current)" : " (future)"}</option>
                        ))}
                      </select>
                      {ps && <SprintMeta s={ps} />}
                    </FilterBar>
                    <h2 className="bigtitle">Sprint Planning · {shortSprint(ps.name)}
                      <span className="bigtitle-sub">{ps.state === "active" ? "Current sprint" : "Future sprint"}</span>
                    </h2>
                    <PlanningView rows={planningRows(d.openData, ps.id)} />
                  </>
                );
              })()}
            </>
          )}
        </>
      )}

      {phase === "ready" && <div className="glossary-wrap"><Glossary /></div>}

      <footer className="muted small">
        Source: Jira (read-only). Team per teams.config.js; other teams grouped by project. Story Points = the developer's own estimate.
        "Goal attainment" is measured per the toggle at the top of the page: <b>Story Points</b> (SP closed ÷ SP committed at planning) or <b>tasks completed</b>
        (number of tasks closed ÷ number of tasks committed at planning, regardless of Story Points). Tasks added mid-sprint are flagged separately and not counted
        toward commitment. Delayed = past due / stuck over 5 days / blocked. Stage analysis is loaded on demand from the changelog (only your team, in the selected sprint).
      </footer>
    </div>
  );
}
