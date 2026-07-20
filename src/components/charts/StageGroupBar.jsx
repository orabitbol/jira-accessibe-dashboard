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

export function StageGroupBar({ groups, items = 1 }) {
  if (!groups || !groups.length) return null;
  const total = groups.reduce((a, g) => a + g.days, 0) || 1;
  const perItem = items > 0 ? items : 1;
  return (
    <div className="sprint-cycle-bar" title="eazyBI-style stage buckets — same grouping as the eazyBI tab, workdays per item">
      {groups.map((g) => {
        const avgDays = g.days / perItem;
        const pct = Math.round((g.days / total) * 100);
        return (
          <span
            key={g.key}
            className={"wf-seg " + (GROUP_CLASS[g.key] || "")}
            style={{ width: `${(g.days / total) * 100}%` }}
            title={`${g.label}: ${avgDays.toFixed(1)}d/item avg workdays (${pct}% of this person's active-work stages)`}
          />
        );
      })}
    </div>
  );
}
