import { Fragment } from "react";
import { shortSprint } from "../../domain/metrics.js";
import { attCell } from "../../utils/labels.js";

const dt = (s) => (s ? new Date(s).toLocaleDateString("en-GB") : "—");
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
            <th>Sprint</th><th>Period</th><th>Stage</th>
            <th>Goal attainment</th><th>Velocity (SP)</th><th>Items</th><th title="Workdays from created to resolved, weekends excluded">Lead median (workdays)</th><th>Bug %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <Fragment key={s.id}>
              {showDivider && i === firstBaseIdx && (
                <tr className="trend-divider"><td colSpan={8}>⎯⎯ Below this line: before you led the team ⎯⎯</td></tr>
              )}
              <tr className={s.id === selectedId ? "active" : ""}>
              <td className="name">{shortSprint(s.name)}</td>
              <td className="muted small">{dt(s.startDate)} – {dt(s.endDate)}</td>
              <td>{s.state === "active"
                ? <span className="pill active">Current</span>
                : !s.hasDate ? <span className="pill closed">—</span>
                  : s.after ? <span className="pill ok">Since</span>
                    : <span className="pill closed">Baseline</span>}</td>
              {s.state === "active"
                ? <td className="live-cell" title="Updating until the sprint ends"><span className="livedot" aria-hidden="true">●</span> {s.attainment}% <span className="live-tag">In progress</span></td>
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
