import { useRef, useState } from "react";
import { startSession } from "../api";
import type { StartResponse } from "../api";
import { usePostHog } from "@posthog/react";

interface Props {
  onSessionStarted: (data: StartResponse) => void;
  userBadge?: React.ReactNode;
}

export default function Upload({ onSessionStarted, userBadge }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const posthog = usePostHog();

  function selectFile(f: File) {
    setFile(f);
    posthog?.capture("resume_selected", { file_name: f.name, file_size_kb: Math.round(f.size / 1024) });
  }

  async function handleStart() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await startSession(file);
      posthog?.capture("interview_started", { session_id: data.session_id, candidate_name: data.candidate_name });
      onSessionStarted(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start session.";
      setError(msg);
      posthog?.capture("interview_start_error", { error_message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {userBadge && (
        <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 10 }}>
          {userBadge}
        </div>
      )}
      <div style={styles.card}>
        <h1 style={styles.title}>MockML Interview Agent</h1>
        <p style={styles.subtitle}>
          AI-powered mock interview for Machine Learning Engineer roles
        </p>

        <div
          style={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f?.type === "application/pdf") selectFile(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
          />
          <span style={styles.dropIcon}>📄</span>
          <p style={styles.dropText}>
            {file ? file.name : "Drop your résumé PDF here or click to browse"}
          </p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.btn}
          onClick={handleStart}
          disabled={!file || loading}
        >
          {loading ? "Parsing résumé…" : "Start Interview"}
        </button>

        <div style={styles.phases}>
          {["Background", "Project Deep-Dive #1", "Project Deep-Dive #2", "Technical Q&A", "Behavioural"].map(
            (p, i) => (
              <span key={i} style={styles.phaseTag}>
                Phase {i + 1}: {p}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "var(--bg)",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "520px",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  title: {
    fontSize: "1.7rem",
    fontWeight: 700,
    color: "var(--text)",
    textAlign: "center",
  },
  subtitle: {
    color: "var(--text-muted)",
    textAlign: "center",
    fontSize: "0.9rem",
  },
  dropzone: {
    border: "2px dashed var(--border)",
    borderRadius: "12px",
    padding: "2rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  dropIcon: { fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" },
  dropText: { color: "var(--text-muted)", fontSize: "0.9rem" },
  btn: {
    background: "var(--accent)",
    color: "#fff",
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    width: "100%",
  },
  error: { color: "var(--danger)", fontSize: "0.85rem", textAlign: "center" },
  phases: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    justifyContent: "center",
  },
  phaseTag: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "0.2rem 0.7rem",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
};
