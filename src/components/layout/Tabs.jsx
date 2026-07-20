export const TABS = [
  { id: "sprint", label: "Sprint Health" },
  { id: "planning", label: "Sprint Planning" },
  { id: "status", label: "Live Status" },
  { id: "impact", label: "My Impact" },
  { id: "recommendations", label: "Recommendations" },
  { id: "eazybi", label: "eazyBI" },
];

export function Tabs({ tab, onChange }) {
  return (
    <nav className="tabs" role="tablist" aria-label="Views">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id}
          className={"tab" + (tab === t.id ? " on" : "")} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
