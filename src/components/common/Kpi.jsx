import { InfoTip } from "./InfoTip.jsx";

export function Kpi({ label, value, hint, tone, info }) {
  const color = tone === "good" ? "#15803d" : tone === "bad" ? "#b91c1c" : "#1a1d24";
  return (
    <div className="kpi">
      <div className="kpi-lbl">{label}{info && <InfoTip text={info} />}</div>
      <div className="kpi-val" style={{ color }}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
