import { useState } from "react";
import { STATE_LABEL } from "../../utils/labels.js";

// One row inside an expandable drill-down list (open items / carry-over
// items). Shared so both lists look and behave the same way.
function ItemRow({ it, extra }) {
  return (
    <a href={it.webUrl} target="_blank" rel="noreferrer" className="openitem">
      <span className="key">{it.key}</span><span className="status">{it.status}</span>
      {extra}
      <span className="sp">{it.pts} SP</span>
      <span className="osum">{it.summary}</span>
    </a>
  );
}

export function DevCard({ r, mode = "points", t }) {
  const [, cls] = STATE_LABEL[r.state] || ["", ""];
  const label = t(`state.${r.state}`);
  const pct = Math.min(100, r.attainment);
  const [open, setOpen] = useState(false);
  const [showCarry, setShowCarry] = useState(false);
  const isCompletion = mode === "completion";
  const primaryDone = isCompletion ? r.doneItems : r.donePts;
  const primaryBase = isCompletion ? (r.committedItems || r.totalItems) : (r.committedPts || r.totalPts);
  const primaryUnit = isCompletion ? t("dev.unit.tasks") : t("dev.unit.sp");
  const secondary = isCompletion ? `${r.donePts}/${r.committedPts || r.totalPts} ${t("dev.unit.sp")}` : `${r.doneItems}/${r.totalItems} ${t("dev.unit.tasks")}`;
  const noItems = r.totalItems === 0;
  return (
    <div className={"dev " + cls}>
      <div className="dev-head">
        {r.avatar ? <img src={r.avatar} alt="" /> : <span className="ava" />}
        <div className="dev-name">{r.name}</div>
        <span className={"pill " + cls}>{label}</span>
      </div>
      {noItems ? (
        <div className="dev-nums muted">{t("dev.noTasks")}</div>
      ) : (
        <>
          <div className="dev-bar"><span style={{ width: `${pct}%` }} className={cls} /></div>
          <div className="dev-nums">
            <b>{primaryDone}</b> / {primaryBase} {primaryUnit} · {r.attainment}% · {secondary}
          </div>
        </>
      )}
      <div className="dev-tags">
        {r.addedMid > 0 && (
          <span className="tag">
            {t("dev.addedTag", { n: r.addedMid, sp: r.addedPts })}
            {r.addedDoneItems > 0 ? t("dev.addedDoneSuffix", { n: r.addedDoneItems }) : ""}
          </span>
        )}
        {r.removedItems > 0 && <span className="tag">{t("dev.removedTag", { n: r.removedItems, sp: r.removedPts })}</span>}
        {r.reopenedItems > 0 && <span className="tag warn">{t("dev.reopenedTag", { n: r.reopenedItems })}</span>}
        {r.carryOver > 0 && (
          <button className="tag warn tag-btn" onClick={() => setShowCarry(!showCarry)}>
            {t("dev.carryOverTag", { n: r.carryOver })}
          </button>
        )}
        {r.openItems.length > 0 && <button className="linkbtn" onClick={() => setOpen(!open)}>{open ? t("dev.hideBtn") : t("dev.openBtn", { n: r.openItems.length })}</button>}
      </div>
      {showCarry && (
        <div className="openlist">
          {r.carryOverList.map((it) => (
            <ItemRow key={it.key} it={it} extra={<span className="status sprintcount">{t("dev.sprintCount", { n: it.sprintCount })}</span>} />
          ))}
        </div>
      )}
      {open && (
        <div className="openlist">
          {r.openItems.map((it) => <ItemRow key={it.key} it={it} />)}
        </div>
      )}
    </div>
  );
}
