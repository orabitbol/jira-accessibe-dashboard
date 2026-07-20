import { Fragment, useState } from "react";
import { shortSprint } from "../../domain/metrics.js";
import { attCell } from "../../utils/labels.js";
import { TicketBreakdown } from "../common/TicketBreakdown.jsx";

const SEV = {
  high: ["Needs attention", "bad"],
  med: ["Worth noting", "warn"],
  low: ["Great", "ok"],
};

export function RecommendationCard({ rec }) {
  const [label, cls] = SEV[rec.severity] || SEV.low;
  const [open, setOpen] = useState(false);
  const [openSprint, setOpenSprint] = useState(null);
  const hasBreakdown = rec.details && rec.details.kind === "sprints" && rec.details.rows.length;

  return (
    <div className={"rec rec-" + cls}>
      <div className="rec-head">
        <span className={"rec-sev " + cls}>{label}</span>
        <h3 className="rec-title">{rec.title}</h3>
      </div>
      <p className="rec-detail">{rec.detail}</p>
      {rec.evidence.length > 0 && (
        <div className="rec-evidence">
          {rec.evidence.map((e, i) => {
            const item = typeof e === "string" ? { label: e } : e;
            return item.url
              ? <a key={i} className="rec-chip link" href={item.url} target="_blank" rel="noreferrer">{item.label}</a>
              : <span key={i} className="rec-chip">{item.label}</span>;
          })}
        </div>
      )}

      {hasBreakdown && (
        <>
          <button className="linkbtn" style={{ marginTop: 10 }} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide breakdown" : "Show exactly where ↓"}
          </button>
          {open && (
            <div className="rec-breakdown table-scroll">
              <table>
                <thead>
                  <tr><th>Sprint</th><th>Committed</th><th>Closed</th><th>Attainment</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rec.details.rows.map((r, i) => (
                    <Fragment key={i}>
                      <tr className="clickrow" onClick={() => setOpenSprint(openSprint === i ? null : i)}>
                        <td className="name">{openSprint === i ? "▾ " : "▸ "}{shortSprint(r.sprint)}</td>
                        <td>{r.committedAmount} {r.unit}</td>
                        <td>{r.doneAmount} {r.unit}</td>
                        <td className={r.state === "active" ? "" : attCell(r.attainment)}>{r.attainment}%</td>
                        <td>
                          {r.state === "active"
                            ? <span className="pill active">In progress</span>
                            : r.attainment >= 80
                              ? <span className="pill ok">Met</span>
                              : <span className="pill bad">Missed</span>}
                        </td>
                      </tr>
                      {openSprint === i && (
                        <tr><td colSpan={5} className="nested">
                          <TicketBreakdown done={r.done} late={r.late} open={r.open} noEstimate={r.noEstimate} />
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
