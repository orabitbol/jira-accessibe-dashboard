const TAB_IDS = ["sprint", "planning", "status", "impact", "recommendations", "eazybi"];
const TAB_KEY = {
  sprint: "tabs.sprint", planning: "tabs.planning", status: "tabs.status",
  impact: "tabs.impact", recommendations: "tabs.recommendations", eazybi: "tabs.eazybi",
};

export function Tabs({ tab, onChange, t }) {
  return (
    <nav className="tabs" role="tablist" aria-label={t("tabs.aria")}>
      {TAB_IDS.map((id) => (
        <button key={id} role="tab" aria-selected={tab === id}
          className={"tab" + (tab === id ? " on" : "")} onClick={() => onChange(id)}>
          {t(TAB_KEY[id])}
        </button>
      ))}
    </nav>
  );
}
