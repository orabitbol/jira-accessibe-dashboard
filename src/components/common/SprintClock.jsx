import { sprintProgress } from "../../domain/metrics.js";

// Compact, sticky "where are we in the sprint" anchor. Every duration shown
// further down the page (Stage Analysis, commitment %, etc.) should be read
// against this — so it stays pinned near the top instead of getting
// forgotten by the time you scroll down.
export function SprintClock({ sprint, title }) {
  const p = sprint ? sprintProgress(sprint) : null;
  if (!p) return null;
  const tone = p.done ? "done" : p.daysLeft <= 2 ? "warn" : "ok";
  return (
    <div className="sclock">
      <div className="sclock-title">{title}</div>
      <div className="sclock-track"><span className={"sclock-fill " + tone} style={{ width: `${p.pct}%` }} /></div>
      <div className={"sclock-days " + tone}>
        {p.done ? "הספרינט הסתיים" : `יום ${p.dayNumber}/${p.totalDays} · נשארו ${Math.max(0, p.daysLeft)} ימים`}
      </div>
    </div>
  );
}
