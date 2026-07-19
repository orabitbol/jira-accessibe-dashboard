export function EstimationBanner({ missing }) {
  if (missing > 0) {
    return (
      <div className="estbanner warn">
        <span className="estbanner-ic">!</span>
        <div>
          <b>{missing} כרטיסיות ללא Story Points</b>
          <div className="muted small">כדאי להשלים הערכה ב‑pre‑planning כדי שהמדדים יהיו מדויקים.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="estbanner ok">
      <span className="estbanner-ic">✓</span>
      <div>
        <b>כל הכרטיסיות הוערכו</b>
        <div className="muted small">מצוין — לכל כרטיסייה בספרינט יש Story Points.</div>
      </div>
    </div>
  );
}
