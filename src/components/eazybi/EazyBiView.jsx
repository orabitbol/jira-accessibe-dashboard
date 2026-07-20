import { useEffect, useState } from "react";
import { fetchEazyBiReport } from "../../services/eazybiApi.js";
import { parseReport, EAZYBI_REPORTS } from "../../domain/eazybi.js";
import { Card } from "../common/Card.jsx";
import { InfoTip } from "../common/InfoTip.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { EazyBiTable } from "./EazyBiTable.jsx";
import { WorkflowDistributionChart } from "./WorkflowDistributionChart.jsx";
import { Sparkline } from "./Sparkline.jsx";
import { TrendBadge } from "./TrendBadge.jsx";
import { SprintCycleBar } from "./SprintCycleBar.jsx";
import { IconTeam, IconChart, IconGaugeSpeed, IconLayers, IconClock } from "./icons.jsx";

const TEAM_CARDS = [
  { key: "cycleTimeWidgetEngine", title: "Widget & Engine", mine: true },
  { key: "cycleTimePortal", title: "Portal" },
  { key: "cycleTimeAppsScan", title: "Apps & Scan" },
  { key: "cycleTimeAccessFlow", title: "accessFlow" },
];

const STAGE_LEGEND = [
  { cls: "eb-dev", label: "Development", desc: "Time actively being coded, before code review." },
  { cls: "eb-review", label: "Code Review", desc: "Time waiting for or undergoing code review." },
  { cls: "eb-qa", label: "QA", desc: "Time spent in testing/QA." },
  { cls: "eb-release", label: "Release", desc: "Time from approval to actually shipping." },
];

function last(parsed, colName) {
  if (!parsed) return null;
  const idx = parsed.columns.indexOf(colName);
  if (idx === -1) return null;
  const row = parsed.rows[parsed.rows.length - 1];
  return row ? row.values[idx] : null;
}
function prev(parsed, colName) {
  if (!parsed) return null;
  const idx = parsed.columns.indexOf(colName);
  if (idx === -1) return null;
  const row = parsed.rows[parsed.rows.length - 2];
  return row ? row.values[idx] : null;
}
function lastFmt(parsed, colName) {
  if (!parsed) return "—";
  const idx = parsed.columns.indexOf(colName);
  if (idx === -1) return "—";
  const row = parsed.rows[parsed.rows.length - 1];
  return row ? row.formatted[idx] : "—";
}
function prevFmt(parsed, colName) {
  if (!parsed) return "—";
  const idx = parsed.columns.indexOf(colName);
  if (idx === -1) return "—";
  const row = parsed.rows[parsed.rows.length - 2];
  return row ? row.formatted[idx] : "—";
}

function TeamCycleCard({ title, mine, parsed }) {
  const [showTable, setShowTable] = useState(false);
  if (!parsed || !parsed.rows.length) return <div className="muted small">No data.</div>;
  const rowsDesc = [...parsed.rows].reverse();

  return (
    <div className={"eazybi-team-block" + (mine ? " mine" : "")}>
      <div className="eazybi-team-title">
        <IconTeam />
        {title}
        {mine && <span className="pill ok">Your team</span>}
      </div>
      <div className="eazybi-team-kpis">
        <div className="eazybi-mini-kpi">
          <span className="eazybi-mini-kpi-lbl">
            Median cycle time
            <InfoTip text={`Half of this team's tickets finish faster than this, half slower. Previous sprint: ${prevFmt(parsed, "Median Cycle Time")}d.`} />
          </span>
          <span className="eazybi-mini-kpi-val">{lastFmt(parsed, "Median Cycle Time")}d</span>
          <TrendBadge current={last(parsed, "Median Cycle Time")} previous={prev(parsed, "Median Cycle Time")} betterWhenLower decimals={1} label="vs prev sprint" />
        </div>
        <div className="eazybi-mini-kpi">
          <span className="eazybi-mini-kpi-lbl">
            Issues resolved
            <InfoTip text={`Tickets closed in the most recent sprint. Previous sprint: ${prevFmt(parsed, "Issues resolved")}.`} />
          </span>
          <span className="eazybi-mini-kpi-val">{lastFmt(parsed, "Issues resolved")}</span>
          <TrendBadge current={last(parsed, "Issues resolved")} previous={prev(parsed, "Issues resolved")} decimals={0} label="vs prev sprint" />
        </div>
      </div>
      <div className="sprint-cycle-list">
        {rowsDesc.slice(0, 8).map((r, i) => <SprintCycleBar key={r.label} row={r} columns={parsed.columns} isLatest={i === 0} />)}
      </div>
      <button className="linkbtn" onClick={() => setShowTable(!showTable)}>{showTable ? "Hide full table" : "Show full table"}</button>
      {showTable && <EazyBiTable parsed={parsed} rowLabelHeader="Sprint" />}
    </div>
  );
}

