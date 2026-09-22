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
  const { tab, setTab, phase, error, base, updatedAt, reload, t } = d;

  return (
    <div className="wrap">
      <Header updatedAt={updatedAt} loading={phase === "loading"} onReload={reload}
        leadTeams={d.leadTeams} activeTeamId={d.activeTeamId} onTeamChange={d.setActiveTeamId} projectTitle={d.projectTitle}
        attainmentMode={d.attainmentMode} onAttainmentModeChange={d.setAttainmentMode}
        lang={d.lang} onLangChange={d.setLang} t={t} />
      <Tabs tab={tab} onChange={setTab} t={t} />

      {phase === "loading" && <div className="banner load">{t("app.loadingData")}</div>}
      {phase === "error" && <div className="banner err">{t("app.error")}: {error}</div>}

      {phase === "ready" && base && (
        <>
          {error && <div className="banner err">{t("app.errorLoading")}: {error} — {t("app.errorRestartHint")} <code>npm run dev</code>.</div>}

          {(tab === "sprint" || tab === "status") && (
            <FilterBar>
              <label>{t("app.sprintLabel")}</label>
              <select value={d.sprintId ?? ""} onChange={(e) => d.setSprintId(Number(e.target.value))}>
                {d.sprints.slice().reverse().map((s) => (
                  <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? ` ${t("app.current")}` : ""}</option>
                ))}
              </select>
              {d.selectedSprint && <SprintMeta s={d.selectedSprint} t={t} />}
            </FilterBar>
          )}

          {(tab === "sprint" || tab === "status") && d.selectedSprint && (
            <SprintClock sprint={d.selectedSprint} t={t} title={`${tab === "sprint" ? t("tabs.sprint") : t("tabs.status")} · ${shortSprint(d.selectedSprint.name)}`} />
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
              t={t}
            />
          )}
          {tab === "planning" && (
            <>
              {d.openLoading && !d.openData && <div className="banner load">{t("app.loadingTickets")}</div>}
              {d.openData && !d.planSprints.length && <div className="banner load">{t("app.noFutureSprints")}</div>}
              {d.openData && d.planSprints.length > 0 && (() => {
                const ps = d.planSprints.find((s) => s.id === d.planSprintId) || d.planSprints[0];
                return (
                  <>
                    <FilterBar>
                      <label>{t("app.sprintLabel")}</label>
                      <select value={d.planSprintId ?? ""} onChange={(e) => d.setPlanSprintId(Number(e.target.value))}>
                        {d.planSprints.map((s) => (
                          <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? ` ${t("app.current")}` : ` ${t("app.future")}`}</option>
                        ))}
                      </select>
                      {ps && <SprintMeta s={ps} t={t} />}
                    </FilterBar>
                    <h2 className="bigtitle">{t("app.sprintPlanning")} · {shortSprint(ps.name)}
                      <span className="bigtitle-sub">{ps.state === "active" ? t("app.currentSprint") : t("app.futureSprint")}</span>
                    </h2>
                    <PlanningView rows={planningRows(d.openData, ps.id)} />
                  </>
                );
              })()}
            </>
          )}
        </>
      )}

      {phase === "ready" && <div className="glossary-wrap"><Glossary t={t} /></div>}

      <footer className="muted small">
        {t("app.footer")}
      </footer>
    </div>
  );
}
