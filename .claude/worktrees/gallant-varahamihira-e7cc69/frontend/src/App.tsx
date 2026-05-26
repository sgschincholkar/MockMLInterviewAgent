import { useState } from "react";
import Upload from "./components/Upload";
import Interview from "./components/Interview";
import ReportView from "./components/ReportView";
import type { StartResponse } from "./api";

type Screen = "upload" | "interview" | "report";

export default function App() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [firstMessage, setFirstMessage] = useState<{ text: string; audio: string } | null>(null);

  function handleSessionStarted(data: StartResponse) {
    setSessionId(data.session_id);
    setCandidateName(data.candidate_name);
    setFirstMessage({ text: data.message, audio: data.audio_b64 });
    setScreen("interview");
  }

  function handleInterviewDone() {
    setScreen("report");
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {screen === "upload" && (
        <Upload onSessionStarted={handleSessionStarted} />
      )}
      {screen === "interview" && firstMessage && (
        <Interview
          sessionId={sessionId}
          candidateName={candidateName}
          firstMessage={firstMessage}
          onDone={handleInterviewDone}
        />
      )}
      {screen === "report" && (
        <ReportView sessionId={sessionId} candidateName={candidateName} />
      )}
    </div>
  );
}
