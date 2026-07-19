import { useState } from "react";

// Small toggleable "how is this calculated?" panel. Reusable across tabs.
export function Explainer({ label = "איך זה מחושב?", children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="explainer">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "הסתר הסבר" : label}
      </button>
      {open && <div className="calcbox">{children}</div>}
    </div>
  );
}
