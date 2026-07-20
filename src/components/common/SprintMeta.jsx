import { DAY } from "../../domain/metrics.js";

export function SprintMeta({ s }) {
  const start = s.startDate ? new Date(s.startDate) : null;
  const end = s.endDate ? new Date(s.endDate) : null;
  const daysLeft = end ? Math.ceil((end - Date.now()) / DAY) : null;
  return (
    <span className="muted small sprintmeta">
      {start && end ? `${start.toLocaleDateString("en-GB")} – ${end.toLocaleDateString("en-GB")}` : ""}
      {s.state === "active" && daysLeft != null && (
        <> · {daysLeft >= 0 ? `${daysLeft} days left` : `Ended ${-daysLeft} days ago`}</>
      )}
      {s.state === "closed" && " · Closed"}
    </span>
  );
}
