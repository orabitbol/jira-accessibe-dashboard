import { Fragment } from "react";
import { shortSprint } from "../../domain/metrics.js";
import { attCell } from "../../utils/labels.js";

const dt = (s) => (s ? new Date(s).toLocaleDateString("he-IL") : "—");
const isLeadership = (s) => s.state === "active" || s.after;

export function SprintTrendTable({ summaries, selectedId }) {
  // newest first
  const rows = [...summaries].reverse();
  // index of the first "before you led" sprint — we draw a divider above it
  const firstBaseIdx = rows.findIndex((s) => !isLeadership(s));
  const showDivider = firstBaseIdx > 0; // only if there are leadership rows above
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ספרינט</th><th>תקופה</th><th>שלב</th>
            <th>עמידה ביעד</th><th>Velocity (SP)</th><th>איטמים</th><th>Lead חציון</th><th>Bug %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <Fragment key={s.id}>
              {showDivider && i === firstBaseIdx && (
                <tr className="trend-divider"><td colSpan={8}>⎯⎯ מכאן ולמטה: לפני שהובלת את הצוות ⎯⎯</td></tr>
              )}
              <tr className={s.id === selectedId ? "active" : ""}>
              <td className="name">{shortSprint(s.name)}</td>
              <td className="muted small">{dt(s.startDate)} – {dt(s.endDate)}</td>
              <td>{s.state === "active"
                ? <span className="pill active">נוכחי</span>
                : !s.hasDate ? <span className="pill closed">—</span>
                  : s.after ? <span className="pill ok">מאז</span>
                    : <span className="pill closed">בסיס</span>}</td>
              {s.state === "active"
                ? <td className="live-cell" title="מתעדכן עד סוף הספרינט"><span className="livedot" aria-hidden="true">●</span> {s.attainment}% <span className="live-tag">בתהליך</span></td>
                : <td className={attCell(s.attainment)}>{s.attainment}%</td>}
              <td>{s.donePts}</td>
              <td>{s.doneItems}/{s.totalItems}</td>
              <td>{s.leadMedian}d</td>
              <td>{s.bugRatio}%</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
