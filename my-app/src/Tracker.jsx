import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import Stats from "./components/Stats";
import StudentList from "./components/StudentList";
import ManualEntry from "./components/ManualEntry";
import RecordsTable from "./components/RecordsTable";
import Settings from "./components/Settings";
import UserControl from "./components/UserControl";
import * as api from "./db";
import { supabase } from "./supabaseClient";
import { hhmm, mins, sameName, sortNames, ymd } from "./utils";

const LOCAL_KEY = "lateComersData"; // where the old localStorage version saved data
const EMPTY = { students: [], records: [], cut: "15:30", fine: 50, days: 7 };
const DUPLICATE = "23505"; // Postgres unique-violation code

// force = true marks someone late even if the clock is before the cutoff
function makeRecord(name, date, time, { cut, fine, days }, force = false) {
  if (!force && mins(time) <= mins(cut)) return null; // on time, no record
  const due = new Date(date + "T00:00:00");
  due.setDate(due.getDate() + Number(days));
  return { name, date, time, fine: Number(fine), due: ymd(due), paid: false };
}

function readLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return s && (s.students?.length || s.records?.length) ? s : null;
  } catch {
    return null;
  }
}

export default function Tracker() {
  const [data, setData] = useState(EMPTY);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(readLocal);
  const [me, setMe] = useState({ id: "", email: "", role: "staff" });

  const isAdmin = me.role === "admin";
  const canRecord = isAdmin || me.role === "cashier";

  const load = useCallback(async () => {
    try {
      const [{ students, records, settings }, myself] = await Promise.all([
        api.loadAll(),
        api.getMe(),
      ]);
      setMe(myself);
      setData({
        students: sortNames(students),
        records,
        cut: settings?.cut ?? EMPTY.cut,
        fine: settings?.fine ?? EMPTY.fine,
        days: settings?.days ?? EMPTY.days,
      });
      setError("");
    } catch (e) {
      setError(e.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // shows the error banner and returns null so callers know it failed
  const report = (e) => {
    setError(e.message || "Something went wrong.");
    return null;
  };

  /* ---------- actions (each saves to Supabase, then updates the screen) ---------- */

  // true = added, false = ignored (blank/duplicate), null = error
  const addStudent = async (name) => {
    if (!isAdmin) return report(new Error("Only an admin can add students."));
    const v = name.trim();
    if (!v || data.students.some((s) => sameName(s, v))) return false;
    try {
      await api.insertStudent(v);
      setData((d) => ({ ...d, students: sortNames([...d.students, v]) }));
      return true;
    } catch (e) {
      return e.code === DUPLICATE ? false : report(e);
    }
  };

  const removeStudent = async (name) => {
    if (!isAdmin) {
      report(new Error("Only an admin can remove students."));
      return;
    }
    try {
      await api.deleteStudent(name);
      setData((d) => ({ ...d, students: d.students.filter((s) => s !== name) }));
    } catch (e) {
      report(e);
    }
  };

  // marks the chosen students late right now.
  // returns { added, skipped } or null on error
  const markLate = async (names) => {
    if (!canRecord) {
      return report(new Error("Only an admin or cashier can record late arrivals."));
    }
    const n = new Date();
    const date = ymd(n);
    const time = hhmm(n);
    // don't fine the same student twice on the same day
    const alreadyLate = new Set(
      data.records.filter((r) => r.date === date).map((r) => r.name.toLowerCase())
    );
    const todo = names.filter((s) => !alreadyLate.has(s.toLowerCase()));
    const skipped = names.length - todo.length;
    if (!todo.length) return { added: 0, skipped };
    try {
      const rows = await api.insertRecords(
        todo.map((s) => makeRecord(s, date, time, data, true))
      );
      setData((d) => ({ ...d, records: [...d.records, ...rows] }));
      return { added: rows.length, skipped };
    } catch (e) {
      return report(e);
    }
  };

  // manual entry (any date/time). Late only if after the cutoff.
  // true = late (saved), false = on time, null = error
  const addManual = async (name, date, time) => {
    if (!canRecord) {
      return report(new Error("Only an admin or cashier can record late arrivals."));
    }
    const rec = makeRecord(name, date, time, data);
    try {
      let newStudent = false;
      const known = data.students.some((s) => sameName(s, name));
      if (!known && !isAdmin) {
        throw new Error(
          "Only an admin can add new student names. Pick a name from the list."
        );
      }
      if (!known) {
        try {
          await api.insertStudent(name);
          newStudent = true;
        } catch (e) {
          if (e.code !== DUPLICATE) throw e;
        }
      }
      const saved = rec ? await api.insertRecord(rec) : null;
      setData((d) => ({
        ...d,
        students: newStudent ? sortNames([...d.students, name]) : d.students,
        records: saved ? [...d.records, saved] : d.records,
      }));
      return !!rec;
    } catch (e) {
      return report(e);
    }
  };

  const togglePaid = async (id) => {
    const rec = data.records.find((r) => r.id === id);
    if (!rec) return;
    try {
      await api.setPaid(id, !rec.paid);
      setData((d) => ({
        ...d,
        records: d.records.map((r) => (r.id === id ? { ...r, paid: !r.paid } : r)),
      }));
    } catch (e) {
      report(e);
    }
  };

  const removeRecord = async (id) => {
    try {
      await api.deleteRecord(id);
      setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
    } catch (e) {
      report(e);
    }
  };

  const clearRecords = async () => {
    try {
      await api.deleteAllRecords();
      setData((d) => ({ ...d, records: [] }));
    } catch (e) {
      report(e);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.saveSettings({ [key]: value });
      setData((d) => ({ ...d, [key]: value }));
    } catch (e) {
      report(e);
    }
  };

  // one-time move of data saved by the old localStorage version
  const importLocal = async () => {
    try {
      const names = new Map();
      [...(local.students || []), ...(local.records || []).map((r) => r.name)].forEach(
        (n) => {
          const t = String(n).trim();
          if (t && !names.has(t.toLowerCase())) names.set(t.toLowerCase(), t);
        }
      );
      await api.insertStudents([...names.values()]);
      await api.insertRecords(
        (local.records || []).map((r, i) => ({
          name: r.name,
          date: r.date,
          time: r.time,
          fine: Number(r.fine),
          due: r.due,
          paid: !!r.paid,
          created_at: new Date(Date.now() + i).toISOString(), // keeps the old order
        }))
      );
      await api.saveSettings({
        cut: local.cut ?? EMPTY.cut,
        fine: Number(local.fine ?? EMPTY.fine),
        days: Number(local.days ?? EMPTY.days),
      });
      // keep a backup copy, then stop offering the import
      localStorage.setItem(LOCAL_KEY + "_backup", localStorage.getItem(LOCAL_KEY));
      localStorage.removeItem(LOCAL_KEY);
      setLocal(null);
      await load();
    } catch (e) {
      report(e);
    }
  };

  /* ---------- derived values ---------- */
  const today = ymd(now);
  const sum = (list) => list.reduce((a, r) => a + r.fine, 0);
  const todays = data.records.filter((r) => r.date === today);
  const lateToday = new Set(todays.map((r) => r.name.toLowerCase()));
  const stats = {
    today: todays.length,
    total: data.records.length,
    unpaid: sum(data.records.filter((r) => !r.paid)),
    paid: sum(data.records.filter((r) => r.paid)),
  };

  if (loading) {
    return (
      <div className="wrap">
        <p className="msg">Loading…</p>
      </div>
    );
  }

  const canImport = local && isAdmin && !data.students.length && !data.records.length;

  return (
    <div className="wrap">
      <Header
        now={now}
        cut={data.cut}
        fine={data.fine}
        me={me}
        onSignOut={() => supabase.auth.signOut()}
      />

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button className="ghost" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {canImport && (
        <div className="banner">
          <span>
            Found {local.students?.length || 0} students and{" "}
            {local.records?.length || 0} records saved in this browser.
          </span>
          <button className="ghost" onClick={importLocal}>
            Import to database
          </button>
        </div>
      )}

      <Stats stats={stats} />

      <div className="grid">
        <div>
          <StudentList
            students={data.students}
            canManage={isAdmin}
            canRecord={canRecord}
            lateToday={lateToday}
            fine={data.fine}
            onAdd={addStudent}
            onRemove={removeStudent}
            onMarkLate={markLate}
          />
          {canRecord && (
            <ManualEntry
              students={data.students}
              canAddNames={isAdmin}
              cut={data.cut}
              fine={data.fine}
              onAdd={addManual}
            />
          )}
        </div>

        <div>
          <RecordsTable
            records={data.records}
            canPay={canRecord}
            canDelete={isAdmin}
            onTogglePaid={togglePaid}
            onRemove={removeRecord}
          />
          <Settings
            cut={data.cut}
            fine={data.fine}
            days={data.days}
            canEdit={isAdmin}
            onChange={updateSetting}
            onClear={clearRecords}
          />
          {isAdmin && <UserControl myId={me.id} />}
        </div>
      </div>
    </div>
  );
}