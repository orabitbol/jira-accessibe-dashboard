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
        <span className="muted small">מוצג ספרינט נוכחי בלבד (כמו הבורד).</span>
      </FilterBar>

      <Explainer>
        <b>מה מוצג כאן:</b> רק איטמים שנמצאים בספרינט הפעיל (כמו בבורד), לפי האנשים שבחרת.
        <ul>
          <li><b>טרם התחיל</b> (אפור) — האיטם עדיין ב‑To Do. זה לא עיכוב, פשוט עוד לא נלקח.</li>
          <li><b>בסיכון</b> (כתום) — עדיין ב‑To Do ונשארו ≤ {NOT_STARTED_FLAG_DAYS} ימים לספרינט, כך שסביר שלא ייסגר בזמן.</li>
          <li><b>מתעכב / חסום</b> (אדום) — אחד מאלה: עבר ה‑Due date, חסום ע״י איטם אחר, תקוע מעל {STUCK_DAYS} ימים <u>בשלב עבודה</u> (In Progress / Code Review / QA…), או שהספרינט הסתיים והאיטם עוד פתוח.</li>
          <li><b>"בעבודה"</b> רגיל לא מקבל תווית — ה‑status pill כבר מציין את השלב.</li>
        </ul>
        <b>"כמה זמן בכל שלב":</b> מחושב מהיסטוריית הסטטוסים (changelog) של האיטם, ומודד <b>cycle time</b> — מהרגע שהעבודה התחילה בפועל (זמן ההמתנה ב‑To Do לא נכלל בבר, אך מצוין בנפרד).
        <br /><b>"משימות מחוץ לספרינט":</b> איטמים פתוחים של אותו אדם שאינם בספרינט הנוכחי — מועמדים לשכחה.
        <br /><span className="muted">הספים ניתנים לשינוי בקוד (metrics.js): STUCK_DAYS={STUCK_DAYS}, NOT_STARTED_FLAG_DAYS={NOT_STARTED_FLAG_DAYS}.</span>
      </Explainer>
      {!groups.length && <div className="banner load">אין כרגע איטמים בספרינט הפעיל בהיקף שנבחר.</div>}
      <div className="people">
        {groups.map((p) => <PersonCard key={p.name} person={p} />)}
      </div>
    </>
  );
}
