export const pad = (n) => String(n).padStart(2, "0");

export const ymd = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const nice = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const t12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
};

export const mins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const sortNames = (arr) => [...arr].sort((a, b) => a.localeCompare(b));

export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const ROLE_LABEL = { admin: "Admin", cashier: "Cashier", staff: "Staff" };