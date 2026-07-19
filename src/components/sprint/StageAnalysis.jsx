import { useState } from "react";
import { Card } from "../common/Card.jsx";
import { StageBar } from "../charts/StageBar.jsx";
import { round } from "../../domain/metrics.js";
import { fmtDur, fmtDate } from "../../utils/format.js";

// Small toggle revealing which tickets were left out of a person's stage
// stats (e.g. Archived) and why — so "excluded" never means "hidden".
function ExcludedNote({ items }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;
  return (
    <div className="stage-excluded">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "הסתר" : `הצג ${items.length} כרטיסים שהוצאו מהחישוב`}
      </button>
      {open && (
        <div className="tkbreak" style={{ marginTop: 6 }}>
          {items.map((it) => (
            <a key={it.key} className="tk" href={it.webUrl} target="_blank" rel="noreferrer">
              <span className="tk-key">{it.key}</span>
              <span className="tk-sum">{it.summary}</span>
              <span className="tk-status">{it.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny inline icons (currentColor, no icon-library dependency).
const IconSwap = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M2 5.5h9.5M9 3l2.5 2.5L9 8" /><path d="M14 10.5H4.5M7 8l-2.5 2.5L7 13" />
  </svg>
);
const IconGauge = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M8 8L11 5" /><circle cx="8" cy="8" r="6" /><path d="M8 2.3v1.4M2.3 8h1.4M13.7 8h-1.4" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 2.5l2 2L5 13l-2.8.8L3 11z" />
  </svg>
);

// One compact chip per change type. Shows the NET change (first → latest)
// with a ×N count when it happened more than once; the full chronological
// list only appears if you click a chip that has more than one event.
function Chip({ icon, className, children, count, onExpand }) {
  return (
    <button type="button" className={"chg-chip " + className} onClick={onExpand} disabled={!onExpand}>
      {icon}
      <span className="chg-chip-text">{children}</span>
      {count > 1 && <span className="chg-count">×{count}</span>}
    </button>
  );
}

// Reveals tickets that were reassigned / re-estimated / re-scoped mid-sprint.
// Each ticket is ONE compact line with small chips (Jira-style); a chip only
// expands when there's more than a single event to show, so the common case
// (one hop, one edit) never needs an extra click.
function ChangedNote({ items }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null); // `${ticketKey}:${kind}` or null
  if (!items || !items.length) return null;
  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="stage-changed">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "הסתר" : `הצג ${items.length} כרטיסים שהשתנו באמצע הספרינט`}
      </button>
      {open && (
        <div className="chg-list">
          {items.map((it) => {
            const byField = {};
            for (const c of it.contentChanges) (byField[c.field] ||= []).push(c);
            return (
              <div key={it.key} className="chg-row">
                <a className="chg-ticket-link" href={it.webUrl} target="_blank" rel="noreferrer">
                  <span className="tk-key">{it.key}</span>
                  <span className="chg-ticket-sum">{it.summary}</span>
                </a>
                <div className="chg-chips">
                  {it.reassignments.length > 0 && (() => {
                    const r0 = it.reassignments[0], rN = it.reassignments[it.reassignments.length - 1];
                    const id = it.key + ":reassign";
                    return (
                      <span className="chg-chip-wrap">
                        <Chip icon={<IconSwap />} className="swap" count={it.reassignments.length}
                          onExpand={it.reassignments.length > 1 ? () => toggle(id) : undefined}>
                          <span dir="ltr">{r0.fromName} → {rN.toName}</span>
                        </Chip>
                        {expanded === id && (
                          <div className="chg-history">
                            {it.reassignments.map((r, i) => (
                              <div key={i} className="chg-hline" dir="ltr">{r.fromName} → {r.toName} <span className="muted">· {fmtDate(r.at)}</span></div>
                            ))}
                          </div>
                        )}
                      </span>
                    );
                  })()}
                  {it.pointsChanges.length > 0 && (() => {
                    const p0 = it.pointsChanges[0], pN = it.pointsChanges[it.pointsChanges.length - 1];
                    const id = it.key + ":points";
                    return (
                      <span className="chg-chip-wrap">
                        <Chip icon={<IconGauge />} className="points" count={it.pointsChanges.length}
                          onExpand={it.pointsChanges.length > 1 ? () => toggle(id) : undefined}>
                          <span dir="ltr">SP {p0.from ?? "—"} → {pN.to ?? "—"}</span>
                        </Chip>
                        {expanded === id && (
                          <div className="chg-history">
                            {it.pointsChanges.map((c, i) => (
                              <div key={i} className="chg-hline" dir="ltr">SP {c.from ?? "—"} → {c.to ?? "—"} <span className="muted">· {fmtDate(c.at)}</span></div>
                            ))}
                          </div>
                        )}
                      </span>
                    );
                  })()}
                  {Object.entries(byField).map(([field, list]) => {
                    const first = list[0], last = list[list.length - 1];
                    const id = it.key + ":" + field;
                    const label = field === "summary" ? "Title" : "Description";
                    return (
                      <span className="chg-chip-wrap" key={field}>
                        <Chip icon={<IconEdit />} className="content" count={list.length} onExpand={() => toggle(id)}>
                          {label} edited
                        </Chip>
                        {expanded === id && (
                          <div className="chg-diff">
                            <div className="chg-before"><span className="chg-label">לפני:</span> {first.from || "—"}</div>
                            <div className="chg-after"><span className="chg-label">אחרי:</span> {last.to || "—"}</div>
                            <div className="muted small" style={{ marginTop: 4 }}>{fmtDate(last.at)}{list.length > 1 ? ` · נערך ${list.length} פעמים` : ""}</div>
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StageAnalysis({ stages, loading, onLoad }) {
  let cycleNote = null;
  if (stages && stages.length) {
    const items = stages.reduce((a, p) => a + p.items, 0);
    const cycleSum = stages.reduce((a, p) => a + (p.cycleDays || 0), 0);
    if (items) cycleNote = round(cycleSum / items, 1);
  }
  return (
    <Card title="Stage Analysis — time per status (within the sprint)" desc="Total time the team's items spent in each status during the current sprint (from the changelog). Loaded on demand.">
      {!stages && !loading && <button className="refresh" onClick={onLoad}>Load stage analysis for this sprint</button>}
      {loading && <div className="banner load">Fetching status history {loading.done}/{loading.total}…</div>}
      {stages && (stages.length ? (
        <>
          {cycleNote != null && (
            <div className="muted small" style={{ marginBottom: 12 }}>
              Average cycle time (work start → done, excluding To-Do wait): <b>{fmtDur(cycleNote)}</b> per item.
            </div>
          )}
          <div className="stage-people">
            {stages.map((p) => {
              const waited = round(p.total - p.cycleDays, 2);
              return (
                <div className="stage-row" key={p.id}>
                  <div className="stage-row-top">
                    <div className="stage-who">
                      {p.avatar ? <img src={p.avatar} alt="" /> : <span className="ava" />}
                      <span className="stage-name">{p.name}</span>
                    </div>
                    <div className="stage-stats">
                      <span className="stat">{p.items} items</span>
                      <span className="stat work">worked {fmtDur(p.cycleDays)}</span>
                      <span className="stat wait">waited {fmtDur(waited)} in To-Do</span>
                      {p.excludedCount > 0 && (
                        <span className="stat archived" title="כרטיסים שהועברו לארכיון/בוטלו — לא נחשבים כעבודה ולכן לא נספרים כאן">
                          {p.excludedCount} archived — not counted
                        </span>
                      )}
                      {p.changedCount > 0 && (
                        <span className="stat changed" title="הכרטיס עבר בין אנשים, ההערכה שלו השתנתה, או שהתוכן שלו נערך תוך כדי הספרינט — הזמן עדיין מחולק נכון בין מי שבאמת עבד עליו">
                          {p.changedCount} changed mid-sprint
                        </span>
                      )}
                    </div>
                  </div>
                  {p.stages.length > 0 ? <StageBar stages={p.stages} /> : (
                    <div className="muted small">כל הכרטיסים של האדם הזה בספרינט הועברו לארכיון — אין נתוני עבודה להצגה.</div>
                  )}
                  <ExcludedNote items={p.excluded} />
                  <ChangedNote items={p.changed} />
                </div>
              );
            })}
          </div>
          <div className="muted small stage-foot">רחף על מקטע לפרטים · מקווקו = To-Do (המתנה) · כרטיסים שהועברו לארכיון לא נכללים בחישוב · זמן עבודה מחולק לפי מי שבאמת החזיק בכרטיס בכל רגע</div>
        </>
      ) : <div className="muted small">No stage data for the team in this sprint.</div>)}
    </Card>
  );
}
