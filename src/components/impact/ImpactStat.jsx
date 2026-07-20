// Before/After comparison of a single metric with a delta badge.
export function ImpactStat({ label, before, after, unit = "", betterWhenLower = false, hint }) {
  const has = before != null && after != null;
  const delta = has ? Math.round((after - before) * 10) / 10 : null;
  const improved = has ? (betterWhenLower ? delta < 0 : delta > 0) : null;
  const flat = delta === 0;
  const cls = flat ? "" : improved ? "up" : "down";
  const arrow = flat ? "→" : improved ? "▲" : "▼";
  return (
    <div className="istat">
      <div className="istat-label">{label}</div>
      <div className="istat-row">
        <div className="istat-side">
          <div className="istat-cap">Before</div>
          <div className="istat-val">{before != null ? before : "—"}<span className="istat-unit">{unit}</span></div>
        </div>
        <div className="istat-arrow">→</div>
        <div className="istat-side">
          <div className="istat-cap">Since</div>
          <div className="istat-val">{after != null ? after : "—"}<span className="istat-unit">{unit}</span></div>
        </div>
      </div>
      {has && <div className={"istat-delta " + cls}>{arrow} {Math.abs(delta)}{unit} {flat ? "No change" : improved ? "Improved" : "Declined"}</div>}
      {!has && <div className="istat-delta muted">{hint || "Not enough data yet"}</div>}
    </div>
  );
}
