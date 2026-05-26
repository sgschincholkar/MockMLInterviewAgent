import { useState } from "react";
import AuthModal from "./AuthModal";
import { usePostHog } from "@posthog/react";

interface Props {
  onAuth: () => void;
}

const PHASES = [
  {
    number: "01",
    title: "Background",
    desc: "Warm-up based on your résumé. Sets context for everything that follows.",
    icon: "👤",
  },
  {
    number: "02",
    title: "Project Deep-Dive",
    desc: "Russian Doll drilling on your most significant project. Expect to be pushed.",
    icon: "🔬",
  },
  {
    number: "03",
    title: "Second Deep-Dive",
    desc: "Same rigour applied to your second project or research work.",
    icon: "🧪",
  },
  {
    number: "04",
    title: "Technical Q&A",
    desc: "ML questions matched to your expertise via semantic search across 78 questions.",
    icon: "🧠",
  },
  {
    number: "05",
    title: "Behavioural",
    desc: "Vision, teamwork, communication, and whether you ask questions back.",
    icon: "🎯",
  },
];

const DRILL_CONVERSATION = [
  { role: "interviewer", text: "Walk me through how your RAG pipeline works." },
  { role: "candidate", text: "I used LangChain to build a retrieval pipeline with a vector store." },
  { role: "interviewer", text: "What vector store, and why that one?" },
  { role: "candidate", text: "Pinecone. It was easy to set up." },
  { role: "interviewer", text: "How does Pinecone index vectors internally? What algorithm does it use?" },
  { role: "candidate", text: "I'm not sure of the exact algorithm." },
  { role: "interviewer", text: "Have you heard of HNSW? Can you explain what it does?" },
];

const MOCK_SCORES = [
  { label: "Background", score: "N/A" },
  { label: "Project Deep-Dive", score: "8/10" },
  { label: "Second Deep-Dive", score: "6/10" },
  { label: "Technical Q&A", score: "7.5/10" },
  { label: "Behavioural", score: "7/10" },
];

