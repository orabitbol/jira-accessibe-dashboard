// Minimal inline SVG line+area chart. No charting library — same philosophy
// as StageBar/SprintClock elsewhere in this app (hand-rolled, zero deps).
export function Sparkline({ values, width = 240, height = 44, color = "#4f46e5" }) {
  const nums = (values || []).map((v) => (typeof v === "number" ? v : null));
  const clean = nums.filter((v) => v != null);
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const pad = 5;
  const stepX = (width - pad * 2) / (nums.length - 1);

  const points = nums.map((v, i) => {
    const x = pad + i * stepX;
    const y = v == null ? null : height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const known = points.filter((p) => p[1] != null);
  const linePath = known.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const areaPath = `${linePath} L${known[known.length - 1][0]},${height} L${known[0][0]},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity="0.09" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {known.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === known.length - 1 ? 3 : 1.6} fill={color} />
      ))}
    </svg>
  );
}
