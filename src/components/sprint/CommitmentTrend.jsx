import { useState } from "react";
import { shortSprint, sprintTickets } from "../../domain/metrics.js";
import { attCell } from "../../utils/labels.js";
import { TicketBreakdown } from "../common/TicketBreakdown.jsx";

export function CommitmentTrend({ trend, recentSprints, sprintIssuesById = {}, mode = "points", t }) {
  const [showCalc, setShowCalc] = useState(false);
  const [openId, setOpenId] = useState(null);
  if (!trend.length) return null;
  const openSprint = recentSprints.find((s) => s.id === openId);
  const tickets = openSprint && sprintIssuesById[openId] ? sprintTickets(sprintIssuesById[openId], openSprint) : null;
  const isCompletion = mode === "completion";
  const unit = isCompletion ? t("trend.unit.tasks") : t("trend.unit.sp");
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>{t("trend.title")}</h2>
          <p className="desc">{isCompletion ? t("trend.descCompletion") : t("trend.descPoints")}</p>
        </div>
        <button className="linkbtn" onClick={() => setShowCalc(!showCalc)}>{showCalc ? t("explainer.hide") : t("explainer.show")}</button>
      </div>
      {showCalc && (
        <div className="calcbox">
          <b>{t("trend.calcTitle", { unit })}</b>
          <ul>
            <li>{t("trend.calc1")}</li>
            <li>{t("trend.calc2", { unit })}</li>
            <li>{t("trend.calc3", { unit })}</li>
            <li>{t("trend.calc4")}</li>
            <li>{t("trend.calc5")}</li>
          </ul>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>{t("trend.developer")}</th>{recentSprints.map((s) => (
              <th key={s.id}>
                <button className={"th-btn" + (openId === s.id ? " on" : "")} onClick={() => setOpenId(openId === s.id ? null : s.id)} title={t("trend.showTickets")}>
                  {shortSprint(s.name)} ▾
                </button>
              </th>
            ))}<th>{t("trend.average")}</th><th>{t("trend.trend")}</th></tr>
          </thead>
          <tbody>
            {trend.map((d) => (
              <tr key={d.id}>
                <td className="name">{d.name}</td>
                {recentSprints.map((s) => {
                  const p = d.points.find((x) => x.sprint === s.name);
                  return <td key={s.id} className={p ? attCell(p.attainment) : ""}>{p ? `${p.attainment}%` : "—"}</td>;
                })}
                <td className={d.avg == null ? "" : attCell(d.avg)}><b>{d.avg == null ? "—" : `${d.avg}%`}</b></td>
                <td>{d.recurring
                  ? <span className="dot warn" role="img" aria-label={t("trend.needsAttention")} title={t("trend.needsAttention")}>●</span>
                  : <span className="dot ok" role="img" aria-label={t("trend.consistent")} title={t("trend.consistent")}>●</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openSprint && (
        <div className="sprint-drill">
          <div className="sprint-drill-head">
            <b>{t("trend.ticketsIn", { name: shortSprint(openSprint.name) })}</b>
            <button className="linkbtn" onClick={() => setOpenId(null)}>{t("trend.close")}</button>
          </div>
          {tickets
            ? <TicketBreakdown done={tickets.done} late={tickets.late} open={tickets.open} noEstimate={tickets.noEstimate} showAssignee />
            : <div className="muted small">{t("trend.noData")}</div>}
        </div>
      )}
    </div>
  );
}
