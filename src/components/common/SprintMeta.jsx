import { DAY } from "../../domain/metrics.js";

export function SprintMeta({ s, t }) {
  const start = s.startDate ? new Date(s.startDate) : null;
  const end = s.endDate ? new Date(s.endDate) : null;
  const daysLeft = end ? Math.ceil((end - Date.now()) / DAY) : null;
  return (
    <span className="muted small sprintmeta">
      {start && end ? `${start.toLocaleDateString("en-GB")} – ${end.toLocaleDateString("en-GB")}` : ""}
      {s.state === "active" && daysLeft != null && (
        <> · {daysLeft >= 0 ? `${daysLeft} ${t("sprintMeta.daysLeft")}` : t("sprintMeta.endedAgo", { n: -daysLeft })}</>
      )}
      {s.state === "closed" && <> · {t("sprintMeta.closed")}</>}
    </span>
  );
}
