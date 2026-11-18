import { useEffect, useState } from "react";

// Saves when you leave the field (or press Enter), not on every keystroke,
// so typing "150" doesn't send three requests to the database.
function SettingField({ id, label, value, onCommit, ...rest }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (!draft || draft === String(value)) {
      setDraft(String(value)); // empty or unchanged: restore
      return;
    }
    onCommit(draft);
  };

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        {...rest}
      />
    </div>
  );
}

export default function Settings({ cut, fine, days, canEdit, onChange, onClear }) {
  return (
    <section>
      <h2>Settings</h2>
      <div className="settings">
        <SettingField
          id="cut"
          label="Late after"
          type="time"
          value={cut}
          disabled={!canEdit}
          onCommit={(v) => onChange("cut", v)}
        />
        <SettingField
          id="fine"
          label="Fine (PKR)"
          type="number"
          min="0"
          value={fine}
          disabled={!canEdit}
          onCommit={(v) => onChange("fine", Number(v))}
        />
        <SettingField
          id="days"
          label="Days to pay"
          type="number"
          min="0"
          value={days}
          disabled={!canEdit}
          onCommit={(v) => onChange("days", Number(v))}
        />
      </div>
      {canEdit ? (
        <button
          className="ghost danger clear-btn"
          onClick={() => {
            if (window.confirm("Delete all late records?")) onClear();
          }}
        >
          Clear all late records
        </button>
      ) : (
        <p className="msg">Only an admin can change settings.</p>
      )}
    </section>
  );
}