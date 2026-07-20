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
  const unit = mode === "completion" ? "tasks" : "Story Points";
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Goal attainment trend (recent sprints)</h2>
          <p className="desc">Percent of {mode === "completion" ? "tasks" : "Story Points"} closed out of what each developer committed to each sprint (by {unit}).</p>
        </div>
        <button className="linkbtn" onClick={() => setShowCalc(!showCalc)}>{showCalc ? "Hide explanation" : "How is this calculated?"}</button>
      </div>
      {showCalc && (
        <div className="calcbox">
          <b>How attainment % is calculated (by {unit}):</b>
          <ul>
            <li>For each sprint, only items assigned to that sprint are used (per Jira's Sprint field).</li>
            <li><b>Committed</b> = sum of {unit} for items already in the sprint at planning time. An item created after the sprint started counts as "added mid-sprint" and is not counted toward commitment.</li>
            <li><b>Closed</b> = sum of {unit} for items moved to Done within the sprint window (for a closed sprint — up to the close date).</li>
            <li><b>Attainment %</b> = closed ÷ committed. Green ≥ 80%, yellow 50–79%, red &lt; 50%.</li>
            <li>"Average" = the mean attainment % across the sprints shown.</li>
          </ul>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Developer</th>{recentSprints.map((s) => (
              <th key={s.id}>
                <button className={"th-btn" + (openId === s.id ? " on" : "")} onClick={() => setOpenId(openId === s.id ? null : s.id)} title="Show this sprint's tickets">
                  {shortSprint(s.name)} ▾
                </button>
              </th>
            ))}<th>Average</th><th>Trend</th></tr>
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
                  ? <span className="dot warn" role="img" aria-label="Needs attention — low attainment over time" title="Low average attainment over several sprints — worth checking for workload or blockers">●</span>
                  : <span className="dot ok" role="img" aria-label="Consistent goal attainment" title="Consistent goal attainment">●</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openSprint && (
        <div className="sprint-drill">
          <div className="sprint-drill-head">
            <b>Tickets in sprint {shortSprint(openSprint.name)}</b>
            <button className="linkbtn" onClick={() => setOpenId(null)}>Close</button>
          </div>
          {tickets
            ? <TicketBreakdown done={tickets.done} late={tickets.late} open={tickets.open} noEstimate={tickets.noEstimate} showAssignee />
            : <div className="muted small">No data for this sprint.</div>}
        </div>
      )}
    </div>
  );
}
