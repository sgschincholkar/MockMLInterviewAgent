const BASE = "";  // proxied via vite to localhost:8000

export interface StartResponse {
  session_id: string;
  candidate_name: string;
  message: string;
  audio_b64: string;
  phase: number;
  done: boolean;
}

export interface RespondResponse {
  candidate_text: string;
  message: string;
  audio_b64: string;
  phase: number;
  done: boolean;
}

export interface Report {
  candidate_name: string;
  date: string;
  scores: Record<string, string>;
  overall: string;
  recommendation: string;
  narrative: string;
  phase_rationale: Record<string, string>;
}

export async function startSession(pdfFile: File): Promise<StartResponse> {
  const form = new FormData();
  form.append("file", pdfFile);
  const res = await fetch(`${BASE}/session/start`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function respondAudio(
  sessionId: string,
  audioBlob: Blob
): Promise<RespondResponse> {
  const form = new FormData();
  form.append("audio", audioBlob, "audio.webm");
  const res = await fetch(`${BASE}/session/${sessionId}/respond`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function respondText(
  sessionId: string,
  text: string
): Promise<RespondResponse> {
  const form = new FormData();
  form.append("text", text);
  const res = await fetch(`${BASE}/session/${sessionId}/respond`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchReport(sessionId: string): Promise<Report> {
  const res = await fetch(`${BASE}/session/${sessionId}/report`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function playAudio(b64: string): HTMLAudioElement | null {
  if (!b64) return null;
  const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
  audio.play().catch(() => {/* autoplay blocked — ignore */});
  return audio;
}
