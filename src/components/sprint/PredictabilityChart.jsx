import { shortSprint } from "../../domain/metrics.js";
import { Card } from "../common/Card.jsx";

// "What we promised next to what we actually finished" — one bar pair per
// sprint, team-level. This is the macro view; the per-developer % breakdown
// right below (CommitmentTrend) is the detail view of the exact same
// underlying data. No charting library in this codebase (same philosophy as
// StageBar/StageGroupBar — plain divs, CSS height driven by a % of the max
// value shown), so this follows that same pattern rather than introducing one.
export function PredictabilityChart({ series, mode = "points", t }) {
  if (!series || !series.length) return null;
  const isCompletion = mode === "completion";
  const rows = series.map((s) => ({
    id: s.id, name: s.name, closed: s.closed,
    committed: isCompletion ? s.committedItems : s.committedPts,
    done: isCompletion ? s.doneItems : s.donePts,
  }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.committed, r.done]));
  const unit = isCompletion ? t("dev.unit.tasks") : t("dev.unit.sp");
  return (
    <Card title={t("predict.title")} desc={t("predict.desc", { unit })}>
      <div className="predict-legend">
        <span className="predict-legend-item"><i className="predict-dot committed" />{t("predict.committed")}</span>
        <span className="predict-legend-item"><i className="predict-dot done" />{t("predict.done")}</span>
      </div>
      <div className="predict-chart">
        {rows.map((r) => (
          <div className="predict-group" key={r.id}>
            <div className="predict-bars">
              <div className="predict-bar-wrap" title={`${t("predict.committed")}: ${r.committed} ${unit}`}>
                <span className="predict-val">{r.committed}</span>
                <div className="predict-bar committed" style={{ height: `${Math.max(2, (r.committed / max) * 100)}%` }} />
              </div>
              <div className="predict-bar-wrap" title={`${t("predict.done")}: ${r.done} ${unit}${r.closed ? "" : ` (${t("predict.inProgress")})`}`}>
                <span className="predict-val">{r.done}</span>
                <div className={"predict-bar done" + (r.closed ? "" : " inprogress")} style={{ height: `${Math.max(2, (r.done / max) * 100)}%` }} />
              </div>
            </div>
            <div className="predict-label">{shortSprint(r.name)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
