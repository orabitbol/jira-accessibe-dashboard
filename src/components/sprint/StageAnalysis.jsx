import { useState } from "react";
import { Card } from "../common/Card.jsx";
import { StageBar } from "../charts/StageBar.jsx";
import { StageGroupBar } from "../charts/StageGroupBar.jsx";
import { round, sprintElapsedWorkdays, STAGE_GROUPS } from "../../domain/metrics.js";
import { fmtDur, fmtDate } from "../../utils/format.js";
import { STATE_LABEL } from "../../utils/labels.js";

const GROUP_LEGEND_CLASS = { development: "eb-dev", codeReview: "eb-review", qa: "eb-qa", productReview: "eb-product", release: "eb-release" };
// Mirrors StageGroupBar's own mapping — STAGE_GROUPS (metrics.js) is shared,
// non-UI data, so translated labels live here, keyed by g.key.
const GROUP_I18N_KEY = {
  development: "stagegroup.development", codeReview: "stagegroup.codeReview", qa: "stagegroup.qa",
  productReview: "stagegroup.productReview", release: "stagegroup.release", other: "stagegroup.other",
};

// Reveals tickets a person is also carrying OUTSIDE this Stage Analysis scope
// (other projects, or other items in your own project outside this sprint) — visibility only,
// never mixed into the numbers above, so real workload doesn't quietly "fall
// between the chairs" just because it isn't part of what this view measures.
function OtherWorkNote({ items, t }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;
  return (
    <div className="stage-otherwork">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open} title={t("stage.otherWorkTitle")}>
        {open ? t("dev.hideBtn") : t("stage.otherWorkShow", { n: items.length })}
      </button>
      {open && (
        <div className="tkbreak" style={{ marginTop: 6 }}>
          {items.map((it) => (
            <a key={it.key} className="tk" href={it.webUrl} target="_blank" rel="noreferrer">
              <span className="tk-key">{it.key}</span>
              <span className="tk-sum">{it.summary}</span>
              <span className="tk-status">{it.project} · {it.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Small toggle revealing which tickets were left out of a person's stage
// stats (e.g. Archived) and why — so "excluded" never means "hidden".
function ExcludedNote({ items, t }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;
  return (
    <div className="stage-excluded">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? t("dev.hideBtn") : t("stage.excludedShow", { n: items.length })}
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

// Tickets that were marked Done and then moved back out — see wasReopened()
// in metrics.js. Same reveal pattern as ExcludedNote/ChangedNote above.
function ReopenedNote({ items, t }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;
  return (
    <div className="stage-reopened">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? t("dev.hideBtn") : t("stage.showReopened", { n: items.length })}
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
function ChangedNote({ items, t }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null); // `${ticketKey}:${kind}` or null
  if (!items || !items.length) return null;
  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="stage-changed">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? t("dev.hideBtn") : t("stage.changedShow", { n: items.length })}
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
                          <span>{r0.fromName} → {rN.toName}</span>
                        </Chip>
                        {expanded === id && (
                          <div className="chg-history">
                            {it.reassignments.map((r, i) => (
                              <div key={i} className="chg-hline">{r.fromName} → {r.toName} <span className="muted">· {fmtDate(r.at)}</span></div>
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
                          <span>SP {p0.from ?? "—"} → {pN.to ?? "—"}</span>
                        </Chip>
                        {expanded === id && (
                          <div className="chg-history">
                            {it.pointsChanges.map((c, i) => (
                              <div key={i} className="chg-hline">SP {c.from ?? "—"} → {c.to ?? "—"} <span className="muted">· {fmtDate(c.at)}</span></div>
                            ))}
                          </div>
                        )}
                      </span>
                    );
                  })()}
                  {Object.entries(byField).map(([field, list]) => {
                    const first = list[0], last = list[list.length - 1];
                    const id = it.key + ":" + field;
                    const label = field === "summary" ? t("stage.titleEdited") : t("stage.descEdited");
                    return (
                      <span className="chg-chip-wrap" key={field}>
                        <Chip icon={<IconEdit />} className="content" count={list.length} onExpand={() => toggle(id)}>
                          {label}
                        </Chip>
                        {expanded === id && (
                          <div className="chg-diff">
                            <div className="chg-before"><span className="chg-label">{t("stage.before")}</span> {first.from || "—"}</div>
                            <div className="chg-after"><span className="chg-label">{t("stage.after")}</span> {last.to || "—"}</div>
                            <div className="muted small" style={{ marginTop: 4 }}>{fmtDate(last.at)}{list.length > 1 ? ` · ${t("stage.editedTimes", { n: list.length })}` : ""}</div>
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

export function StageAnalysis({ stages, loading, onLoad, sprint, t }) {
  let cycleNote = null;
  if (stages && stages.length) {
    const items = stages.reduce((a, p) => a + p.items, 0);
    const cycleSum = stages.reduce((a, p) => a + (p.cycleDays || 0), 0);
    if (items) cycleNote = round(cycleSum / items, 1);
  }
  // How many WORKDAYS of the sprint have elapsed so far — lets each workday
  // duration below be read as "X% of the sprint's workdays that already
  // passed" instead of a bare number with no scale to judge it against.
  const elapsedWorkdays = sprint ? sprintElapsedWorkdays(sprint) : null;
  return (
    <Card title={t("stage.title")} desc={t("stage.desc")}>
      {!stages && !loading && <button className="refresh" onClick={onLoad}>{t("stage.loadBtn")}</button>}
      {loading && <div className="banner load">{t("stage.fetching", { done: loading.done, total: loading.total })}</div>}
      {stages && (stages.length ? (
        <>
          {cycleNote != null && (
            <div className="muted small" style={{ marginBottom: 12 }}>
              {t("stage.avgCycleTimePrefix")} <b>{fmtDur(cycleNote)}</b> {t("stage.avgCycleTimeSuffix")}
            </div>
          )}
          <div className="wf-legend" style={{ marginBottom: 12 }}>
            {STAGE_GROUPS.map((g) => (
              <span key={g.key} className="wf-legend-item" title={t("stage.legendTitle", { label: t(GROUP_I18N_KEY[g.key]) })}>
                <i className={"wf-dot " + GROUP_LEGEND_CLASS[g.key]} />{t(GROUP_I18N_KEY[g.key])}
              </span>
            ))}
          </div>
          <div className="stage-people">
            {stages.map((p) => {
              const waited = round(p.total - p.cycleDays, 2);
              return (
                <div className="stage-row" key={p.id}>
                  <div className="stage-row-top">
                    <div className="stage-who">
                      {p.avatar ? <img src={p.avatar} alt="" /> : <span className="ava" />}
                      <span className="stage-name">{p.name}</span>
                      {p.commitment && (
                        <span className={"pill " + ((STATE_LABEL[p.commitment.state] || ["", ""])[1])} title={t("stage.commitmentPillTitle", { pct: p.commitment.attainment })}>
                          {t(`state.${p.commitment.state}`)} · {p.commitment.attainment}%
                        </span>
                      )}
                    </div>
                    <div className="stage-stats">
                      <span className="stat">{t("stage.itemsCount", { n: p.items })}</span>
                      <span className="stat work" title={t("stage.workedTitle")}>{t("stage.workedLabel", { val: fmtDur(p.items ? p.cycleDays / p.items : 0) })}</span>
                      <span className="stat wait" title={t("stage.waitedTitle")}>{t("stage.waitedLabel", { val: fmtDur(p.items ? waited / p.items : 0) })}</span>
                      {p.excludedCount > 0 && (
                        <span className="stat archived" title={t("stage.archivedTitle")}>
                          {t("stage.archivedLabel", { n: p.excludedCount })}
                        </span>
                      )}
                      {p.changedCount > 0 && (
                        <span className="stat changed" title={t("stage.changedTitle")}>
                          {t("stage.changedLabel", { n: p.changedCount })}
                        </span>
                      )}
                      {p.reopenedCount > 0 && (
                        <span className="stat reopened" title={t("stage.reopenedTitle")}>
                          {t("stage.reopenedLabel", { n: p.reopenedCount })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="stage-bars">
                    {p.groups && p.groups.length > 0 && (
                      <div className="stage-bar-block">
                        <div className="stage-bar-label" title={t("stage.groupBarTitle")}>{t("stage.barLabelEazybi")}</div>
                        <StageGroupBar groups={p.groups} items={p.items} t={t} />
                      </div>
                    )}
                    {p.stages.length > 0 ? (
                      <div className="stage-bar-block">
                        <div className="stage-bar-label" title={t("stage.detailBarTitle")}>{t("stage.barLabelDetail")}</div>
                        <StageBar stages={p.stages} items={p.items} elapsedDays={elapsedWorkdays} t={t} />
                      </div>
                    ) : (
                      <div className="muted small">
                        {p.items === 0 && p.excludedCount === 0 ? t("stage.noTasksPerson") : t("stage.allArchived")}
                      </div>
                    )}
                  </div>
                  <ExcludedNote items={p.excluded} t={t} />
                  <ChangedNote items={p.changed} t={t} />
                  <ReopenedNote items={p.reopened} t={t} />
                  <OtherWorkNote items={p.otherWork} t={t} />
                </div>
              );
            })}
          </div>
          <div className="muted small stage-foot">{t("stage.footer")}</div>
        </>
      ) : <div className="muted small">{t("stage.noData")}</div>)}
    </Card>
  );
}
