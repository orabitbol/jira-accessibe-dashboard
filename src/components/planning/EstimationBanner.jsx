export function EstimationBanner({ missing }) {
  if (missing > 0) {
    return (
      <div className="estbanner warn">
        <span className="estbanner-ic">!</span>
        <div>
          <b>{missing} tickets with no Story Points</b>
          <div className="muted small">Worth completing the estimate in pre-planning so the metrics stay accurate.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="estbanner ok">
      <span className="estbanner-ic">✓</span>
      <div>
        <b>All tickets estimated</b>
        <div className="muted small">Great — every ticket in the sprint has Story Points.</div>
      </div>
    </div>
  );
}
