// Pure parsing helpers for eazyBI report JSON (no React, no network).
// eazyBI's "report results export" always returns the same shape regardless
// of report: query_results.{column_positions, row_positions, values,
// formatted_values}. We flatten that into a simple { columns, rows } table
// so every eazyBI-backed UI component works off one uniform structure.

export function parseReport(raw) {
  if (!raw || !raw.query_results) return null;
  const { column_positions = [], row_positions = [], values = [], formatted_values = [] } = raw.query_results;
  const columns = column_positions.map((c) => c[0].name);
  const rows = row_positions.map((r, i) => {
    const m = r[0];
    return {
      label: m.name,
      startDate: m.start_date || null,
      values: values[i] || [],
      formatted: formatted_values[i] || [],
    };
  });
  return { name: raw.label || raw.report_name, columns, rows, lastImportAt: raw.last_import_at || null };
}

// One column's values across every row, e.g. for a small trend line.
export function series(parsed, columnName) {
  if (!parsed) return [];
  const idx = parsed.columns.indexOf(columnName);
  if (idx === -1) return [];
  return parsed.rows.map((r) => ({ label: r.label, value: r.values[idx], formatted: r.formatted[idx] }));
}

// Mean of a column's numeric values (optionally just the last N rows) — for
// small KPI callouts. Formatted display elsewhere should prefer eazyBI's own
// `formatted` strings rather than re-deriving formatting from raw numbers.
export function average(parsed, columnName, lastN = null) {
  if (!parsed) return null;
  const idx = parsed.columns.indexOf(columnName);
  if (idx === -1) return null;
  const vals = parsed.rows.map((r) => r.values[idx]).filter((v) => typeof v === "number");
  const use = lastN ? vals.slice(-lastN) : vals;
  if (!use.length) return null;
  return use.reduce((a, b) => a + b, 0) / use.length;
}

export const EAZYBI_REPORTS = [
  { key: "throughputTrend", label: "Throughput Trend", kind: "time" },
  { key: "deliverySpeed", label: "Delivery Speed & Predictability Trend", kind: "time" },
  { key: "workflowDistribution", label: "Workflow Distribution", kind: "time-percent" },
  { key: "cycleTimeWidgetEngine", label: "Core Engine & accessWidget", kind: "sprint" },
  { key: "cycleTimePortal", label: "Portal", kind: "sprint" },
  { key: "cycleTimeAppsScan", label: "Apps & Scan", kind: "sprint" },
  { key: "cycleTimeAccessFlow", label: "accessFlow", kind: "sprint" },
];
