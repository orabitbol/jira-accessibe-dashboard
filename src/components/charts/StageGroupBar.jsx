// eazyBI-style rollup: the same detailed per-status days from StageBar,
// grouped into eazyBI's own cycle-time buckets (Development / Code Review /
// QA / Product Review / Release) and drawn with the SAME color language as
// the eazyBI tab's SprintCycleBar / WorkflowDistributionChart (the "eb-*"
// classes in styles.css) — so a person's stage mix here reads directly
// against the eazyBI tab, not just against itself.
const GROUP_CLASS = {
  development: "eb-dev",
  codeReview: "eb-review",
  qa: "eb-qa",
  productReview: "eb-product",
  release: "eb-release",
  other: "eb-other", // status active but not yet in the board's known column mapping — never silently dropped
};

// `groups` carries English labels (STAGE_GROUPS in metrics.js is shared,
// non-UI data also used for plain aggregation) — translated display text
// comes from `g.key` through this i18n lookup instead, so metrics.js itself
// never needs to know about language.
const GROUP_I18N_KEY = {
  development: "stagegroup.development", codeReview: "stagegroup.codeReview", qa: "stagegroup.qa",
  productReview: "stagegroup.productReview", release: "stagegroup.release", other: "stagegroup.other",
};

// Same styled hover box as StageBar's `.sseg-tip` (below it) — a plain
// `title=` attribute (the old approach here) only shows the OS's native
// tooltip after a long hover delay, with no styling, so this bar visually
// read as "not hoverable" next to StageBar's bar directly underneath it,
// which DOES show an instant styled tooltip. Same interaction, same look,
// for both bars now.
export function StageGroupBar({ groups, items = 1, t }) {
  if (!groups || !groups.length) return null;
  const total = groups.reduce((a, g) => a + g.days, 0) || 1;
  const perItem = items > 0 ? items : 1;
  return (
    <div className="sprint-cycle-bar wf-hoverable" title={t("stage.groupBarTitle")}>
      {groups.map((g) => {
        const avgDays = g.days / perItem;
        const pct = Math.round((g.days / total) * 100);
        const label = t(GROUP_I18N_KEY[g.key] || "stagegroup.other");
        return (
          <span key={g.key} className={"wf-seg " + (GROUP_CLASS[g.key] || "")} style={{ width: `${(g.days / total) * 100}%` }}>
            <span className="wf-seg-tip">
              <i className={"wf-dot " + (GROUP_CLASS[g.key] || "")} />
              {t("stage.groupTipLine", { label, avg: avgDays.toFixed(1), pct })}
            </span>
          </span>
        );
      })}
    </div>
  );
}
