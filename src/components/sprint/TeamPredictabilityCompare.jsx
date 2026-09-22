import { shortSprint } from "../../domain/metrics.js";
import { Card } from "../common/Card.jsx";
import { InfoTip } from "../common/InfoTip.jsx";

// Cross-team "%Done from Committed" — the same shape ops reports out of
// eazyBI, computed here from live Jira instead.
//
// Deliberately NOT drawn as one chart with a shared X axis: after the 2026-08
// split each team runs its own board and its own sprint numbering, so two
// bars sitting in the same column would imply "same sprint" when they are not.
// Each team gets its own row of sprints, labelled with its own sprint names,
// and the comparison happens on the headline average — which IS comparable,
// because both are "share of what this team committed to that it delivered".
const pctClass = (pct, closed) => {
  if (!closed || pct == null) return "neutral";
  if (pct >= 80) return "ok";
  if (pct >= 60) return "warn";
  return "bad";
};

function TeamRow({ team, isActive, t }) {
  const rows = team.rows || [];
  return (
    <div className={"cmp-team" + (isActive ? " mine" : "")}>
      <div className="cmp-team-head">
        <span className="cmp-team-name">{team.name}</span>
        <span className="cmp-team-project">{team.project}</span>
        {isActive && <span className="pill ok">{t("cmp.yourTeam")}</span>}
      </div>
      {team.avg ? (
        <div className="cmp-avg">
          <span className="cmp-avg-val">{team.avg.pct}%</span>
          <span className="cmp-avg-lbl">{t("cmp.avgOver", { n: team.avg.sprints })}</span>
        </div>
      ) : (
        <div className="muted small">{t("cmp.noClosed")}</div>
      )}
      <div className="cmp-sprints">
        {rows.map((r) => (
          <div className="cmp-sprint" key={r.id}>
            <span className="cmp-sprint-label" title={r.name}>{shortSprint(r.name)}</span>
            <div className="cmp-track" title={r.pct == null
              ? t("predict.noCommitment")
              : `${r.done}/${r.committed}${r.closed ? "" : ` (${t("predict.inProgress")})`}`}>
              <div
                className={"cmp-fill " + pctClass(r.pct, r.closed) + (r.closed ? "" : " inprogress")}
                style={{ width: `${Math.min(100, Math.max(0, r.pct || 0))}%` }}
              />
            </div>
            <span className={"cmp-pct " + pctClass(r.pct, r.closed)}>{r.pct == null ? "—" : `${r.pct}%`}</span>
          </div>
        ))}
        {!rows.length && <div className="muted small">{t("cmp.noData")}</div>}
      </div>
    </div>
  );
}

export function TeamPredictabilityCompare({ compare, loading, onLoad, activeTeamId, t }) {
  return (
    <Card title={t("cmp.title")} desc={t("cmp.desc")}>
      {!compare && !loading && <button className="refresh" onClick={onLoad}>{t("cmp.loadBtn")}</button>}
      {loading && <div className="banner load">{t("cmp.fetching", { done: loading.done, total: loading.total })}</div>}
      {compare && (
        <>
          <div className="cmp-grid">
            {compare.byTeam.map((team) => (
              <TeamRow key={team.id} team={team} isActive={team.id === activeTeamId} t={t} />
            ))}
          </div>
          <div className="muted small cmp-foot">
            {t("cmp.footer")}
            <InfoTip text={t("cmp.footerTip")} />
          </div>
        </>
      )}
    </Card>
  );
}
