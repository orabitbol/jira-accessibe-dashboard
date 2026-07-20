import { colorForStatus, NOT_STARTED } from "../../domain/metrics.js";
import { fmtDur } from "../../utils/format.js";

// CSS segmented bar (same visual language as the per-ticket lifecycle bar):
// To-Do = striped "waiting" segment, work statuses colored, per-segment hover.
//
// NOTE: this renders a PERSON-LEVEL aggregate across `items` tickets. The bar
// widths are proportional to the SUMMED time per status (that's what "80% of
// this person's time was Code Review" means) — but the LABEL shown is the
// AVERAGE per item (sum ÷ items), never the raw sum. A summed total across
// several tickets can add up to more days than the person has even worked at
// the company, which reads as an impossible number for a single ticket; the
// per-item average is always a realistic, bounded, comparable figure.
export function StageBar({ stages, items = 1, elapsedDays = null }) {
  const ordered = [...stages].sort((a, b) => {
    const aw = NOT_STARTED.has(a.status), bw = NOT_STARTED.has(b.status);
    if (aw !== bw) return aw ? -1 : 1;       // waiting first
    return b.days - a.days;                   // then biggest work stage
  });
  const total = ordered.reduce((s, x) => s + x.days, 0) || 1;
  const perItem = items > 0 ? items : 1;
  return (
    <div className="sbar" dir="ltr">
      {ordered.map((s, i) => {
        const wait = NOT_STARTED.has(s.status);
        const pct = Math.round((s.days / total) * 100);
        const avgDays = s.days / perItem;
        // Read against the sprint's own pace: "X days" only means something
        // once you know what fraction of the sprint has elapsed so far.
        const ofSprint = elapsedDays && elapsedDays > 0 ? Math.round((avgDays / elapsedDays) * 100) : null;
        return (
          <span key={i} className={"sseg" + (wait ? " wait" : "")}
            style={{ width: `${(s.days / total) * 100}%`, background: wait ? undefined : colorForStatus(s.status) }}>
            <span className="sseg-tip">
              <i style={{ background: wait ? "#cbd5e1" : colorForStatus(s.status) }} />
              {s.status}{wait ? " (waiting)" : ""} · {fmtDur(avgDays)}/item avg{ofSprint != null ? ` · ${ofSprint}% of sprint-so-far` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}
