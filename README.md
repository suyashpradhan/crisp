# Crisp

**Tap once. Talk naturally. Change your mind while speaking. Your tasks fall into place.**

Crisp is a deliberately simple voice-first personal task app for iOS, Android, and web. A recording session creates temporary task items that can be corrected, deleted, cleared, or undone by voice. On stop, those items commit directly into Today or Later—without a review or confirmation screen.

## Project status

The local voice pipeline is implemented: a natural speech pause closes one short turn, which is transcribed and interpreted into validated session operations. Temporary cards appear and recording automatically resumes; quiet commits the session to local tasks. It needs the server configuration described below before spoken tasks can save; microphone metering alone does not prove transcription is connected. Tasks persist locally first and optional Supabase sync never blocks capture; voice data may only change the active session.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md) — product behavior, boundaries, and V1 scope.
- [Roadmap](docs/ROADMAP.md) — approved implementation milestones.
- [Backlog](BACKLOG.md) — explicitly deferred ideas.
- [`design/`](design/) — authoritative visual specifications.
- [`references/`](references/) — matching final HTML visual reference exports.
- [Transcription boundary](docs/TRANSCRIPTION.md) — local configuration and the Sarvam request contract.

The current visual source files are at `design/` rather than `docs/design/`. Treat them as authoritative unless they are deliberately relocated in a reviewed change.

## Planned stack

The foundation uses Expo, React Native, TypeScript, Expo Router, React Native Web, Reanimated, Expo Audio, Expo Haptics, Expo AuthSession, Expo FileSystem, AsyncStorage, Supabase, Zod, and a reducer.

## Commands

- `npm start` — start Expo.
- `npm run ios`, `npm run android`, `npm run web` — open the relevant platform.
- `npm run typecheck`, `npm run lint`, `npm test` — validate code and reducer behavior.

For web development, copy `.env.example` to `.env` and set `SARVAM_API_KEY` only in the server environment. Never use an `EXPO_PUBLIC_` key for Sarvam. Native apps need a deployed HTTPS API route and its public `EXPO_PUBLIC_TRANSCRIPTION_API_URL`; it contains no secret. See [Transcription boundary](docs/TRANSCRIPTION.md) for the exact split.

Optional Supabase sync needs the two publishable Supabase environment values and the RLS migration in [docs/SYNC.md](docs/SYNC.md). It is intentionally disabled without those values or a signed-in user, so local capture never waits for authentication.

## Contributing

Read [AGENTS.md](AGENTS.md), the product specification, and the relevant visual handoff before changing code or documentation. Keep implementation within the current roadmap milestone and record new ideas in `BACKLOG.md` rather than building them early.
