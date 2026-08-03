import { useState } from "react";

// Small toggleable "how is this calculated?" panel. Reusable across tabs.
// `label` defaults to the translated "How is this calculated?" when `t` is
// passed; callers can still override with their own label string.
export function Explainer({ label, children, t }) {
  const [open, setOpen] = useState(false);
  const show = label ?? (t ? t("explainer.show") : "How is this calculated?");
  const hide = t ? t("explainer.hide") : "Hide explanation";
  return (
    <div className="explainer">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? hide : show}
      </button>
      {open && <div className="calcbox">{children}</div>}
    </div>
  );
}
