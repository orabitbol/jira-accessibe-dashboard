import { useState } from "react";
import { STATE_LABEL } from "../../utils/labels.js";

export function DevCard({ r, mode = "points" }) {
  const [label, cls] = STATE_LABEL[r.state] || ["", ""];
  const pct = Math.min(100, r.attainment);
  const [open, setOpen] = useState(false);
  const isCompletion = mode === "completion";
  const primaryDone = isCompletion ? r.doneItems : r.donePts;
  const primaryBase = isCompletion ? (r.committedItems || r.totalItems) : (r.committedPts || r.totalPts);
  const primaryUnit = isCompletion ? "משימות" : "SP";
  const secondary = isCompletion ? `${r.donePts}/${r.committedPts || r.totalPts} SP` : `${r.doneItems}/${r.totalItems} איטמים`;
  const noItems = r.totalItems === 0;
  return (
    <div className={"dev " + cls}>
      <div className="dev-head">
        {r.avatar ? <img src={r.avatar} alt="" /> : <span className="ava" />}
        <div className="dev-name">{r.name}</div>
        <span className={"pill " + cls}>{label}</span>
      </div>
      {noItems ? (
        <div className="dev-nums muted">אין משימות משויכות בספרינט הזה</div>
      ) : (
        <>
          <div className="dev-bar"><span style={{ width: `${pct}%` }} className={cls} /></div>
          <div className="dev-nums">
            <b>{primaryDone}</b> / {primaryBase} {primaryUnit} · {r.attainment}% · {secondary}
          </div>
        </>
      )}
      <div className="dev-tags">
        {r.addedMid > 0 && <span className="tag">+{r.addedMid} נוספו באמצע ({r.addedPts} SP)</span>}
        {r.carryOver > 0 && <span className="tag warn">{r.carryOver} carry-over</span>}
        {r.openItems.length > 0 && <button className="linkbtn" onClick={() => setOpen(!open)}>{open ? "הסתר" : `${r.openItems.length} פתוחים`}</button>}
      </div>
      {open && (
        <div className="openlist">
          {r.openItems.map((it) => (
            <a key={it.key} href={it.webUrl} target="_blank" rel="noreferrer" className="openitem">
              <span className="key">{it.key}</span><span className="status">{it.status}</span><span className="sp">{it.pts} SP</span>
              <span className="osum">{it.summary}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
