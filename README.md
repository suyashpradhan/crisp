# Crisp

**Tap once. Talk naturally. Change your mind while speaking. Your tasks fall into place.**

Crisp is a deliberately simple voice-first personal task app for iOS, Android, and web. A recording session creates temporary task items that can be corrected, deleted, cleared, or undone by voice. On stop, those items commit directly into Today or Later—without a review or confirmation screen.

## Project status

Milestone 0 is implemented: it provides a universal Expo static UI with fixture tasks and mocked recording/processing states. Microphone integration, AI interpretation, persistence, authentication, and backend services have not been started.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md) — product behavior, boundaries, and V1 scope.
- [Roadmap](docs/ROADMAP.md) — approved implementation milestones.
- [Backlog](BACKLOG.md) — explicitly deferred ideas.
- [`design/`](design/) — authoritative visual specifications.
- [`references/`](references/) — matching final HTML visual reference exports.

The current visual source files are at `design/` rather than `docs/design/`. Treat them as authoritative unless they are deliberately relocated in a reviewed change.

## Planned stack

The foundation uses Expo, React Native, TypeScript, Expo Router, React Native Web, Reanimated, and a reducer. Zod will validate structured voice operations in Milestone 3.

## Commands

- `npm start` — start Expo.
- `npm run ios`, `npm run android`, `npm run web` — open the relevant platform.
- `npm run typecheck`, `npm run lint`, `npm test` — validate code and reducer behavior.

## Contributing

Read [AGENTS.md](AGENTS.md), the product specification, and the relevant visual handoff before changing code or documentation. Keep implementation within the current roadmap milestone and record new ideas in `BACKLOG.md` rather than building them early.
