<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the MockML Interview Agent frontend. The integration covers the full user journey — from landing page CTAs through authentication, resume upload, interview session, and final report — with user identification tied to Supabase auth.

**Changes made:**

- `src/main.tsx` — PostHog initialized with `posthog.init()` and app wrapped in `PostHogProvider`
- `src/App.tsx` — Users identified via `posthog.identify()` on login (both session restore and magic link), `posthog.reset()` on logout, `user_signed_out` event captured
- `src/components/LandingPage.tsx` — `sign_in_requested` event captured on all three CTA buttons (nav, hero, bottom), with a `source` property to distinguish them
- `src/components/AuthModal.tsx` — `magic_link_sent` and `magic_link_error` events captured
- `src/components/Upload.tsx` — `resume_selected` (with file name + size), `interview_started`, and `interview_start_error` events captured
- `src/components/Interview.tsx` — `answer_submitted` (with `input_mode: voice|text` and `phase`), `interview_phase_advanced`, and `interview_completed` events captured
- `src/components/ReportView.tsx` — `report_viewed` event captured with `recommendation` and `overall_score` properties
- `frontend/.env` — `VITE_PUBLIC_POSTHOG_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` env vars set

| Event | Description | File |
|---|---|---|
| `sign_in_requested` | User clicks any Sign in / Start Interview CTA | `src/components/LandingPage.tsx` |
| `magic_link_sent` | Magic link email successfully sent | `src/components/AuthModal.tsx` |
| `magic_link_error` | Error when sending magic link | `src/components/AuthModal.tsx` |
| `resume_selected` | User selects or drops a PDF resume | `src/components/Upload.tsx` |
| `interview_started` | Session successfully created after upload | `src/components/Upload.tsx` |
| `interview_start_error` | Error starting interview session | `src/components/Upload.tsx` |
| `answer_submitted` | Candidate submits an answer (text or voice) | `src/components/Interview.tsx` |
| `interview_phase_advanced` | Interview advances to next phase | `src/components/Interview.tsx` |
| `interview_completed` | Interview finishes, moves to report | `src/components/Interview.tsx` |
| `report_viewed` | Performance report loaded successfully | `src/components/ReportView.tsx` |
| `user_signed_out` | User clicks Sign out | `src/App.tsx` |

## Next steps

We've built a dashboard and five insights to track user behavior and conversions:

- [Analytics basics dashboard](/dashboard/1630183)
- [Full conversion funnel](/insights/bF3oyP5U) — sign_in_requested → magic_link_sent → interview_started → interview_completed → report_viewed
- [Interviews completed over time](/insights/SxDNRCAH) — daily started vs completed trends
- [Sign-in requests by source](/insights/DHFBU07C) — which CTA is most effective (nav / hero_cta / bottom_cta)
- [Answer submissions by input mode](/insights/uxYHgf5o) — voice vs text usage during interviews
- [Interview start & auth errors](/insights/nfQ3gE40) — monitor error rates

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
