import React, { useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={glyph}>£</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600 }}>Ledger</div>
        </div>

        {!sent ? (
          <>
            <p style={{ fontSize: 14, color: "#4B554E", marginBottom: 16 }}>
              Enter your email — we'll send a one-time link to sign in. No password needed.
            </p>
            <form onSubmit={sendLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
              />
              <button type="submit" disabled={loading} style={btn}>
                {loading ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
            {error && <p style={{ color: "#A6432E", fontSize: 13, marginTop: 10 }}>{error}</p>}
          </>
        ) : (
          <p style={{ fontSize: 14, color: "#2F4D36" }}>
            Check <strong>{email}</strong> for a sign-in link. You can close this tab.
          </p>
        )}
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F3F4EE",
  fontFamily: "IBM Plex Sans, sans-serif",
};
const card = {
  background: "#FBFBF8",
  border: "1px solid #D8D9CE",
  borderRadius: 12,
  padding: "28px 30px",
  width: 340,
};
const glyph = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: "#1D3323",
  color: "#C9A15E",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Fraunces, serif",
  fontSize: 18,
  fontWeight: 700,
};
const input = {
  padding: "10px 12px",
  borderRadius: 7,
  border: "1px solid #D8D9CE",
  fontSize: 14,
  fontFamily: "IBM Plex Sans, sans-serif",
};
const btn = {
  padding: "10px 12px",
  borderRadius: 7,
  border: "none",
  background: "#2F4D36",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