export default function LandingPage({ onAuth }: Props) {
  const [showAuth, setShowAuth] = useState(false);
  const posthog = usePostHog();

  function openAuth(source: string) {
    posthog?.capture("sign_in_requested", { source });
    setShowAuth(true);
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const heroSection: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "4rem 1.5rem",
    position: "relative",
    overflow: "hidden",
  };

  const gradientOrb1: React.CSSProperties = {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    top: "10%",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  };

  const gradientOrb2: React.CSSProperties = {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
    bottom: "5%",
    right: "10%",
    pointerEvents: "none",
  };

  const badge: React.CSSProperties = {
    display: "inline-block",
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "var(--accent)",
    borderRadius: 999,
    padding: "0.35rem 1rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
    marginBottom: "1.5rem",
  };

  const headline: React.CSSProperties = {
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: "1.25rem",
    letterSpacing: "-0.02em",
    maxWidth: 720,
  };

  const subheadline: React.CSSProperties = {
    fontSize: "clamp(1rem, 2vw, 1.2rem)",
    color: "var(--text-muted)",
    lineHeight: 1.7,
    maxWidth: 560,
    marginBottom: "2.5rem",
  };

  const ctaBtn: React.CSSProperties = {
    background: "var(--accent)",
    color: "#fff",
    padding: "0.9rem 2.2rem",
    borderRadius: 10,
    fontSize: "1rem",
    fontWeight: 700,
    boxShadow: "0 0 32px rgba(99,102,241,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
  };

  const sectionWrap: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "5rem 1.5rem",
  };

  const sectionLabel: React.CSSProperties = {
    color: "var(--accent)",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "0.75rem",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
    fontWeight: 800,
    marginBottom: "0.75rem",
    letterSpacing: "-0.01em",
  };

  const sectionSub: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: "1rem",
    lineHeight: 1.7,
    maxWidth: 560,
    marginBottom: "3rem",
  };

  const divider: React.CSSProperties = {
    borderTop: "1px solid var(--border)",
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 2rem",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        background: "rgba(15,17,23,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 50,
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
          <span style={{ color: "var(--accent)" }}>Mock</span>ML
        </div>
        <button onClick={() => openAuth("nav")} style={{
          background: "var(--accent)",
          color: "#fff",
          padding: "0.5rem 1.25rem",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.875rem",
        }}>
          Sign in
        </button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={heroSection}>
        <div style={gradientOrb1} />
        <div style={gradientOrb2} />
        <div style={badge}>AI-Powered Mock Interviews for ML Engineers</div>
        <h1 style={headline}>
          The AI interviewer that{" "}
          <span style={{ color: "var(--accent)" }}>doesn't go easy</span>{" "}
          on you.
        </h1>
        <p style={subheadline}>
          Upload your résumé and face a structured 5-phase technical interview — with
          real drill-down questioning, voice responses, and a scored performance report
          at the end.
        </p>
        <button
          style={ctaBtn}
          onClick={() => openAuth("hero_cta")}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 48px rgba(99,102,241,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(99,102,241,0.35)";
          }}
        >
          Start Your Interview →
        </button>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "1rem" }}>
          Free · No password · Just your email
        </p>
      </section>

      <div style={divider} />

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={sectionWrap}>
        <div style={sectionLabel}>How it works</div>
        <h2 style={sectionTitle}>Three steps. One honest assessment.</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}>
          {[
            { step: "01", title: "Upload your résumé", desc: "Drop your PDF. The AI reads your projects, skills, and experience to personalise every question." },
            { step: "02", title: "Go through the interview", desc: "5 phases, voice-enabled. The interviewer keeps drilling until it finds your ceiling — or confirms your mastery." },
            { step: "03", title: "Get your report", desc: "Scores per phase, written feedback, and a hiring recommendation: Strong Hire, Hire, or No Hire." },
          ].map(item => (
            <div key={item.step} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "2rem",
            }}>
              <div style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "var(--accent)",
                letterSpacing: "0.1em",
                marginBottom: "0.75rem",
              }}>
                STEP {item.step}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{item.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={divider} />

      {/* ── 5 PHASES ───────────────────────────────────────────────────────── */}
      <section style={sectionWrap}>
        <div style={sectionLabel}>Interview structure</div>
        <h2 style={sectionTitle}>5 phases. Each one harder than the last.</h2>
        <p style={sectionSub}>
          Modelled on how senior ML engineers actually interview — not surface-level questions,
          but deep technical interrogation of your real work.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}>
          {PHASES.map(phase => (
            <div key={phase.number} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.5rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }}>
              <div style={{ fontSize: "1.75rem", lineHeight: 1 }}>{phase.icon}</div>
              <div>
                <div style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.1em",
                  marginBottom: "0.25rem",
                }}>
                  PHASE {phase.number}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>{phase.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={divider} />

      {/* ── RUSSIAN DOLL ───────────────────────────────────────────────────── */}
      <section style={{ ...sectionWrap }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <div style={sectionLabel}>The differentiator</div>
            <h2 style={{ ...sectionTitle, marginBottom: "1rem" }}>
              The Russian Doll method
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.75, marginBottom: "1rem" }}>
              Most interviewers — and most AI tools — ask surface-level questions and move on.
              MockML doesn't.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.75, marginBottom: "1rem" }}>
              Like a real senior engineer, it keeps drilling deeper into every answer until
              you either demonstrate mastery or hit your limit. It finds exactly where your
              understanding ends.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.75 }}>
              Correct answers are acknowledged with "Noted." and the next question comes immediately.
              No praise. No hand-holding. Just honest depth.
            </p>
          </div>

          {/* Mock conversation */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            maxHeight: 420,
            overflowY: "auto",
          }}>
            <div style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              marginBottom: "0.25rem",
            }}>
              LIVE EXAMPLE — PROJECT DEEP-DIVE
            </div>
            {DRILL_CONVERSATION.map((turn, i) => (
              <div key={i} style={{
                alignSelf: turn.role === "candidate" ? "flex-end" : "flex-start",
                background: turn.role === "candidate" ? "var(--candidate-bg)" : "var(--interviewer-bg)",
                borderRadius: 10,
                padding: "0.7rem 0.9rem",
                maxWidth: "85%",
              }}>
                <div style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: "0.3rem",
                  textTransform: "uppercase",
                }}>
                  {turn.role === "interviewer" ? "MockML" : "You"}
                </div>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{turn.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={divider} />

      {/* ── REPORT PREVIEW ─────────────────────────────────────────────────── */}
      <section style={sectionWrap}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={sectionLabel}>What you get</div>
          <h2 style={sectionTitle}>A real performance report</h2>
          <p style={{ ...sectionSub, margin: "0 auto" }}>
            Every interview ends with a scored breakdown and a hiring recommendation
            — the same way a real interview panel would debrief.
          </p>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "2rem",
          maxWidth: 720,
          margin: "0 auto",
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Arjun Sharma</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>ML Engineer · May 2026</div>
            </div>
            <div style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--success)",
              borderRadius: 999,
              padding: "0.35rem 1rem",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}>
              ✓ Hire
            </div>
          </div>

          {/* Score grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            {MOCK_SCORES.map(s => (
              <div key={s.label} style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "1rem",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  marginBottom: "0.25rem",
                }}>
                  {s.score}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {s.label}
                </div>
              </div>
            ))}
            <div style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 10,
              padding: "1rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)", marginBottom: "0.25rem" }}>
                28.5/40
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Overall</div>
            </div>
          </div>

          {/* Narrative preview */}
          <div style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "1.25rem",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}>
            "Arjun demonstrated strong implementation knowledge across both projects, particularly in the RAG pipeline
            deep-dive. Struggled at the mathematical level on indexing internals but recovered well in the behavioural
            phase with clear communication and thoughtful questions..."
          </div>
        </div>
      </section>

      <div style={divider} />

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section style={{
        textAlign: "center",
        padding: "6rem 1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <h2 style={{
          fontSize: "clamp(1.75rem, 4vw, 2.8rem)",
          fontWeight: 800,
          marginBottom: "1rem",
          letterSpacing: "-0.02em",
        }}>
          Ready to find out where you stand?
        </h2>
        <p style={{
          color: "var(--text-muted)",
          fontSize: "1rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}>
          Takes 30–45 minutes. Completely free. No account password required.
        </p>
        <button
          style={{ ...ctaBtn, fontSize: "1.05rem", padding: "1rem 2.5rem" }}
          onClick={() => openAuth("bottom_cta")}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 48px rgba(99,102,241,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(99,102,241,0.35)";
          }}
        >
          Start Your Interview →
        </button>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          <span style={{ color: "var(--accent)" }}>Mock</span>ML Interview Agent
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          © 2026 · Built for ML Engineers who want honest feedback
        </div>
      </footer>

      {/* ── AUTH MODAL ─────────────────────────────────────────────────────── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
