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

// Own `.stage-gbar` track (not `.sprint-cycle-bar`) so Stage Analysis can show
// styled hover tooltips without fighting eazyBI's overflow:hidden pill clip,
// and so every segment gets its own radius (RTL-safe — first/last physical
// corner tricks break when <html dir="rtl"> reverses the flex axis).
export function StageGroupBar({ groups, items = 1, t }) {
  if (!groups || !groups.length) return null;
  const total = groups.reduce((a, g) => a + g.days, 0) || 1;
  const perItem = items > 0 ? items : 1;
  return (
    <div className="stage-gbar" aria-label={t("stage.groupBarTitle")}>
      {groups.map((g) => {
        const avgDays = g.days / perItem;
        const pct = Math.round((g.days / total) * 100);
        const label = t(GROUP_I18N_KEY[g.key] || "stagegroup.other");
        return (
          <span
            key={g.key}
            className={"stage-gbar-seg " + (GROUP_CLASS[g.key] || "eb-other")}
            style={{ flexGrow: g.days, flexBasis: 0 }}
          >
            <span className="bar-tip">
              <i className={"wf-dot " + (GROUP_CLASS[g.key] || "eb-other")} />
              {t("stage.groupTipLine", { label, avg: avgDays.toFixed(1), pct })}
            </span>
          </span>
        );
      })}
    </div>
  );
}
