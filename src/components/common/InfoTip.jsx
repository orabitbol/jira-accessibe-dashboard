// Small "?" affordance with a hover/focus tooltip. Accessible (keyboard-focusable).
export function InfoTip({ text }) {
  return (
    <span className="infotip" tabIndex={0} role="img" aria-label={text}>
      <span className="infotip-i" aria-hidden="true">?</span>
      <span className="infotip-pop">{text}</span>
    </span>
  );
}
