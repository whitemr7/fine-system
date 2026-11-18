import { mins, ROLE_LABEL, t12 } from "../utils";

export default function Header({ now, cut, fine, me, onSignOut }) {
  const isLate = now.getHours() * 60 + now.getMinutes() > mins(cut);

  return (
    <header>
      <div>
        <h1>Late Comers</h1>
        <div className="sub">Student late arrival and fine tracker</div>
        <div className="who">
          {me?.email && (
            <>
              <span className={`tag role-${me.role}`}>{ROLE_LABEL[me.role]}</span>
              <span>{me.email}</span>
            </>
          )}
          {/* always shown, even if loading your account failed */}
          {onSignOut && (
            <button className="ghost signout" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <div className="clock">
        <div id="time">
          {now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
        <div id="date">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
        <span id="status" className={isLate ? "s-late" : "s-ok"}>
          {isLate
            ? `Late period (after ${t12(cut)}): ${fine} PKR fine`
            : `On time until ${t12(cut)}`}
        </span>
      </div>
    </header>
  );
}