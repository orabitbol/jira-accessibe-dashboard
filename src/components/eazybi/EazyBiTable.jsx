// Generic table for any parsed eazyBI report (src/domain/eazybi.js). Every
// eazyBI report reduces to the same shape — a row label (month or sprint)
// plus N measure columns — so one component renders all of them.
export function EazyBiTable({ parsed, rowLabelHeader = "Period" }) {
  if (!parsed || !parsed.rows.length) return <div className="muted small">No data.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{rowLabelHeader}</th>
            {parsed.columns.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((r, i) => (
            <tr key={r.label} className={i === parsed.rows.length - 1 ? "active" : ""}>
              <td className="name">{r.label}</td>
              {r.formatted.map((v, j) => <td key={j}>{v ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
