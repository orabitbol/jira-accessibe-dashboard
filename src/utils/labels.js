// Small presentational label helpers (pure, no JSX).

export function remainLabel(it) {
  if (it.remainingDays == null) return "No target";
  const basis = it.remainingBasis === "due" ? "Due" : "Sprint";
  return it.remainingDays < 0
    ? `${Math.abs(it.remainingDays)}d overdue (${basis})`
    : `${it.remainingDays}d left (${basis})`;
}

export const typeClass = (t) => (t === "Bug" ? "bug" : t === "Story" ? "story" : "task");

export const attCell = (a) => (a >= 80 ? "cell-good" : a >= 50 ? "cell-warn" : "cell-bad");

// Sprint-commitment state -> [label, css class]
export const STATE_LABEL = {
  ontrack: ["On track", "ok"],
  atrisk: ["At risk", "warn"],
  behind: ["Behind", "bad"],
  met: ["Met target", "ok"],
  missed: ["Missed", "bad"],
  none: ["No tasks", "neutral"],
};
