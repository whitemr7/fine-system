import { nice, t12 } from "../utils";

export default function RecordsTable({
  records,
  canPay,
  canDelete,
  onTogglePaid,
  onRemove,
}) {
  const rows = [...records].reverse(); // newest first

  return (
    <section>
      <h2>Late students</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Arrived</th>
              <th>Fine</th>
              <th>Due date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.name}</b>
                </td>
                <td>{nice(r.date)}</td>
                <td>{t12(r.time)}</td>
                <td>{r.fine} PKR</td>
                <td>{nice(r.due)}</td>
                <td>
                  <span className={`tag ${r.paid ? "paid" : "unpaid"}`}>
                    {r.paid ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td>
                  {canPay && (
                    <button className="ghost" onClick={() => onTogglePaid(r.id)}>
                      {r.paid ? "Undo" : "Mark paid"}
                    </button>
                  )}{" "}
                  {canDelete && (
                    <button className="ghost danger" onClick={() => onRemove(r.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty">No late students yet.</div>}
    </section>
  );
}