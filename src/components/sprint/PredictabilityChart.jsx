import { shortSprint, predictabilityRows, predictabilityAverage } from "../../domain/metrics.js";
import { Card } from "../common/Card.jsx";
import { InfoTip } from "../common/InfoTip.jsx";

// "%Done from Committed" — the single number ops reports on: of everything the
// team committed to at sprint start, how much actually shipped. Rendered as a
// committed/delivered bar pair per sprint with the percentage on top, plus the
// average across the closed sprints in view.
//
// This is the macro view; the per-developer % breakdown right below
// (CommitmentTrend) is the detail view of the exact same underlying data. No
// charting library in this codebase (same philosophy as StageBar/
// StageGroupBar — plain divs, CSS height driven by a % of the max value
// shown), so this follows that same pattern rather than introducing one.
//
// Unlike the eazyBI report of the same name, this is computed live from Jira
// and scoped to the team ROSTER, not to a Jira project: a teammate's work in
// another project counts for them, and other people's work inside this team's
// project does not. That is also what keeps the series continuous across the
// 2026-08 project split (see teams.config.js).
const pctClass = (pct, closed) => {
  if (!closed) return "neutral";
  if (pct == null) return "neutral";
  if (pct >= 80) return "ok";
  if (pct >= 60) return "warn";
  return "bad";
};

export function PredictabilityChart({ series, mode = "points", t }) {
  if (!series || !series.length) return null;
  const isCompletion = mode === "completion";
  const rows = predictabilityRows(series, mode);
  const max = Math.max(1, ...rows.flatMap((r) => [r.committed, r.done]));
  const unit = isCompletion ? t("dev.unit.tasks") : t("dev.unit.sp");

  const avg = predictabilityAverage(rows);

  return (
    <Card title={t("predict.title")} desc={t("predict.desc", { unit })}>
      {avg && (
        <div className="predict-summary">
          <span className="predict-summary-val">{avg.pct}%</span>
          <span className="predict-summary-lbl">
            {t("predict.avgClosed", { n: avg.sprints })}
            <InfoTip text={t("predict.avgTip")} />
          </span>
        </div>
      )}
      <div className="predict-legend">
        <span className="predict-legend-item"><i className="predict-dot committed" />{t("predict.committed")}</span>
        <span className="predict-legend-item"><i className="predict-dot done" />{t("predict.done")}</span>
      </div>
      <div className="predict-chart">
        {rows.map((r) => (
          <div className="predict-group" key={r.id}>
            <span
              className={"predict-pct " + pctClass(r.pct, r.closed)}
              title={r.pct == null
                ? t("predict.noCommitment")
                : `${r.pct}% — ${r.done}/${r.committed} ${unit}${r.closed ? "" : ` (${t("predict.inProgress")})`}`}
            >
              {r.pct == null ? "—" : `${r.pct}%`}
            </span>
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
            <div className="predict-label" title={r.name}>{shortSprint(r.name)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
