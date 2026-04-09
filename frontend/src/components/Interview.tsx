import { useEffect, useRef, useState } from "react";
import { respondAudio, respondText, playAudio } from "../api";

interface Message {
  role: "interviewer" | "candidate";
  text: string;
}

interface Props {
  sessionId: string;
  candidateName: string;
  firstMessage: { text: string; audio: string };
  onDone: () => void;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Background",
  2: "Project Deep-Dive #1",
  3: "Project Deep-Dive #2",
  4: "Technical Q&A",
  5: "Behavioural",
};

export default function Interview({ sessionId, candidateName, firstMessage, onDone }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "interviewer", text: firstMessage.text },
  ]);
  const [phase, setPhase] = useState(1);
  const [textInput, setTextInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Play first message on mount (if TTS available)
  useEffect(() => {
    if (firstMessage.audio) playAudio(firstMessage.audio);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleResponse(audioBlob?: Blob) {
    setLoading(true);
    setError("");
    try {
      const data = audioBlob
        ? await respondAudio(sessionId, audioBlob)
        : await respondText(sessionId, textInput.trim());

      const candidateText = audioBlob ? data.candidate_text : textInput.trim();
      setMessages((prev) => [
        ...prev,
        { role: "candidate", text: candidateText },
        { role: "interviewer", text: data.message },
      ]);
      setPhase(data.phase);
      setTextInput("");
      if (data.audio_b64) playAudio(data.audio_b64);

      if (data.done) {
        setTimeout(onDone, 2000);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        handleResponse(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim() || loading) return;
    handleResponse();
  }

  return (
    <div style={styles.layout}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <span style={styles.headerTitle}>MockML Interview</span>
          <span style={styles.headerName}> — {candidateName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {!firstMessage.audio && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--surface2)", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid var(--border)" }}>
              Text mode
            </span>
          )}
          <PhaseBar phase={phase} />
        </div>
      </div>

      {/* Chat transcript */}
      <div style={styles.transcript}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(m.role === "interviewer" ? styles.interviewerBubble : styles.candidateBubble),
            }}
          >
            <span style={styles.roleLabel}>
              {m.role === "interviewer" ? "Interviewer" : candidateName}
            </span>
            <p style={styles.bubbleText}>{m.text}</p>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.interviewerBubble }}>
            <span style={styles.roleLabel}>Interviewer</span>
            <p style={{ ...styles.bubbleText, color: "var(--text-muted)" }}>Thinking…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleTextSubmit} style={styles.inputRow}>
          <input
            style={styles.textInput}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your answer…"
            disabled={loading || recording}
          />
          <button
            type="submit"
            style={styles.sendBtn}
            disabled={!textInput.trim() || loading || recording}
          >
            Send
          </button>
          <button
            type="button"
            style={{
              ...styles.micBtn,
              background: recording ? "var(--danger)" : "var(--surface2)",
            }}
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
          >
            {recording ? "⏹ Stop" : "🎙 Record"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PhaseBar({ phase }: { phase: number }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((p) => (
        <div
          key={p}
          title={PHASE_LABELS[p]}
          style={{
            width: 28,
            height: 6,
            borderRadius: 3,
            background: p <= phase ? "var(--accent)" : "var(--border)",
            transition: "background 0.3s",
          }}
        />
      ))}
      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: 4 }}>
        {PHASE_LABELS[phase]}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "var(--bg)",
  },
  header: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "1rem 1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: { fontWeight: 700, fontSize: "1rem" },
  headerName: { color: "var(--text-muted)", fontSize: "0.9rem" },
  transcript: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  bubble: {
    maxWidth: "70%",
    padding: "0.85rem 1.1rem",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  interviewerBubble: {
    background: "var(--interviewer-bg)",
    border: "1px solid var(--border)",
    alignSelf: "flex-start",
  },
  candidateBubble: {
    background: "var(--candidate-bg)",
    alignSelf: "flex-end",
  },
  roleLabel: { fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" },
  bubbleText: { fontSize: "0.95rem", lineHeight: 1.55 },
  inputBar: {
    background: "var(--surface)",
    borderTop: "1px solid var(--border)",
    padding: "1rem 1.5rem",
    flexShrink: 0,
  },
  inputRow: { display: "flex", gap: "0.6rem" },
  textInput: {
    flex: 1,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.65rem 1rem",
    color: "var(--text)",
    fontSize: "0.95rem",
    outline: "none",
  },
  sendBtn: {
    background: "var(--accent)",
    color: "#fff",
    padding: "0.65rem 1.2rem",
  },
  micBtn: {
    color: "var(--text)",
    padding: "0.65rem 1rem",
    border: "1px solid var(--border)",
  },
  error: { color: "var(--danger)", fontSize: "0.82rem", marginBottom: "0.5rem" },
};
