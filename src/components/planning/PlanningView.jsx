import { useMemo, useState } from "react";
import { myTeam } from "../../../teams.config.js";
import { planningStats } from "../../domain/metrics.js";
import { fmt } from "../../utils/format.js";
import { FilterBar } from "../common/FilterBar.jsx";
import { PeopleFilter } from "../common/PeopleFilter.jsx";
import { Card } from "../common/Card.jsx";
import { Kpi } from "../common/Kpi.jsx";
import { Explainer } from "../common/Explainer.jsx";
import { EstimationBanner } from "./EstimationBanner.jsx";
import { TicketList } from "./TicketList.jsx";

export function PlanningView({ rows }) {
  const roster = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.assigneeId)) m.set(r.assigneeId, { id: r.assigneeId, name: r.assignee, avatar: r.avatar, isMine: myTeam.members.some((x) => x.id === r.assigneeId), count: 0 });
      m.get(r.assigneeId).count += 1;
    }
    return [...m.values()].sort((p, q) => (q.isMine - p.isMine) || p.name.localeCompare(q.name));
  }, [rows]);
  const myIds = useMemo(() => roster.filter((p) => p.isMine).map((p) => p.id), [roster]);
  const [sel, setSel] = useState(null);
  const effective = sel ?? new Set(myIds);

  const shown = rows.filter((r) => effective.has(r.assigneeId));
  const st = planningStats(shown);
  const missing = shown.filter((r) => r.missing);
  const estimated = shown.filter((r) => !r.missing);

  return (
    <>
      <FilterBar>
        <PeopleFilter roster={roster} selected={effective} myIds={myIds} onChange={setSel} />
      </FilterBar>
      <Explainer>
        <b>What's shown here:</b> all tickets already assigned to the selected sprint (including future sprints), for the people you selected.
        <ul>
          <li>The goal: see in pre-planning what's still missing — mainly tickets <b>with no Story Points</b>.</li>
          <li>"No estimate" = Story Points has no value (or 0). Without an estimate you can't plan load or measure attainment.</li>
          <li>A future sprint only appears in the selector once tickets have already been assigned to it.</li>
        </ul>
      </Explainer>
      {!shown.length ? (
        <div className="banner load">No people selected, or they have no tickets in this sprint.</div>
      ) : (
        <>
          <EstimationBanner missing={st.missing} />
          <div className="kpis">
            <Kpi label="Tickets in sprint" value={fmt(st.total)} />
            <Kpi label="Total Story Points" value={fmt(st.points, 1)} />
            <Kpi label="No estimate" value={fmt(st.missing)} tone={st.missing ? "bad" : "good"} info="Tickets in the sprint with no Story Points — need to be estimated in pre-planning." />
            <Kpi label="Developers" value={fmt(st.people)} />
          </div>
          {missing.length > 0 && (
            <Card title="Waiting on an estimate" desc="Tickets in the sprint still with no Story Points.">
              <TicketList rows={missing} />
            </Card>
          )}
          <Card title="Estimated" desc="Tickets with Story Points.">
            {estimated.length ? <TicketList rows={estimated} /> : <div className="muted small">No estimated tickets yet.</div>}
          </Card>
        </>
      )}
    </>
  );
}
