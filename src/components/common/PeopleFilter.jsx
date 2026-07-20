import { useRef, useState } from "react";
import { useOutsideClick } from "../../hooks/useOutsideClick.js";

// Compact multi-select people picker (button + popover with checkboxes).
export function PeopleFilter({ roster, selected, myIds, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const allIds = roster.map((p) => p.id);
  const sameSet = (a, ids) => a.size === ids.length && ids.every((id) => a.has(id));
  const isMine = sameSet(selected, myIds) && myIds.length > 0;
  const isAll = sameSet(selected, allIds) && allIds.length > 0;
  const label = isMine ? "My team" : isAll ? "Everyone" : selected.size === 0 ? "None selected" : `${selected.size} selected`;
  const toggle = (id) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); onChange(n); };

  return (
    <div className="pfilter" ref={ref}>
      <span className="pf-label">People:</span>
      <button className="pfilter-btn" onClick={() => setOpen(!open)}>
        {label}<span className="caret">▾</span>
      </button>
      {open && (
        <div className="pfilter-pop">
          <div className="pfilter-presets">
            <button onClick={() => onChange(new Set(myIds))}>My team</button>
            <button onClick={() => onChange(new Set(allIds))}>Everyone</button>
            <button onClick={() => onChange(new Set())}>Clear</button>
          </div>
          <div className="pfilter-list">
            {roster.map((p) => (
              <label key={p.id} className={"pfilter-row" + (p.isMine ? " mine" : "")}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                {p.avatar ? <img src={p.avatar} alt="" /> : <i className="ava" />}
                <span className="pfr-name">{p.name}</span>
                <span className="pc-count">{p.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
