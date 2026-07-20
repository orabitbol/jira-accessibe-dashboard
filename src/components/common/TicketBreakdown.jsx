// Drill-down list of a sprint's tickets, grouped by how they finished relative
// to the sprint window. `showAssignee` adds the person column.
function Row({ it, showAssignee }) {
  return (
    <a className="tk" href={it.webUrl} target="_blank" rel="noreferrer">
      <span className="tk-key">{it.key}</span>
      {showAssignee && <span className="tk-who">{it.assignee}</span>}
      <span className="tk-sum">{it.summary}</span>
      <span className="tk-status">{it.status}</span>
      {it.missing ? <span className="tk-miss">No estimate</span> : <span className="tk-sp">{it.pts} SP</span>}
    </a>
  );
}

export function TicketBreakdown({ done = [], late = [], open = [], noEstimate = 0, showAssignee = false }) {
  return (
    <div className="tkbreak">
      <div className="tkgroup">
        <div className="tkgroup-head done">✓ Closed in sprint ({done.length})</div>
        {done.length ? done.map((it) => <Row key={it.key} it={it} showAssignee={showAssignee} />)
          : <div className="muted small tkempty">None</div>}
      </div>
      {late.length > 0 && (
        <div className="tkgroup">
          <div className="tkgroup-head late">↪ Closed after sprint end — not counted for this sprint ({late.length})</div>
          {late.map((it) => <Row key={it.key} it={it} showAssignee={showAssignee} />)}
        </div>
      )}
      <div className="tkgroup">
        <div className="tkgroup-head undone">✗ Still open ({open.length})</div>
        {open.length ? open.map((it) => <Row key={it.key} it={it} showAssignee={showAssignee} />)
          : <div className="muted small tkempty">None</div>}
      </div>
      {noEstimate > 0 && (
        <div className="tknote">
          ⚠ {noEstimate} tasks with no Story Points — not counted toward goal attainment (can't measure commitment without an estimate). Worth avoiding going forward.
        </div>
      )}
    </div>
  );
}
