// Compact stacked bar per month showing what share of cycle time each stage
// consumed. Reads eazyBI's own percentages directly — no recomputation.
//
// Class names are prefixed "eb-" on purpose: a plain ".dev" class already
// exists elsewhere in styles.css (DevCard) and previously leaked its padding/
// border-radius into this chart's "Development" segments by accident.
import { IconLayers } from "./icons.jsx";

const STAGE_INFO = {
  "Development %": { cls: "eb-dev", desc: "Time actively being coded, before it reaches code review." },
  "Code Review %": { cls: "eb-review", desc: "Time waiting for or undergoing code review." },
  "QA % of Cycle Time": { cls: "eb-qa", desc: "Time spent in testing/QA." },
  "Product Review %": { cls: "eb-product", desc: "Time waiting for product or design sign-off." },
  "Release %": { cls: "eb-release", desc: "Time from approval to actually shipping." },
};

export function WorkflowDistributionChart({ parsed }) {
  if (!parsed || !parsed.rows.length) return <div className="muted small">No data.</div>;
  const last = parsed.rows[parsed.rows.length - 1];
  const first = parsed.rows[0];
  const maxIdx = last.values.reduce((best, v, i) => (v > last.values[best] ? i : best), 0);
  const delta = Math.round((last.values[maxIdx] - (first.values[maxIdx] || 0)) * 100);

  return (
    <div className="wf-chart">
      <div className="wf-callout" title="Computed from the most recent month's Workflow Distribution row.">
        <IconLayers />
        <span>
          Most of the cycle time this month is <b>{parsed.columns[maxIdx]}</b> (<b>{last.formatted[maxIdx]}</b>)
          {delta !== 0 && <> — {delta > 0 ? "up" : "down"} {Math.abs(delta)}pt since {first.label}</>}.
        </span>
      </div>
      <div className="wf-legend">
        {parsed.columns.map((c) => {
          const info = STAGE_INFO[c] || {};
          return (
            <span key={c} className="wf-legend-item" title={info.desc}>
              <i className={"wf-dot " + (info.cls || "")} />{c}
            </span>
          );
        })}
      </div>
      <div className="wf-rows">
        {parsed.rows.map((r) => (
          <div className="wf-row" key={r.label}>
            <span className="wf-row-label">{r.label}</span>
            <div className="wf-bar">
              {r.values.map((v, i) => {
                const info = STAGE_INFO[parsed.columns[i]] || {};
                return (
                  <span
                    key={i}
                    className={"wf-seg " + (info.cls || "")}
                    style={{ width: `${Math.max(0, (v || 0) * 100)}%` }}
                    title={`${parsed.columns[i]} — ${r.formatted[i]} of ${r.label}'s cycle time. ${info.desc || ""}`}
                  >
                    {v > 0.12 && <span className="wf-seg-label">{r.formatted[i]}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
