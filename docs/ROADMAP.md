# Crisp Roadmap

Milestones are sequential. Do not begin a later milestone without explicit approval; put related new ideas in [`../BACKLOG.md`](../BACKLOG.md).

## Milestone 0 — Universal static UI (complete)

Create the Expo foundation with Expo Router, shared design tokens, Today/Later, the Completed shell where specified, `TaskRow`, `RecordingButton`, `SessionTask`, mocked recording state, and mocked `AudioMeter`. Stop returns to idle. No microphone, Sarvam, backend, or authentication.

## Milestone 1 — Real audio (complete)

Microphone permission, recorder-driven duration, Stop behavior, real amplitude metering, and recording retention are implemented with Expo Audio and Expo FileSystem. Native recordings copy from temporary capture storage into the document directory; web keeps the browser recording URI. No AI is involved.

## Milestone 2 — Sarvam STT (server boundary complete)

The secure Expo Router boundary, Sarvam adapter, transcript contract, and retryable error mapping are implemented for English (`en-IN`). It is ready to receive Milestone 1 retained audio during Milestone 4. No live key is committed. Never put Sarvam credentials in the client.

## Milestone 3 — Structured voice operations (complete)

The narrow transcript interpreter emits `SessionOperation[]`, validates them with Zod, and applies them atomically through a deterministic reducer. It supports create, update, delete, clear, undo, and date/time normalization inside the active-session boundary. It never mutates permanent tasks; a future model adapter must retain this boundary.

## Milestone 4 — End-to-end V0 (complete)

Record → Speak → Stop → Transcribe → Interpret → Apply → Commit is implemented. The client sends retained audio to the secure server route, the transcript is validated and interpreted into active-session operations, then a deterministic reducer commits resulting tasks atomically. Local tasks persist with AsyncStorage; retryable transcription failures preserve the recording and session for retry.

## Milestone 5 — V1 quality (complete)

The app now has ambient-aware input smoothing, a near-silence breath state after 4.2 seconds, automatic session commit after 30 seconds of quiet, and a 12-second maximum live turn so a metering edge case cannot keep speech unsent. It also has start/stop/completion haptics, keyboard equivalents on web, and improved live-region semantics. Stopped recordings survive restart for retry. Hinglish evaluation is documented before language support is expanded.

## Milestone 6 — Sync (complete, configuration required)

Supabase task replication, merge-by-`updated_at`, persisted auth sessions, and an optional Google OAuth helper are implemented. Sync remains local-first and stays off until public Supabase configuration, RLS, and a user session exist. See [`SYNC.md`](SYNC.md); authentication never blocks first use.

## Milestone 7 — Launch

Finish responsive web polish, landing page, privacy work, analytics, production builds, and release QA.

## Milestone 8 — Continuous capture (in progress)

Automatic pause-delimited turns, temporary live session cards, automatic quiet-time commit, multilingual Sarvam transcription, and server-side structured interpretation are implemented. The current Expo SDK records each natural turn as a short file, so a brief processing gap remains between thoughts. Upgrade to an Expo Audio release with PCM `useAudioStream` and add a server-side Sarvam WebSocket relay before claiming gap-free streaming transcription.
