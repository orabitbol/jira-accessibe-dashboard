import { useMemo } from "react";
import { sprintSummaries, averageSummaries, sprintCommitment, shortSprint, leadershipStartSprint } from "../../domain/metrics.js";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { DevCard } from "../sprint/DevCard.jsx";
import { ImpactStat } from "./ImpactStat.jsx";
import { SprintTrendTable } from "./SprintTrendTable.jsx";

const dt = (s) => (s ? new Date(s).toLocaleDateString("he-IL") : "—");
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

  if (sprintLoading && !summaries.length) return <div className="banner load">טוען נתוני ספרינטים…</div>;
  if (!summaries.length) return <div className="banner load">אין עדיין נתוני ספרינטים לחישוב.</div>;

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
        ההשפעה שלי
        <span className="bigtitle-sub">
          {firstLeadSprint
            ? <>מודדים החל מ‑{shortSprint(firstLeadSprint.name)} ({dt(firstLeadSprint.startDate)}) — הספרינט הראשון שלך כראש צוות</>
            : "ממתין לספרינט פעיל"}
        </span>
      </h2>

      <Explainer>
        <b>מה מוצג כאן:</b> השוואה בין מצב הצוות לפני שהפכת לראש צוות לבין מאז.
        <ul>
          <li>הגבול נקבע לפי תחילת הספרינט הראשון שלך כראש צוות (מוצג למעלה). אם ההובלה התחילה באמצע ספרינט, הספרינט שלפניו נכלל גם הוא כ"מאז", כדי לא לחתוך התחייבות של ספרינט באמצע.</li>
          <li><b>בסיס</b> = ממוצע המדדים על פני הספרינטים שהושלמו <u>לפני</u> הספרינט הראשון שלך. <b>מאז</b> = ממוצע ספרינטים שהושלמו החל מהספרינט הראשון שלך (כולל).</li>
          <li>ספרינט פעיל (בתהליך) <u>אינו</u> נכלל בממוצעים — הוא מוצג בנפרד ככרטיס "בתהליך", עד שייסגר.</li>
          <li>ברגע שיסתיים ספרינט נוסף, צד ה"מאז" יתעדכן והדלתא תופיע/תתעדכן.</li>
          <li>"עמידה ביעד" נמדדת לפי הבורר בראש הדף — Story Points או משימות שהושלמו.</li>
        </ul>
      </Explainer>
      <Card title="עד עכשיו מול מאז שאתה מוביל"
        desc={`בסיס = ממוצע ${baseline ? baseline.count : 0} הספרינטים שהושלמו לפני שהובלת. מאז = ממוצע ${since ? since.count : 0} ספרינטים שהושלמו תחת ההובלה שלך. הספרינט הנוכחי בתהליך ואינו נכלל בממוצעים.`}>
        <div className="istats">
          <ImpactStat label={`עמידה ביעד (ממוצע · ${mode === "completion" ? "משימות שהושלמו" : "Story Points"})`} before={baseline && baseline.attainment} after={since && since.attainment} unit="%" hint="ימדד כשיסתיים הספרינט הראשון שלך" />
          <ImpactStat label="Velocity (SP לספרינט)" before={baseline && baseline.velocity} after={since && since.velocity} hint="ימדד כשיסתיים הספרינט הראשון שלך" />
          <ImpactStat label="איטמים שנסגרו (לספרינט)" before={baseline && baseline.throughput} after={since && since.throughput} hint="ימדד כשיסתיים הספרינט הראשון שלך" />
          <ImpactStat label="Lead time חציוני" before={baseline && baseline.lead} after={since && since.lead} unit="d" betterWhenLower hint="ימדד כשיסתיים הספרינט הראשון שלך" />
          <ImpactStat label="Bug ratio" before={baseline && baseline.bug} after={since && since.bug} unit="%" betterWhenLower hint="ימדד כשיסתיים הספרינט הראשון שלך" />
        </div>
        {!since && (
          <div className="estbanner ok" style={{ marginTop: 14 }}>
            <span className="estbanner-ic">i</span>
            <div>
              <b>זהו הבסיס שלך</b>
              <div className="muted small">עוד לא הסתיים ספרינט תחת ההובלה שלך. ברגע שהספרינט הנוכחי ייסגר, נשווה אותו לבסיס ונראה את הדלתא.</div>
            </div>
          </div>
        )}
      </Card>

      {live && (
        <Card title={`הספרינט הנוכחי (בתהליך) · ${shortSprint(live.name)}`}
          desc="נתונים חלקיים — מתעדכנים עד סוף הספרינט. לא נכלל עדיין בהשוואת הבסיס.">
          <div className="kpis" style={{ marginBottom: 14 }}>
            <Kpi label="התקדמות בזמן" value={elapsedPct != null ? `${elapsedPct}%` : "—"} hint="כמה מזמן הספרינט עבר" />
            <Kpi label="נסגר עד כה"
              value={mode === "completion" ? `${live.doneItems} / ${live.committedItems} משימות` : `${live.donePts} / ${live.committedPts} SP`}
              hint={`${live.attainment}% מההתחייבות`} />
            <Kpi label="איטמים שנסגרו" value={`${live.doneItems}/${live.totalItems}`} />
            <Kpi label="קצב" value={elapsedPct != null ? (live.attainment >= elapsedPct ? "בקצב טוב" : "מאחורי הקצב") : "—"}
              tone={elapsedPct != null ? (live.attainment >= elapsedPct ? "good" : "bad") : undefined} hint="התקדמות מול הזמן שעבר" />
          </div>
          <div className="devs">
            {liveRows.filter((r) => r.id !== "none").map((r) => <DevCard key={r.id} r={r} mode={mode} />)}
          </div>
        </Card>
      )}

      <Card title="מגמה לאורך הספרינטים" desc="כל ספרינט בנפרד — בסיס / מאז / נוכחי. לחיצה על שורה פותחת אותה.">
        <SprintTrendTable summaries={summaries} selectedId={live ? live.id : null} />
      </Card>
    </>
  );
}
