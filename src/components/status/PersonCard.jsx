import { useState } from "react";
import { TaskCard } from "./TaskCard.jsx";

export function PersonCard({ person }) {
  const [showStale, setShowStale] = useState(false);
  const stale = person.stale || [];
  return (
    <div className="person">
      <div className="person-head">
        {person.avatar ? <img src={person.avatar} alt="" /> : <span className="ava" />}
        <div>
          <div className="pname">{person.name}</div>
          <div className="muted small">{person.team} · {person.items.length} in sprint</div>
        </div>
      </div>
      {person.items.map((it) => <TaskCard key={it.key} it={it} />)}

      {stale.length > 0 && (
        <div className="stale-wrap">
          <button className="stale-toggle" onClick={() => setShowStale(!showStale)} aria-expanded={showStale}>
            {showStale ? "▾" : "▸"} {stale.length} tasks outside the sprint (may have been forgotten)
          </button>
          {showStale && (
            <div className="stale-list">
              {stale.map((it) => <TaskCard key={it.key} it={it} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
