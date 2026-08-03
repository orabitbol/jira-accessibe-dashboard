import { statusSegments, colorForStatus, round, DAY, workdayMs, NOT_STARTED, PAUSED_STATUSES } from "../../domain/metrics.js";
import { fmtDur } from "../../utils/format.js";

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("en-GB") : "—");
const isPause = (status) => NOT_STARTED.has(status) || PAUSED_STATUSES.has(status);

// Per-ticket lifecycle: clear milestones (sprint start / created / work started)
// + a chronological bar where the To-Do/Blocked wait is shown as a distinct
// gray segment. Days are workdays throughout — same convention as Stage
// Analysis, so this drill-down never disagrees with it for the same ticket.
export function TicketStages({ transitions, created, currentStatus, sprintStart }) {
  const segs = statusSegments(transitions, created, currentStatus);
  if (!segs.length) return <div className="muted small stages-state">No status history.</div>;

  const startedSeg = segs.find((s) => !isPause(s.status));
  const startedAt = startedSeg ? startedSeg.from : null;
  const waitDays = round(segs.filter((s) => isPause(s.status)).reduce((a, b) => a + b.days, 0), 1);
  const workDays = round(segs.filter((s) => !isPause(s.status)).reduce((a, b) => a + b.days, 0), 1);
  const totalDays = segs.reduce((a, b) => a + b.days, 0) || 1;
  const last = segs[segs.length - 1];
  const currentDays = round(workdayMs(last.from, Date.now()) / DAY, 1);
  const notStartedYet = NOT_STARTED.has(currentStatus);

  return (
    <div className="tstages">
      {/* milestones */}
      <div className="tline">
        {sprintStart && (
          <div className="tline-row"><span className="tline-dot sprint" />Sprint started · <b>{fmtDate(sprintStart)}</b></div>
        )}
        <div className="tline-row"><span className="tline-dot todo" />Created (To Do) · <b>{fmtDate(created)}</b></div>
        {startedAt
          ? <div className="tline-row"><span className="tline-dot start" />Work started · <b>{fmtDate(startedAt)}</b> <span className="muted">· waited {fmtDur(waitDays)} (workdays) in To-Do/Blocked</span></div>
          : <div className="tline-row"><span className="tline-dot wait" />Not started yet · <span className="muted">{fmtDur(waitDays)} (workdays) in To-Do/Blocked</span></div>}
      </div>

      {/* chronological bar */}
      <div className="sbar">
        {segs.map((s, i) => {
          const wait = NOT_STARTED.has(s.status);
          const paused = PAUSED_STATUSES.has(s.status);
          const pct = Math.round((s.days / totalDays) * 100);
          const isCurrent = i === segs.length - 1;
          const suffix = wait ? " (waiting)" : paused ? " (blocked — not counted as active work)" : "";
          return (
            <span key={i} className={"sseg" + (wait ? " wait" : "") + (isCurrent ? " current" : "")}
              style={{ flexGrow: s.days, flexBasis: 0, background: wait ? undefined : colorForStatus(s.status) }}>
              <span className="bar-tip">
                <i style={{ background: wait ? "#cbd5e1" : colorForStatus(s.status) }} />
                {s.status}{suffix} · {fmtDur(s.days)} (workdays) · {pct}%
              </span>
            </span>
          );
        })}
      </div>

      <div className="tstages-now">
        <span className="dotnow" style={{ background: notStartedYet ? "#cbd5e1" : colorForStatus(currentStatus) }} />
        {notStartedYet
          ? <>Waiting in <b>{currentStatus}</b> for {fmtDur(currentDays)} (workdays)</>
          : <>Now in <b>{currentStatus}</b> for {fmtDur(currentDays)} (workdays) · actual work {fmtDur(workDays)} · hover for details</>}
      </div>
    </div>
  );
}
