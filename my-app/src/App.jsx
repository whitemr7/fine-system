import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import Login from "./components/Login";
import Tracker from "./Tracker";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="wrap">
        <p className="msg">Loading…</p>
      </div>
    );
  }

  return session ? <Tracker /> : <Login />;
}