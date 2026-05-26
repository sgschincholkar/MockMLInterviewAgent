import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";
import LandingPage from "./components/LandingPage";
import Upload from "./components/Upload";
import Interview from "./components/Interview";
import ReportView from "./components/ReportView";
import type { StartResponse } from "./api";
import { usePostHog } from "@posthog/react";

type Screen = "landing" | "upload" | "interview" | "report";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [firstMessage, setFirstMessage] = useState<{ text: string; audio: string } | null>(null);
  const posthog = usePostHog();

  // On mount: check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setUser(u);
        setScreen("upload");
        posthog?.identify(u.id, { email: u.email });
      }
    });

    // Listen for login via magic link (user clicks email link → tab updates)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser(u);
        setScreen("upload");
        posthog?.identify(u.id, { email: u.email });
      } else {
        setUser(null);
        setScreen("landing");
        posthog?.reset();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function handleSessionStarted(data: StartResponse) {
    setSessionId(data.session_id);
    setCandidateName(data.candidate_name);
    setFirstMessage({ text: data.message, audio: data.audio_b64 });
    setScreen("interview");
  }

  function handleInterviewDone() {
    setScreen("report");
  }

  async function handleLogout() {
    posthog?.capture("user_signed_out");
    await supabase.auth.signOut();
    setUser(null);
    setScreen("landing");
  }

  // Small user badge shown in Interview + Report headers
  const userBadge = user ? (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      fontSize: "0.8rem",
      color: "var(--text-muted)",
    }}>
      <span>{user.email}</span>
      <button
        onClick={handleLogout}
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          padding: "0.25rem 0.6rem",
          borderRadius: 6,
          fontSize: "0.75rem",
        }}
      >
        Sign out
      </button>
    </div>
  ) : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {screen === "landing" && (
        <LandingPage onAuth={() => setScreen("upload")} />
      )}
      {screen === "upload" && (
        <Upload onSessionStarted={handleSessionStarted} userBadge={userBadge} />
      )}
      {screen === "interview" && firstMessage && (
        <Interview
          sessionId={sessionId}
          candidateName={candidateName}
          firstMessage={firstMessage}
          onDone={handleInterviewDone}
          userBadge={userBadge}
        />
      )}
      {screen === "report" && (
        <ReportView sessionId={sessionId} candidateName={candidateName} userBadge={userBadge} />
      )}
    </div>
  );
}
