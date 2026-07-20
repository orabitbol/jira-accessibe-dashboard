import { useState } from "react";
import { remainLabel, typeClass } from "../../utils/labels.js";
import { fetchChangelog } from "../../services/jiraApi.js";
import { TicketStages } from "./TicketStages.jsx";

export function TaskCard({ it }) {
  const [open, setOpen] = useState(false);
  const [cl, setCl] = useState(null); // null | "loading" | "error" | { transitions, currentStatus }

  async function toggle() {
    if (!open && !cl) {
      setCl("loading");
      try { setCl(await fetchChangelog(it.key)); }
      catch { setCl("error"); }
    }
    setOpen(!open);
  }

  return (
    <div className="task-wrap">
      <a className={"task" + (it.level === "bad" ? " delayed" : it.level === "warn" ? " atrisk" : "")} href={it.webUrl} target="_blank" rel="noreferrer">
        <div className="task-top">
          <span className={"badge " + typeClass(it.type)}>{it.type}</span>
          <span className="key">{it.key}</span>
          <span className="status">{it.status}</span>
          {it.stateLabel && <span className={"state " + it.stateClass}>{it.stateLabel}</span>}
        </div>
        <div className="task-sum">{it.summary}</div>
        <div className="task-meta muted small">In status {it.inCurrentDays}d · age {it.ageDays}d · {remainLabel(it)}</div>
        {it.reasons.length > 0 && <div className="reasons">{it.reasons.join(" · ")}</div>}
      </a>
      <button className="stages-toggle" onClick={toggle} aria-expanded={open}>
        {open ? "Hide stages" : "Time in each stage ▾"}
      </button>
      {open && (
        cl === "loading" ? <div className="muted small stages-state">Loading history…</div>
          : cl === "error" ? <div className="muted small stages-state">Couldn't load history.</div>
            : cl ? <TicketStages transitions={cl.transitions} created={it.created} currentStatus={it.status} sprintStart={it.sprintStart} />
              : null
      )}
    </div>
  );
}
