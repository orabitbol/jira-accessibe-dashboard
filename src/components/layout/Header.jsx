// The two lenses for goal-attainment: Story Points (effort-weighted) vs.
// completed-task count (ignores points entirely). See src/domain/metrics.js.
const ATTAINMENT_MODES = [
  { id: "points", label: "By Story Points" },
  { id: "completion", label: "By tasks completed" },
];

export function Header({ updatedAt, loading, onReload, leadTeams = [], activeTeamId, onTeamChange, attainmentMode, onAttainmentModeChange }) {
  return (
    <header className="top">
      <div>
        <div className="title-row">
          {leadTeams.length > 1 && (
            <div className="seg" role="group" aria-label="Team selector">
              {leadTeams.map((t) => (
                <button key={t.id} type="button" className={activeTeamId === t.id ? "on" : ""} onClick={() => onTeamChange(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <h1>Widget &amp; Engine <span className="muted">· Team Metrics</span></h1>
        </div>
        <div className="muted small">
          {updatedAt ? <>Data as of <b>{updatedAt.toLocaleString("en-GB")}</b></> : "Loading…"}
        </div>
      </div>
      <div className="top-right">
        <div className="seg" role="group" aria-label="Goal attainment measurement method">
          {ATTAINMENT_MODES.map((m) => (
            <button key={m.id} type="button" className={attainmentMode === m.id ? "on" : ""} onClick={() => onAttainmentModeChange(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="refresh" onClick={onReload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
    </header>
  );
}
