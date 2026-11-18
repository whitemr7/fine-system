export default function Stats({ stats }) {
  return (
    <div className="stats">
      <div className="stat">
        <b>{stats.today}</b>
        <span>Late today</span>
      </div>
      <div className="stat">
        <b>{stats.total}</b>
        <span>Total late records</span>
      </div>
      <div className="stat">
        <b>{stats.unpaid} PKR</b>
        <span>Unpaid fines</span>
      </div>
      <div className="stat">
        <b>{stats.paid} PKR</b>
        <span>Fines collected</span>
      </div>
    </div>
  );
}