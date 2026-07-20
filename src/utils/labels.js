// Small presentational label helpers (pure, no JSX).

export function remainLabel(it) {
  if (it.remainingDays == null) return "אין יעד";
  const basis = it.remainingBasis === "due" ? "Due" : "ספרינט";
  return it.remainingDays < 0
    ? `באיחור ${Math.abs(it.remainingDays)}ד (${basis})`
    : `נשאר ${it.remainingDays}ד (${basis})`;
}

export const typeClass = (t) => (t === "Bug" ? "bug" : t === "Story" ? "story" : "task");

export const attCell = (a) => (a >= 80 ? "cell-good" : a >= 50 ? "cell-warn" : "cell-bad");

// Sprint-commitment state -> [hebrew label, css class]
export const STATE_LABEL = {
  ontrack: ["בזמן", "ok"],
  atrisk: ["בסיכון", "warn"],
  behind: ["מאחר", "bad"],
  met: ["עמד ביעד", "ok"],
  missed: ["פספס", "bad"],
  none: ["אין משימות", "neutral"],
};
