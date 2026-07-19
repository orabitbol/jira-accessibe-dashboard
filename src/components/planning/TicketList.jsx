import { typeClass } from "../../utils/labels.js";

export function TicketList({ rows }) {
  return (
    <div className="tickets">
      {rows.map((it) => (
        <a key={it.key} className={"ticket" + (it.missing ? " miss" : "")} href={it.webUrl} target="_blank" rel="noreferrer">
          <span className={"badge " + typeClass(it.type)}>{it.type}</span>
          <span className="t-key">{it.key}</span>
          <span className="t-sum">{it.summary}</span>
          <span className="t-assignee">{it.avatar ? <img src={it.avatar} alt="" /> : <i className="ava" />}{it.assignee}</span>
          <span className="t-status">{it.status}</span>
          {it.missing ? <span className="sp-miss">ללא SP</span> : <span className="sp-ok">{it.points} SP</span>}
        </a>
      ))}
    </div>
  );
}
