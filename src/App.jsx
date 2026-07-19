import { useDashboard } from "./hooks/useDashboard.js";
import { shortSprint } from "./domain/metrics.js";
import { planningRows } from "./domain/metrics.js";
import { Header } from "./components/layout/Header.jsx";
import { Tabs } from "./components/layout/Tabs.jsx";
import { FilterBar } from "./components/common/FilterBar.jsx";
import { SprintMeta } from "./components/common/SprintMeta.jsx";
import { StatusBoardView } from "./components/status/StatusBoardView.jsx";
import { PlanningView } from "./components/planning/PlanningView.jsx";
import { SprintHealthView } from "./components/sprint/SprintHealthView.jsx";
import { ImpactView } from "./components/impact/ImpactView.jsx";
import { RecommendationsView } from "./components/recommendations/RecommendationsView.jsx";
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

      {phase === "loading" && <div className="banner load">טוען נתונים מ‑Jira…</div>}
      {phase === "error" && <div className="banner err">שגיאה: {error}</div>}

      {phase === "ready" && base && (
        <>
          {error && <div className="banner err">שגיאה בטעינה: {error} — אם שינית קוד, נסה להריץ מחדש <code>npm run dev</code>.</div>}

          {(tab === "sprint" || tab === "status") && (
            <FilterBar>
              <label>ספרינט:</label>
              <select value={d.sprintId ?? ""} onChange={(e) => d.setSprintId(Number(e.target.value))}>
                {d.sprints.slice().reverse().map((s) => (
                  <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? " (נוכחי)" : ""}</option>
                ))}
              </select>
              {d.selectedSprint && <SprintMeta s={d.selectedSprint} />}
            </FilterBar>
          )}

          {(tab === "sprint" || tab === "status") && d.selectedSprint && (
            <h2 className="bigtitle">
              {tab === "sprint" ? "בריאות ספרינט" : "סטטוס חי"} · {shortSprint(d.selectedSprint.name)}
              <span className="bigtitle-sub"><SprintMeta s={d.selectedSprint} /></span>
            </h2>
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
            />
          )}
          {tab === "planning" && (
            <>
              {d.openLoading && !d.openData && <div className="banner load">טוען כרטיסיות מ‑Jira…</div>}
              {d.openData && !d.planSprints.length && <div className="banner load">לא נמצאו ספרינטים נוכחיים/עתידיים עם כרטיסיות משויכות.</div>}
              {d.openData && d.planSprints.length > 0 && (() => {
                const ps = d.planSprints.find((s) => s.id === d.planSprintId) || d.planSprints[0];
                return (
                  <>
                    <FilterBar>
                      <label>ספרינט:</label>
                      <select value={d.planSprintId ?? ""} onChange={(e) => d.setPlanSprintId(Number(e.target.value))}>
                        {d.planSprints.map((s) => (
                          <option key={s.id} value={s.id}>{shortSprint(s.name)}{s.state === "active" ? " (נוכחי)" : " (עתידי)"}</option>
                        ))}
                      </select>
                      {ps && <SprintMeta s={ps} />}
                    </FilterBar>
                    <h2 className="bigtitle">תכנון ספרינט · {shortSprint(ps.name)}
                      <span className="bigtitle-sub">{ps.state === "active" ? "ספרינט נוכחי" : "ספרינט עתידי"}</span>
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
        מקור: Jira (קריאה בלבד). צוות לפי teams.config.js; שאר הצוותים לפי פרויקט. Story Points = ההערכה של המפתח.
        "עמידה ביעד" נמדדת לפי הבורר בראש הדף: <b>Story Points</b> (SP שנסגרו ÷ SP שהיו בספרינט בתכנון) או <b>משימות שהושלמו</b>
        (מספר המשימות שנסגרו ÷ מספר המשימות שהיו בתכנון, ללא קשר ל‑Story Points). משימות שנוספו באמצע מסומנות בנפרד ולא נספרות
        בהתחייבות. עיכוב = עבר היעד / תקוע מעל 5 ימים / חסום. ניתוח שלבים נטען לפי דרישה מ‑changelog (רק הצוות שלך בספרינט הנבחר).
      </footer>
    </div>
  );
}
