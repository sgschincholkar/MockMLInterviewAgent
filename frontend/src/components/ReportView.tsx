import { useEffect, useState } from "react";
import { fetchReport } from "../api";
import type { Report, TokenUsage } from "../api";

interface Props {
  sessionId: string;
  candidateName: string;
}

export default function ReportView({ sessionId, candidateName }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReport(sessionId)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <CenteredMsg>Generating your report…</CenteredMsg>;
  if (error) return <CenteredMsg error>{error}</CenteredMsg>;
  if (!report) return null;

  const recColor =
    report.recommendation === "Strong Hire"
      ? "#22c55e"
      : report.recommendation === "Hire"
      ? "#6366f1"
      : "#ef4444";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.banner}>
          <h1 style={styles.title}>Performance Report</h1>
          <p style={styles.meta}>
            {candidateName} &nbsp;·&nbsp; {report.date} &nbsp;·&nbsp; Machine Learning Engineer
          </p>
        </div>

        {/* Scores grid */}
        <div style={styles.scoresGrid}>
          {Object.entries(report.scores).map(([phase, score]) => (
            <div key={phase} style={styles.scoreCard}>
              <span style={styles.scoreLabel}>{phase.replace("phase", "Phase ")}</span>
              <span style={styles.scoreValue}>{score}</span>
              {report.phase_rationale[phase] && (
                <p style={styles.scoreNote}>{report.phase_rationale[phase]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Overall */}
        <div style={styles.overallRow}>
          <span style={styles.overallLabel}>Overall Interview Readiness</span>
          <span style={styles.overallScore}>{report.overall}</span>
        </div>

        {/* Recommendation */}
        <div style={{ ...styles.recommendation, borderColor: recColor }}>
          <span style={{ color: recColor, fontWeight: 700, fontSize: "1.1rem" }}>
            {report.recommendation}
          </span>
        </div>

        {/* Narrative */}
        <div style={styles.narrative}>
          <h3 style={styles.sectionTitle}>Detailed Feedback</h3>
          {report.narrative.split("\n\n").map((para, i) => (
            <p key={i} style={styles.naraPara}>
              {para}
            </p>
          ))}
        </div>

        {/* Token Usage */}
        {report.token_usage && Object.keys(report.token_usage.by_operation).length > 0 && (
          <TokenUsageSection usage={report.token_usage} />
        )}
      </div>
    </div>
  );
}

function TokenUsageSection({ usage }: { usage: TokenUsage }) {
  const OP_LABELS: Record<string, string> = {
    pdf_parse: "PDF Parse",
    llm_chat: "LLM Chat",
    embedding: "Embeddings",
    stt: "Speech-to-Text",
    tts: "Text-to-Speech",
  };

  return (
    <div style={styles.tokenSection}>
      <div style={styles.tokenHeader}>
        <h3 style={styles.sectionTitle}>API Usage & Cost</h3>
        <span style={styles.totalCost}>
          Est. total: ${usage.total_cost_usd.toFixed(4)}
        </span>
      </div>
      <table style={styles.tokenTable}>
        <thead>
          <tr>
            <th style={styles.th}>Operation</th>
            <th style={styles.th}>Calls</th>
            <th style={styles.th}>Tokens in</th>
            <th style={styles.th}>Tokens out</th>
            <th style={styles.th}>Chars</th>
            <th style={styles.th}>Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(usage.by_operation).map(([op, stats]) => (
            <tr key={op}>
              <td style={styles.td}>{OP_LABELS[op] ?? op}</td>
              <td style={styles.tdNum}>{stats.calls}</td>
              <td style={styles.tdNum}>{stats.input_tokens > 0 ? stats.input_tokens.toLocaleString() : "—"}</td>
              <td style={styles.tdNum}>{stats.output_tokens > 0 ? stats.output_tokens.toLocaleString() : "—"}</td>
              <td style={styles.tdNum}>{stats.char_count > 0 ? stats.char_count.toLocaleString() : "—"}</td>
              <td style={styles.tdNum}>${stats.cost_usd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={styles.costNote}>* Cost estimates are approximate. Prices based on published API rates.</p>
    </div>
  );
}

function CenteredMsg({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: error ? "var(--danger)" : "var(--text-muted)" }}>{children}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: "auto",
    background: "var(--bg)",
    display: "flex",
    justifyContent: "center",
    padding: "2rem",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "760px",
    display: "flex",
    flexDirection: "column",
    gap: "1.75rem",
  },
  banner: { textAlign: "center" },
  title: { fontSize: "1.8rem", fontWeight: 700 },
  meta: { color: "var(--text-muted)", marginTop: "0.4rem", fontSize: "0.9rem" },
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "0.75rem",
  },
  scoreCard: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  scoreLabel: { fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" },
  scoreValue: { fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" },
  scoreNote: { fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4, marginTop: "0.25rem" },
  overallRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "1rem 1.25rem",
  },
  overallLabel: { fontWeight: 600 },
  overallScore: { fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" },
  recommendation: {
    border: "2px solid",
    borderRadius: "10px",
    padding: "1rem 1.25rem",
    textAlign: "center",
  },
  narrative: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 600, color: "var(--text-muted)" },
  naraPara: { fontSize: "0.92rem", lineHeight: 1.65, color: "var(--text)" },
  tokenSection: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  tokenHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  totalCost: { fontSize: "0.95rem", fontWeight: 600, color: "var(--accent)" },
  tokenTable: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" },
  th: {
    textAlign: "left" as const,
    padding: "0.45rem 0.6rem",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  td: { padding: "0.4rem 0.6rem", borderBottom: "1px solid var(--border)", color: "var(--text)" },
  tdNum: { padding: "0.4rem 0.6rem", borderBottom: "1px solid var(--border)", color: "var(--text)", textAlign: "right" as const },
  costNote: { fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" },
};
