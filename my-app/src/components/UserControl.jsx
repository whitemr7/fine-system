import { useCallback, useEffect, useState } from "react";
import * as api from "../db";
import { ROLE_LABEL } from "../utils";

const friendly = (m) =>
  /failed to send|not found|404/i.test(m)
    ? "Can't reach the manage-users function. Deploy it in Supabase (Edge Functions) first."
    : m;

export default function UserControl({ myId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      setMsg(friendly(e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // runs an action, refreshes the list, shows a result message
  const run = async (action, okMsg) => {
    setBusy(true);
    setMsg("");
    try {
      await action();
      await load();
      setMsg(okMsg);
    } catch (e) {
      setMsg(friendly(e.message));
    } finally {
      setBusy(false);
    }
  };

  const create = (e) => {
    e.preventDefault();
    const mail = email.trim();
    run(async () => {
      await api.createUser(mail, password, role);
      setEmail("");
      setPassword("");
      setRole("staff");
    }, `Account created for ${mail}. They can sign in now.`);
  };

  const changeRole = (u, newRole) =>
    run(
      () => api.setUserRole(u.id, newRole),
      `${u.email} is now ${ROLE_LABEL[newRole]}.`
    );

  const remove = (u) => {
    if (!window.confirm(`Remove ${u.email}? They will no longer be able to sign in.`))
      return;
    run(() => api.deleteUser(u.id), `${u.email} was removed.`);
  };

  return (
    <section>
      <h2>User control</h2>
      <p className="msg" style={{ marginTop: 0 }}>
        Staff can only view. Cashiers can record late arrivals and mark fines paid.
      </p>

      <form onSubmit={create}>
        <div className="settings">
          <div>
            <label htmlFor="ucEmail">Email</label>
            <input
              id="ucEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label htmlFor="ucPass">Password</label>
            <input
              id="ucPass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="ucRole">Role</label>
            <select id="ucRole" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={busy}>
          Create account
        </button>
      </form>

      {msg && <p className="msg">{msg}</p>}

      <ul className="users">
        {loading ? (
          <li className="empty">Loading users…</li>
        ) : (
          users.map((u) => (
            <li key={u.id}>
              <span className="email">
                <b>{u.email}</b>
                {u.id === myId && " (you)"}
              </span>
              <span className={`tag role-${u.role}`}>{ROLE_LABEL[u.role]}</span>
              {u.role !== "admin" && u.id !== myId && (
                <>
                  <select
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => changeRole(u, e.target.value)}
                    aria-label={`Role for ${u.email}`}
                  >
                    <option value="staff">Staff</option>
                    <option value="cashier">Cashier</option>
                  </select>
                  <button
                    className="ghost danger"
                    disabled={busy}
                    onClick={() => remove(u)}
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}