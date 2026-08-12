# Transcription Boundary

`POST /api/transcribe` is an Expo Router server route for one natural speech turn. It sends the retained audio to Sarvam twice: `transcribe` preserves the source-language transcript and `translate` supplies English intent to a server-side structured-operation interpreter. The client receives only the source transcript plus validated `SessionOperation[]`; it must never call Sarvam directly.

## Configuration

Copy `.env.example` to `.env` for local **web** development and set `SARVAM_API_KEY` to an API key created in the Sarvam dashboard. This variable is intentionally not prefixed with `EXPO_PUBLIC_`; Expo keeps API-route environment variables server-side. Add the same secret to the environment of the deployed server, never to an Expo client build or source control.

For iOS and Android, deploy the Expo Router API route behind HTTPS and set `EXPO_PUBLIC_TRANSCRIPTION_API_URL` to its full URL (for example, `https://api.example.com/api/transcribe`) before building the app. A native app does not contain or run API routes, so it cannot use the browser-only relative `/api/transcribe` default. On web, `npm run web` can use that same-origin default when the local server has `SARVAM_API_KEY`. The key must have access to Saaras STT and Sarvam chat completions (`sarvam-105b`).

## Request and response

Send `multipart/form-data` with:

- `audio`: a non-empty supported audio file up to 10 MB.
- `languageCode`: `unknown` (Sarvam detects the language).
- `session`: a JSON snapshot of active draft task references. It can never include permanent tasks.

The successful response is `{ transcript, translation, operations, languageCode, providerRequestId }`. Supported MIME types include AAC, M4A/MP4, MP3, OGG/Opus, WAV, WebM, and FLAC. The route uses Saaras v3 with auto-detection, preserves the original-language transcript for task titles, and validates operation JSON before it reaches the reducer.

Errors use `{ error: { code, message, retryable } }`. Rate limits return HTTP 429 with `retryable: true` and forward a valid `Retry-After` value; provider availability failures are retryable. Invalid, empty, oversized, and unsupported audio are not retried automatically.

## File-capture client integration and boundary

The retained-file client submits each completed short turn with its current draft references. Sarvam chat may propose operations, but Zod validates those operations and the deterministic reducer applies them only to temporary session drafts before automatic commit. A transcript or operation error commits nothing.

The client uses same-origin `/api/transcribe` by default only on web. For a deployed native build, `EXPO_PUBLIC_TRANSCRIPTION_API_URL` is mandatory and contains only the public endpoint, not a secret. The Sarvam key remains server-only. Retryable provider and network errors preserve the recording and session and offer an inline retry; successful commit clears the in-memory recording and cleans up the native retained file.

For gap-free capture, use the secure WebSocket relay described in [LIVE_CAPTURE.md](LIVE_CAPTURE.md). It supersedes this route only when all live-capture public configuration values are present; otherwise this file route remains the safe fallback.
