# Crisp Roadmap

Milestones are sequential. Do not begin a later milestone without explicit approval; put related new ideas in [`../BACKLOG.md`](../BACKLOG.md).

## Milestone 0 — Universal static UI (complete)

Create the Expo foundation with Expo Router, shared design tokens, Today/Later, the Completed shell where specified, `TaskRow`, `RecordingButton`, `SessionTask`, mocked recording state, and mocked `AudioMeter`. Stop returns to idle. No microphone, Sarvam, backend, or authentication.

## Milestone 1 — Real audio

Add microphone permission, real recording, timer, Stop behavior, real amplitude metering, and recording retention. No AI.

## Milestone 2 — Sarvam STT

Add a secure server boundary for recorded audio to Sarvam, transcript handling, retryable errors, and English-first support. Never put Sarvam credentials in the client.

## Milestone 3 — Structured voice operations

Interpret transcript into `SessionOperation[]`, validate with Zod, and apply through a deterministic reducer. Support create, update, delete, clear, undo, and date/time handling inside the active session boundary.

## Milestone 4 — End-to-end V0

Complete Record → Speak → Stop → Transcribe → Interpret → Apply → Commit, with local task persistence.

## Milestone 5 — V1 quality

Polish interactions and errors; add session recovery, Hinglish evaluation, silence behavior, haptics, and accessibility.

## Milestone 6 — Sync

Only after the local experience works: add Supabase, optional Google authentication, and cross-device task synchronization. Authentication remains optional for first use.

## Milestone 7 — Launch

Finish responsive web polish, landing page, privacy work, analytics, production builds, and release QA.
