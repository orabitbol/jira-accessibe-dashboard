import { LANGS } from "../../i18n.js";

export function Header({
  updatedAt, loading, onReload, leadTeams = [], activeTeamId, onTeamChange,
  attainmentMode, onAttainmentModeChange, lang, onLangChange, t,
}) {
  // The two lenses for goal-attainment: Story Points (effort-weighted) vs.
  // completed-task count (ignores points entirely). See src/domain/metrics.js.
  const ATTAINMENT_MODES = [
    { id: "points", label: t("app.byPoints") },
    { id: "completion", label: t("app.byTasks") },
  ];
  return (
    <header className="top">
      <div>
        <div className="title-row">
          {leadTeams.length > 1 && (
            <div className="seg" role="group" aria-label={t("app.teamSelector")}>
              {leadTeams.map((tm) => (
                <button key={tm.id} type="button" className={activeTeamId === tm.id ? "on" : ""} onClick={() => onTeamChange(tm.id)}>
                  {tm.name}
                </button>
              ))}
            </div>
          )}
          <div className="seg lang-seg" role="group" aria-label={t("app.langSelector")}>
            {LANGS.map((l) => (
              <button key={l.id} type="button" className={lang === l.id ? "on" : ""} title={l.label} onClick={() => onLangChange(l.id)}>
                <span aria-hidden="true">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
          <h1>{t("app.title")} <span className="muted">· {t("app.subtitle")}</span></h1>
        </div>
        <div className="muted small">
          {updatedAt ? <>{t("app.dataAsOf")} <b>{updatedAt.toLocaleString("en-GB")}</b></> : t("app.loading")}
        </div>
      </div>
      <div className="top-right">
        <div className="seg" role="group" aria-label={t("app.attainmentMethod")}>
          {ATTAINMENT_MODES.map((m) => (
            <button key={m.id} type="button" className={attainmentMode === m.id ? "on" : ""} onClick={() => onAttainmentModeChange(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="refresh" onClick={onReload} disabled={loading}>
          {loading ? t("app.loading") : t("app.refresh")}
        </button>
      </div>
    </header>
  );
}
