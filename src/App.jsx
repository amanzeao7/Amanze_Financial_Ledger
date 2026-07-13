import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import FinanceTracker from "./FinanceTracker";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Sans, sans-serif", color: "#4B554E" }}>
        Loading…
      </div>
    );
  }

  return session ? <FinanceTracker session={session} /> : <Auth />;
}
