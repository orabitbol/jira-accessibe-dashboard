// One compact row per sprint: a proportional stacked bar of stage workdays,
// plus the median cycle time and issue count as small badges. Reuses the
// same color language as the Workflow Distribution chart. Class names are
// prefixed "eb-" to avoid colliding with the unrelated global ".dev" class
// used by DevCard elsewhere in the app.
const STAGES = [
  { match: "Development", cls: "eb-dev", label: "Development" },
  { match: "Code Review", cls: "eb-review", label: "Code Review" },
  { match: "QA", cls: "eb-qa", label: "QA" },
  { match: "Release", cls: "eb-release", label: "Release" },
];

export function SprintCycleBar({ row, columns, isLatest = false }) {
  const stages = STAGES.map((s) => ({ ...s, idx: columns.findIndex((c) => c.includes(s.match)) })).filter((s) => s.idx !== -1);
  const stageVals = stages.map((s) => row.values[s.idx] || 0);
  const sum = stageVals.reduce((a, b) => a + b, 0) || 1;
  const issuesIdx = columns.indexOf("Issues resolved");
  const medianIdx = columns.indexOf("Median Cycle Time");
  const shortLabel = row.label.replace(/^(ACR|Widget Engine|Portal|Apps & Scan|accessFlow) /i, "");

  return (
    <div className={"sprint-cycle-row" + (isLatest ? " latest" : "")}>
      <span className="sprint-cycle-label" title={row.label}>{shortLabel}</span>
      <div className="sprint-cycle-bar" title={`Total ${sum.toFixed(1)} workdays across Development, Code Review, QA and Release`}>
        {stages.map((s, i) => (
          <span
            key={s.cls}
            className={"wf-seg " + s.cls}
            style={{ width: `${(stageVals[i] / sum) * 100}%` }}
            title={`${s.label}: ${row.formatted[s.idx]}d (${Math.round((stageVals[i] / sum) * 100)}% of this sprint's stages)`}
          />
        ))}
      </div>
      <span className="sprint-cycle-median" title="Median cycle time — half of this sprint's tickets finished faster than this, half slower.">
        {medianIdx !== -1 ? `${row.formatted[medianIdx]}d` : "—"}
      </span>
      <span className="sprint-cycle-issues" title="Issues resolved in this sprint">{issuesIdx !== -1 ? row.formatted[issuesIdx] : "—"}</span>
    </div>
  );
}
