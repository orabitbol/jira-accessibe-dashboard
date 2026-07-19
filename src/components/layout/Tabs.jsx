export const TABS = [
  { id: "sprint", label: "בריאות ספרינט" },
  { id: "planning", label: "תכנון ספרינט" },
  { id: "status", label: "סטטוס חי" },
  { id: "impact", label: "ההשפעה שלי" },
  { id: "recommendations", label: "המלצות" },
];

export function Tabs({ tab, onChange }) {
  return (
    <nav className="tabs" role="tablist" aria-label="תצוגות">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id}
          className={"tab" + (tab === t.id ? " on" : "")} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