function TrendCard({ title, desc, icon, parsed, metric, betterWhenLower = false, decimals = 1, color = "#4f46e5", info }) {
  const [showTable, setShowTable] = useState(false);
  if (!parsed || !parsed.rows.length) return <Card title={title} desc={desc} icon={icon}><div className="muted small">No data.</div></Card>;
  const values = parsed.rows.map((r) => r.values[parsed.columns.indexOf(metric)]);
  return (
    <Card title={title} desc={desc} icon={icon}>
      <div className="eazybi-trend-head">
        <div>
          <div className="eazybi-mini-kpi-lbl">{metric}{info && <InfoTip text={info} />}</div>
          <div className="eazybi-mini-kpi-val big">{lastFmt(parsed, metric)}</div>
          <TrendBadge current={last(parsed, metric)} previous={prev(parsed, metric)} betterWhenLower={betterWhenLower} decimals={decimals} label="vs previous month" />
        </div>
        <div className="eazybi-sparkline"><Sparkline values={values} color={color} /></div>
      </div>
      <button className="linkbtn" onClick={() => setShowTable(!showTable)}>{showTable ? "Hide monthly numbers" : "Show monthly numbers"}</button>
      {showTable && <EazyBiTable parsed={parsed} rowLabelHeader="Month" />}
    </Card>
  );
}

export function EazyBiView() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      EAZYBI_REPORTS.map((r) =>
        fetchEazyBiReport(r.key)
          .then((raw) => [r.key, parseReport(raw)])
          .catch((e) => [r.key, null, String(e && e.message ? e.message : e)])
      )
    )
      .then((triples) => {
        if (cancelled) return;
        const map = {};
        let firstError = null;
        for (const [key, val, err] of triples) {
          map[key] = val;
          if (err && !firstError) firstError = err;
        }
        setReports(map);
        if (firstError) setError(firstError);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="banner load">Loading eazyBI reports…</div>;
  if (!reports) return <div className="banner err">Couldn't load eazyBI data{error ? `: ${error}` : "."}</div>;

  const lastImportAt = reports.throughputTrend && reports.throughputTrend.lastImportAt;
  const p75 = reports.deliverySpeed;

  const P75_KPIS = [
    { metric: "Median Cycle Time", color: "#4f46e5", info: "Half of all resolved tickets this month finished faster than this, half slower." },
    { metric: "P75 Progress Workdays", color: "#dc2626", info: "75% of tickets finished within this many workdays — a predictability signal: the lower and steadier this line, the more consistent delivery is." },
    { metric: "Average Progress workdays", color: "#059669", info: "Plain average cycle time — more sensitive to a few very slow outlier tickets than the median." },
  ];

  return (
    <>
      <Explainer label="What is this?">
        <b>Source:</b> eazyBI, a separate BI app connected to the same Jira data. Unlike the rest of this dashboard, eazyBI is <u>not</u> live — it refreshes on its own periodic import schedule
        {lastImportAt && <> (last refreshed <b>{new Date(lastImportAt).toLocaleString("en-GB")}</b>)</>}.
        <ul>
          <li><b>Cycle time by team</b> — per sprint, how many workdays tickets spent in Development / Code Review / QA / Release, and the sprint's median cycle time.</li>
          <li><b>Throughput Trend</b> — issues resolved per month, across all teams.</li>
          <li><b>Delivery Speed &amp; Predictability</b> — median and P75 cycle time per month (P75 = 75% of tickets finished within this many days — a predictability signal, not just an average).</li>
          <li><b>Workflow Distribution</b> — what share of total cycle time each stage consumed, per month.</li>
        </ul>
        <span className="muted">Hover any number, badge, or bar segment for an explanation.</span>
      </Explainer>

      {error && <div className="banner err">Some eazyBI reports failed to load: {error}</div>}

      <Card title="Cycle time by team" desc="Per sprint: issues resolved, workdays per stage, and median cycle time. Most recent sprint first." icon={<IconClock />}>
        <div className="wf-legend" style={{ marginBottom: 14 }}>
          {STAGE_LEGEND.map((s) => (
            <span key={s.cls} className="wf-legend-item" title={s.desc}>
              <i className={"wf-dot " + s.cls} />{s.label}
            </span>
          ))}
        </div>
        <div className="eazybi-team-grid">
          {TEAM_CARDS.map((t) => <TeamCycleCard key={t.key} title={t.title} mine={t.mine} parsed={reports[t.key]} />)}
        </div>
      </Card>

      <TrendCard
        title="Throughput Trend" desc="Issues resolved per month, across all teams." icon={<IconChart />}
        parsed={reports.throughputTrend} metric="Issues resolved" decimals={0} color="#4f46e5"
        info="Total tickets marked Done in the month, across every team — a raw volume signal, not adjusted for ticket size."
      />

      <Card title="Delivery Speed & Predictability" desc="Median and P75 cycle time per month, in workdays." icon={<IconGaugeSpeed />}>
        <div className="eazybi-kpis-3">
          {P75_KPIS.map(({ metric, color, info }) => (
            <div key={metric} className="eazybi-mini-kpi">
              <span className="eazybi-mini-kpi-lbl">{metric}<InfoTip text={info} /></span>
              <span className="eazybi-mini-kpi-val">{lastFmt(p75, metric)}d</span>
              <TrendBadge current={last(p75, metric)} previous={prev(p75, metric)} betterWhenLower decimals={1} label="vs prev month" />
              <div className="eazybi-sparkline small"><Sparkline values={p75 ? p75.rows.map((r) => r.values[p75.columns.indexOf(metric)]) : []} color={color} height={30} /></div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Workflow Distribution" desc="Share of total cycle time each stage consumed, per month." icon={<IconLayers />}>
        <WorkflowDistributionChart parsed={reports.workflowDistribution} />
      </Card>
    </>
  );
}
