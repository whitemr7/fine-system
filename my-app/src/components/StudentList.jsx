import { useRef, useState } from "react";

export default function StudentList({
  students,
  canManage, // admin: add / remove names
  canRecord, // admin + cashier: select names and mark them
  lateToday,
  fine,
  onAdd,
  onRemove,
  onMarkLate,
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // ignore selected names that were removed from the list
  const chosen = students.filter((s) => selected.has(s));
  const allChosen = students.length > 0 && chosen.length === students.length;

  const submit = async () => {
    if (!name.trim()) return;
    const added = await onAdd(name);
    if (added) setName("");
    else inputRef.current?.select(); // duplicate or error: highlight it
  };

  const toggle = (s) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const toggleAll = () => setSelected(allChosen ? new Set() : new Set(students));

  const markLate = async () => {
    if (!chosen.length) return;
    setBusy(true);
    const res = await onMarkLate(chosen);
    setBusy(false);
    if (!res) return; // error banner is already showing
    setSelected(new Set());
    const parts = [];
    if (res.added) parts.push(`${res.added} marked late. Fine: ${fine} PKR each.`);
    if (res.skipped) parts.push(`${res.skipped} already late today, skipped.`);
    setMsg(parts.join(" "));
  };

  // on time: no fine, and (as before) nothing is saved
  const markArrived = () => {
    if (!chosen.length) return;
    setMsg(`${chosen.length} marked as arrived on time. No fine, nothing saved.`);
    setSelected(new Set());
  };

  return (
    <section>
      <h2>Student names</h2>

      {canManage && (
        <div className="row">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Enter student name"
            aria-label="Student name"
          />
          <button onClick={submit}>Add</button>
        </div>
      )}
      {!canManage && (
        <p className="msg">Only an admin can add or remove student names.</p>
      )}

      <ul>
        {students.length ? (
          students.map((s) => (
            <li key={s}>
              {canRecord ? (
                <label className="pick">
                  <input
                    type="checkbox"
                    checked={selected.has(s)}
                    onChange={() => toggle(s)}
                  />
                  {s}
                </label>
              ) : (
                <span>{s}</span>
              )}
              {lateToday.has(s.toLowerCase()) && (
                <span className="tag unpaid">Late today</span>
              )}
              {canManage && (
                <button className="ghost danger" onClick={() => onRemove(s)}>
                  Remove
                </button>
              )}
            </li>
          ))
        ) : (
          <li className="empty">
            {canManage
              ? "Add your first student above."
              : "No students yet. Ask an admin to add them."}
          </li>
        )}
      </ul>

      {canRecord ? (
        <>
          <div className="bulk">
            <button className="ghost" onClick={toggleAll} disabled={!students.length}>
              {allChosen ? "Clear selection" : "Select all"}
            </button>
            <button onClick={markLate} disabled={!chosen.length || busy}>
              Mark late ({chosen.length})
            </button>
            <button onClick={markArrived} disabled={!chosen.length || busy}>
              Mark arrived ({chosen.length})
            </button>
          </div>
          <p className="msg">{msg}</p>
        </>
      ) : (
        <p className="msg">
          Only an admin or cashier can record late arrivals.
        </p>
      )}
    </section>
  );
}