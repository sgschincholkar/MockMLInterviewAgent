import { useState } from "react";
import { supabase } from "../supabaseClient";
import { usePostHog } from "@posthog/react";

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const posthog = usePostHog();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      posthog?.capture("magic_link_error", { error_message: err.message });
    } else {
      setSent(true);
      posthog?.capture("magic_link_sent");
    }
  }

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(4px)",
  };

  const modal: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "2.5rem",
    width: "100%",
    maxWidth: 420,
    position: "relative",
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            color: "var(--text-muted)",
            fontSize: "1.2rem",
            lineHeight: 1,
            padding: "0.25rem 0.5rem",
          }}
        >
          ×
        </button>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📬</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Check your inbox
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              We sent a login link to <strong style={{ color: "var(--text)" }}>{email}</strong>.
              Click it to start your interview.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              Sign in to MockML
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Enter your email — we'll send you a login link. No password needed.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  outline: "none",
                  width: "100%",
                }}
              />
              {error && (
                <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "0.75rem",
                  borderRadius: 8,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                }}
              >
                {loading ? "Sending…" : "Send login link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
