// All database calls live here so components never talk to Supabase directly.
import { supabase } from "./supabaseClient";

const check = ({ error }) => {
  if (error) throw error;
};

// Row Level Security blocks updates/deletes silently (0 rows, no error),
// so "nothing changed" is treated as a permission problem.
const changed = ({ data, error }, message) => {
  if (error) throw error;
  if (!data.length) throw new Error(message);
};

export async function loadAll() {
  const [s, r, c] = await Promise.all([
    supabase.from("students").select("name"),
    supabase.from("records").select("*").order("created_at", { ascending: true }),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  check(s);
  check(r);
  check(c);
  return {
    students: s.data.map((x) => x.name),
    records: r.data,
    settings: c.data, // may be null if the row is missing
  };
}

// who is signed in, and what role do they have?
export async function getMe() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { id: "", email: "", role: "staff" };
  const { data, error } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { id: user.id, email: user.email ?? "", role: data?.role ?? "staff" };
}

/* ---------- students ---------- */

export async function insertStudent(name) {
  check(await supabase.from("students").insert({ name }));
}

export async function insertStudents(names) {
  if (!names.length) return;
  check(await supabase.from("students").insert(names.map((name) => ({ name }))));
}

export async function deleteStudent(name) {
  changed(
    await supabase.from("students").delete().eq("name", name).select(),
    "Only an admin can remove students."
  );
}

/* ---------- records ---------- */

export async function insertRecord(record) {
  const { data, error } = await supabase
    .from("records")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// inserts several rows and returns them (with their new ids)
export async function insertRecords(records) {
  if (!records.length) return [];
  const { data, error } = await supabase.from("records").insert(records).select();
  if (error) throw error;
  return data;
}

export async function setPaid(id, paid) {
  changed(
    await supabase.from("records").update({ paid }).eq("id", id).select(),
    "You don't have permission to change fines."
  );
}

export async function deleteRecord(id) {
  changed(
    await supabase.from("records").delete().eq("id", id).select(),
    "Only an admin can delete records."
  );
}

export async function deleteAllRecords() {
  // Supabase requires a filter on delete, so match every row
  check(await supabase.from("records").delete().not("id", "is", null));
}

/* ---------- settings ---------- */

export async function saveSettings(patch) {
  changed(
    await supabase.from("settings").update(patch).eq("id", 1).select(),
    "Only an admin can change settings."
  );
}

/* ---------- user control (goes through the manage-users Edge Function) ---------- */

async function callUsers(body) {
  const { data, error } = await supabase.functions.invoke("manage-users", { body });
  if (error) {
    let message = error.message;
    try {
      const j = await error.context.json(); // the function's own error text
      if (j?.error) message = j.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const listUsers = async () => (await callUsers({ action: "list" })).users;
export const createUser = (email, password, role) =>
  callUsers({ action: "create", email, password, role });
export const setUserRole = (userId, role) =>
  callUsers({ action: "set_role", userId, role });
export const deleteUser = (userId) => callUsers({ action: "delete", userId });