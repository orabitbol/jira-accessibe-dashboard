import { useState } from "react";
import { shortSprint, sprintTickets } from "../../domain/metrics.js";
import { attCell } from "../../utils/labels.js";
import { TicketBreakdown } from "../common/TicketBreakdown.jsx";

export function CommitmentTrend({ trend, recentSprints, sprintIssuesById = {}, mode = "points" }) {
  const [showCalc, setShowCalc] = useState(false);
  const [openId, setOpenId] = useState(null);
  if (!trend.length) return null;
  const openSprint = recentSprints.find((s) => s.id === openId);
  const tickets = openSprint && sprintIssuesById[openId] ? sprintTickets(sprintIssuesById[openId], openSprint) : null;
  const unit = mode === "completion" ? "משימות" : "Story Points";
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>מגמת עמידה ביעדים (ספרינטים אחרונים)</h2>
          <p className="desc">אחוז ה{mode === "completion" ? "משימות" : "Story Points"} שנסגרו מתוך מה שהתחייב כל מפתח בכל ספרינט (לפי {unit}).</p>
        </div>
        <button className="linkbtn" onClick={() => setShowCalc(!showCalc)}>{showCalc ? "הסתר הסבר" : "איך זה מחושב?"}</button>
      </div>
      {showCalc && (
        <div className="calcbox">
          <b>איך מחושב אחוז העמידה (לפי {unit}):</b>
          <ul>
            <li>לכל ספרינט נלקחים רק האיטמים ששויכו לאותו ספרינט (לפי שדה ה‑Sprint ב‑Jira).</li>
            <li><b>התחייבות</b> = סכום ה‑{unit} של איטמים שהיו בספרינט כבר בתכנון. איטם שנוצר אחרי תחילת הספרינט נחשב "נוסף באמצע" ואינו נספר בהתחייבות.</li>
            <li><b>נסגרו</b> = סכום ה‑{unit} של איטמים שעברו ל‑Done בתוך זמן הספרינט (בספרינט סגור — עד תאריך הסגירה).</li>
            <li><b>אחוז עמידה</b> = נסגרו ÷ התחייבות. ירוק ≥ 80%, צהוב 50–79%, אדום &lt; 50%.</li>
            <li>"ממוצע" = ממוצע אחוזי העמידה על פני הספרינטים המוצגים.</li>
          </ul>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>מפתח</th>{recentSprints.map((s) => (
              <th key={s.id}>
                <button className={"th-btn" + (openId === s.id ? " on" : "")} onClick={() => setOpenId(openId === s.id ? null : s.id)} title="הצג כרטיסיות הספרינט">
                  {shortSprint(s.name)} ▾
                </button>
              </th>
            ))}<th>ממוצע</th><th>מגמה</th></tr>
          </thead>
          <tbody>
            {trend.map((d) => (
              <tr key={d.id}>
                <td className="name">{d.name}</td>
                {recentSprints.map((s) => {
                  const p = d.points.find((x) => x.sprint === s.name);
                  return <td key={s.id} className={p ? attCell(p.attainment) : ""}>{p ? `${p.attainment}%` : "—"}</td>;
                })}
                <td className={d.avg == null ? "" : attCell(d.avg)}><b>{d.avg == null ? "—" : `${d.avg}%`}</b></td>
                <td>{d.recurring
                  ? <span className="dot warn" role="img" aria-label="לתשומת לב — עמידה נמוכה לאורך זמן" title="ממוצע עמידה נמוך לאורך כמה ספרינטים — אולי כדאי לבדוק עומס או חסמים">●</span>
                  : <span className="dot ok" role="img" aria-label="עמידה יציבה ביעדים" title="עמידה יציבה ביעדים">●</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openSprint && (
        <div className="sprint-drill">
          <div className="sprint-drill-head">
            <b>כרטיסיות בספרינט {shortSprint(openSprint.name)}</b>
            <button className="linkbtn" onClick={() => setOpenId(null)}>סגור</button>
          </div>
          {tickets
            ? <TicketBreakdown done={tickets.done} late={tickets.late} open={tickets.open} noEstimate={tickets.noEstimate} showAssignee />
            : <div className="muted small">אין נתונים לספרינט זה.</div>}
        </div>
      )}
    </div>
  );
}
