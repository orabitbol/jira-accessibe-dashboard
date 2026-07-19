import { useMemo, useState } from "react";
import { myTeam } from "../../../teams.config.js";
import { planningStats } from "../../domain/metrics.js";
import { fmt } from "../../utils/format.js";
import { FilterBar } from "../common/FilterBar.jsx";
import { PeopleFilter } from "../common/PeopleFilter.jsx";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { EstimationBanner } from "./EstimationBanner.jsx";
import { TicketList } from "./TicketList.jsx";

export function PlanningView({ rows }) {
  const roster = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.assigneeId)) m.set(r.assigneeId, { id: r.assigneeId, name: r.assignee, avatar: r.avatar, isMine: myTeam.members.some((x) => x.id === r.assigneeId), count: 0 });
      m.get(r.assigneeId).count += 1;
    }
    return [...m.values()].sort((p, q) => (q.isMine - p.isMine) || p.name.localeCompare(q.name));
  }, [rows]);
  const myIds = useMemo(() => roster.filter((p) => p.isMine).map((p) => p.id), [roster]);
  const [sel, setSel] = useState(null);
  const effective = sel ?? new Set(myIds);

  const shown = rows.filter((r) => effective.has(r.assigneeId));
  const st = planningStats(shown);
  const missing = shown.filter((r) => r.missing);
  const estimated = shown.filter((r) => !r.missing);

  return (
    <>
      <FilterBar>
        <PeopleFilter roster={roster} selected={effective} myIds={myIds} onChange={setSel} />
      </FilterBar>
      <Explainer>
        <b>מה מוצג כאן:</b> כל הכרטיסיות שכבר משויכות לספרינט שנבחר (כולל ספרינטים עתידיים), לפי האנשים שבחרת.
        <ul>
          <li>המטרה: לראות ב‑pre‑planning מה עדיין חסר — בעיקר כרטיסיות <b>ללא Story Points</b>.</li>
          <li>"ללא הערכה" = ל‑Story Points אין ערך (או 0). בלי הערכה אי אפשר לתכנן עומס או למדוד עמידה.</li>
          <li>ספרינט עתידי מופיע בבורר רק אם כבר שויכו אליו כרטיסיות.</li>
        </ul>
      </Explainer>
      {!shown.length ? (
        <div className="banner load">לא נבחרו אנשים, או שאין להם כרטיסיות בספרינט זה.</div>
      ) : (
        <>
          <EstimationBanner missing={st.missing} />
          <div className="kpis">
            <Kpi label="כרטיסיות בספרינט" value={fmt(st.total)} />
            <Kpi label="סך Story Points" value={fmt(st.points, 1)} />
            <Kpi label="ללא הערכה" value={fmt(st.missing)} tone={st.missing ? "bad" : "good"} info="כרטיסיות בספרינט שאין להן Story Points — צריך להעריך אותן ב‑pre‑planning." />
            <Kpi label="מפתחים" value={fmt(st.people)} />
          </div>
          {missing.length > 0 && (
            <Card title="ממתינות להערכה" desc="כרטיסיות בספרינט שעדיין ללא Story Points.">
              <TicketList rows={missing} />
            </Card>
          )}
          <Card title="הוערכו" desc="כרטיסיות עם Story Points.">
            {estimated.length ? <TicketList rows={estimated} /> : <div className="muted small">אין עדיין כרטיסיות מוערכות.</div>}
          </Card>
        </>
      )}
    </>
  );
}
