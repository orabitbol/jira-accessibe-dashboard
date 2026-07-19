import { statusSegments, colorForStatus, round, DAY, NOT_STARTED } from "../../domain/metrics.js";
import { fmtDur } from "../../utils/format.js";

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("en-GB") : "—");

// Per-ticket lifecycle: clear milestones (sprint start / created / work started)
// + a chronological bar where the To-Do wait is shown as a distinct gray segment.
export function TicketStages({ transitions, created, currentStatus, sprintStart }) {
  const segs = statusSegments(transitions, created, currentStatus);
  if (!segs.length) return <div className="muted small stages-state">No status history.</div>;

  const startedSeg = segs.find((s) => !NOT_STARTED.has(s.status));
  const startedAt = startedSeg ? startedSeg.from : null;
  const waitDays = round(segs.filter((s) => NOT_STARTED.has(s.status)).reduce((a, b) => a + b.days, 0), 1);
  const workDays = round(segs.filter((s) => !NOT_STARTED.has(s.status)).reduce((a, b) => a + b.days, 0), 1);
  const totalDays = segs.reduce((a, b) => a + b.days, 0) || 1;
  const last = segs[segs.length - 1];
  const currentDays = round((Date.now() - last.from) / DAY, 1);
  const notStartedYet = NOT_STARTED.has(currentStatus);

  return (
    <div className="tstages" dir="ltr">
      {/* milestones */}
      <div className="tline">
        {sprintStart && (
          <div className="tline-row"><span className="tline-dot sprint" />Sprint started · <b>{fmtDate(sprintStart)}</b></div>
        )}
        <div className="tline-row"><span className="tline-dot todo" />Created (To Do) · <b>{fmtDate(created)}</b></div>
        {startedAt
          ? <div className="tline-row"><span className="tline-dot start" />Work started · <b>{fmtDate(startedAt)}</b> <span className="muted">· waited {fmtDur(waitDays)} in To Do</span></div>
          : <div className="tline-row"><span className="tline-dot wait" />Not started yet · <span className="muted">{fmtDur(waitDays)} in To Do</span></div>}
      </div>

      {/* chronological bar */}
      <div className="sbar">
        {segs.map((s, i) => {
          const wait = NOT_STARTED.has(s.status);
          const pct = Math.round((s.days / totalDays) * 100);
          const isCurrent = i === segs.length - 1;
          return (
            <span key={i} className={"sseg" + (wait ? " wait" : "") + (isCurrent ? " current" : "")}
              style={{ width: `${(s.days / totalDays) * 100}%`, background: wait ? undefined : colorForStatus(s.status) }}>
              <span className="sseg-tip">
                <i style={{ background: wait ? "#cbd5e1" : colorForStatus(s.status) }} />
                {s.status}{wait ? " (waiting)" : ""} · {fmtDur(s.days)} · {pct}%
              </span>
            </span>
          );
        })}
      </div>

      <div className="tstages-now">
        <span className="dotnow" style={{ background: notStartedYet ? "#cbd5e1" : colorForStatus(currentStatus) }} />
        {notStartedYet
          ? <>Waiting in <b>{currentStatus}</b> for {fmtDur(currentDays)}</>
          : <>Now in <b>{currentStatus}</b> for {fmtDur(currentDays)} · actual work {fmtDur(workDays)} · hover for details</>}
      </div>
    </div>
  );
}
