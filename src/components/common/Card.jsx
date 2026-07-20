export function Card({ title, desc, icon, children }) {
  return (
    <div className="card">
      <h2>{icon && <span className="card-icon">{icon}</span>}{title}</h2>
      {desc && <p className="desc">{desc}</p>}
      {children}
    </div>
  );
}
