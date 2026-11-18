import { useState } from "react";
import { hhmm, sameName, t12, ymd } from "../utils";

export default function ManualEntry({ students, canAddNames, cut, fine, onAdd }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => ymd(new Date()));
  const [time, setTime] = useState(() => hhmm(new Date()));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const typed = name.trim();
    if (!typed || !date || !time) {
      setMsg("Enter a name, date and time.");
      return;
    }
    // use the saved spelling if the student already exists
    const match = students.find((s) => sameName(s, typed));
    if (!match && !canAddNames) {
      setMsg("That name isn't on the list. Only an admin can add new students.");
      return;
    }
    const n = match ?? typed;
    setBusy(true);
    const late = await onAdd(n, date, time);
    setBusy(false);
    if (late === null) return; // error banner is already showing
    setName("");
    const now = new Date();
    setDate(ymd(now));
    setTime(hhmm(now));
    setMsg(
      late
        ? `${n} added as late (${t12(time)}). Fine: ${fine} PKR.`
        : `${n} at ${t12(time)} is on time (before ${t12(cut)}). No fine, nothing saved.`
    );
  };

  return (
    <section>
      <h2>Manual entry</h2>
      <label htmlFor="mName">Student name</label>
      <input
        id="mName"
        list="mList"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={canAddNames ? "Type or choose a name" : "Choose a name"}
        autoComplete="off"
      />
      <datalist id="mList">
        {students.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="settings two">
        <div>
          <label htmlFor="mDate">Date</label>
          <input
            id="mDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="mTime">Arrival time</label>
          <input
            id="mTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <button onClick={submit} disabled={busy}>
        Add record
      </button>
      <p className="msg">{msg}</p>
    </section>
  );
}