import { IconTrendUp, IconTrendDown, IconTrendFlat } from "./icons.jsx";

// Small colored delta chip, e.g. "▲ 12 vs last month". `betterWhenLower`
// flips which direction counts as "good" (cycle time: lower is better;
// throughput: higher is better) — same convention as ImpactStat.
export function TrendBadge({ current, previous, betterWhenLower = false, suffix = "", decimals = 1, label = "vs previous" }) {
  if (current == null || previous == null || Number.isNaN(current) || Number.isNaN(previous)) return null;
  const scale = 10 ** decimals;
  const delta = Math.round((current - previous) * scale) / scale;
  if (delta === 0) {
    return <span className="trend-badge flat"><IconTrendFlat /> flat {label}</span>;
  }
  const improved = betterWhenLower ? delta < 0 : delta > 0;
  return (
    <span className={"trend-badge " + (improved ? "up" : "down")}>
      {delta > 0 ? <IconTrendUp /> : <IconTrendDown />}
      {Math.abs(delta)}{suffix} {label}
    </span>
  );
}
