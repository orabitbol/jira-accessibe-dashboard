import { useMemo } from "react";
import { myTeam } from "../../../teams.config.js";
import { sprintCommitment, commitmentTrend, stageStatsByPerson, fillMissingMembers, round } from "../../domain/metrics.js";
import { fmt } from "../../utils/format.js";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { DevCard } from "./DevCard.jsx";
import { CommitmentTrend } from "./CommitmentTrend.jsx";
import { StageAnalysis } from "./StageAnalysis.jsx";

export function SprintHealthView({ selectedSprint, recentSprints, issuesById, loading, stageData, stageLoading, onLoadStages, mode = "points" }) {
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

  if (loading && !issues) return <div className="banner load">טוען נתוני ספרינט…</div>;
  if (!issues) return <div className="banner load">אין נתונים לספרינט שנבחר.</div>;

  const teamCommittedPts = round(rows.reduce((a, r) => a + r.committedPts, 0), 1);
  const teamDonePts = round(rows.reduce((a, r) => a + r.donePts, 0), 1);
  const teamCommittedItems = rows.reduce((a, r) => a + r.committedItems, 0);
  const teamDoneItems = rows.reduce((a, r) => a + r.doneItems, 0);
  const isCompletion = mode === "completion";
  const teamCommitted = isCompletion ? teamCommittedItems : teamCommittedPts;
  const teamDone = isCompletion ? teamDoneItems : teamDonePts;
  const teamPct = teamCommitted ? Math.round((teamDone / teamCommitted) * 100) : 0;
  const teamUnit = isCompletion ? "משימות" : "SP";

  const stages = stageData ? fillMissingMembers(
    stageStatsByPerson(
      issues.filter((n) => n.fields.assignee && myTeam.members.some((m) => m.id === n.fields.assignee.accountId)),
      stageData.byKey, selectedSprint
    ),
    myTeam.members,
    (m) => ({ id: m.id, name: m.name, avatar: null, byStatus: {}, items: 0, excluded: [], changed: [], stages: [], total: 0, cycleDays: 0, cyclePerItem: 0, excludedCount: 0, changedCount: 0 })
  ) : null;

  return (
    <>
      <Explainer>
        <b>מה מוצג כאן:</b> מצב הספרינט שנבחר — כמה התחייב כל מפתח מול כמה סגר, ומגמה לאורך ספרינטים.
        <ul>
          <li><b>עמידה ביעד (say/do)</b> נמדדת בשתי שיטות בלתי-תלויות, לפי הבורר בראש הדף:
            <b> לפי Story Points</b> = SP שנסגרו <u>בתוך</u> הספרינט ÷ SP שהתחייב אליהם בתכנון, או
            <b> לפי משימות שהושלמו</b> = מספר המשימות שנסגרו ÷ מספר המשימות שהתחייב אליהן בתכנון (מתעלם לגמרי מ‑Story Points).</li>
          <li>איטם שנסגר אחרי שהספרינט הסתיים לא נספר לספרינט הזה.</li>
          <li><b>נוסף באמצע</b> = איטם שנוצר אחרי תחילת הספרינט (לא היה בתכנון) — לא נספר בהתחייבות.</li>
          <li><b>Carry-over</b> = איטם שהגיע מספרינט קודם (היה בכמה ספרינטים).</li>
          <li>צבע המצב (בזמן/בסיכון/מאחר) משווה את הקצב של המפתח לזמן שעבר בספרינט, לפי השיטה הנבחרת.</li>
          <li>בשיטת ה‑Story Points, משימות ללא הערכה לא נספרות בעמידה (אי אפשר למדוד התחייבות בלי הערכה).</li>
        </ul>
      </Explainer>
      <div className="kpis">
        <Kpi label={selectedSprint && selectedSprint.state === "active" ? "התקדמות הצוות (בתהליך)" : "התקדמות הצוות בספרינט"}
          value={`${teamPct}%`} hint={`${teamDone} / ${teamCommitted} ${teamUnit} נסגרו${selectedSprint && selectedSprint.state === "active" ? " · מתעדכן עד הסוף" : ""}`}
          tone={selectedSprint && selectedSprint.state === "active" ? undefined : teamPct >= 80 ? "good" : teamPct >= 50 ? undefined : "bad"}
          info={isCompletion ? "מספר המשימות שנסגרו בספרינט ÷ מספר המשימות שהצוות התחייב אליהן בתכנון." : "סכום SP שנסגרו בספרינט ÷ סכום SP שהצוות התחייב אליהם בתכנון."} />
        <Kpi label="חברי צוות פעילים" value={rows.filter((r) => r.id !== "none").length} info="מספר המפתחים שיש להם לפחות איטם אחד בספרינט." />
        <Kpi label="נוספו באמצע הספרינט" value={fmt(rows.reduce((a, r) => a + r.addedMid, 0))} hint={`${round(rows.reduce((a, r) => a + r.addedPts, 0), 1)} SP מחוץ לתכנון`} info="איטמים שנוצרו אחרי תחילת הספרינט — מעידים על scope creep. לא נספרים בהתחייבות." />
        <Kpi label="Carry-over" value={fmt(rows.reduce((a, r) => a + r.carryOver, 0))} hint="הגיעו מספרינט קודם" info="איטמים שהיו כבר בספרינט קודם וגלשו לכאן." />
      </div>

      <Card title="עמידה ביעדים לפי מפתח" desc={isCompletion ? "כמה משימות התחייב (בתכנון) מול כמה נסגרו. צבע = סטטוס מול קצב הספרינט." : "כמה Story Points התחייב (בתכנון) מול כמה נסגרו. צבע = סטטוס מול קצב הספרינט."}>
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
