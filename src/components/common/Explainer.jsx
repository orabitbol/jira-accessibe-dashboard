import { useState } from "react";

// Small toggleable "how is this calculated?" panel. Reusable across tabs.
export function Explainer({ label = "How is this calculated?", children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="explainer">
      <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide explanation" : label}
      </button>
      {open && <div className="calcbox">{children}</div>}
    </div>
  );
}
