import { colorForStatus, NOT_STARTED } from "../../domain/metrics.js";
import { fmtDur } from "../../utils/format.js";

// CSS segmented bar (same visual language as the per-ticket lifecycle bar):
// To-Do = striped "waiting" segment, work statuses colored, per-segment hover.
export function StageBar({ stages }) {
  const ordered = [...stages].sort((a, b) => {
    const aw = NOT_STARTED.has(a.status), bw = NOT_STARTED.has(b.status);
    if (aw !== bw) return aw ? -1 : 1;       // waiting first
    return b.days - a.days;                   // then biggest work stage
  });
  const total = ordered.reduce((s, x) => s + x.days, 0) || 1;
  return (
    <div className="sbar" dir="ltr">
      {ordered.map((s, i) => {
        const wait = NOT_STARTED.has(s.status);
        const pct = Math.round((s.days / total) * 100);
        return (
          <span key={i} className={"sseg" + (wait ? " wait" : "")}
            style={{ width: `${(s.days / total) * 100}%`, background: wait ? undefined : colorForStatus(s.status) }}>
            <span className="sseg-tip">
              <i style={{ background: wait ? "#cbd5e1" : colorForStatus(s.status) }} />
              {s.status}{wait ? " (waiting)" : ""} · {fmtDur(s.days)} · {pct}%
            </span>
          </span>
        );
      })}
    </div>
  );
}
