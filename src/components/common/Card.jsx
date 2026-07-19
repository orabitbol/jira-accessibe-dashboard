export function Card({ title, desc, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {desc && <p className="desc">{desc}</p>}
      {children}
    </div>
  );
}
