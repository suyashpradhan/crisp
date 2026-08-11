# Repository Guidelines

## Crisp in brief

Crisp is a voice-first personal task app: tap once, speak naturally, adjust tasks while speaking, and let the session commit into an organized list. It is intentionally not a general-purpose task manager.

## Sources of truth

Read existing code and these documents before editing. The authoritative visual specifications currently live in `design/`: `DESIGN_HANDOFF.md`, `MOTION_SPEC.md`, `RESPONSIVE_SPEC.md`, and `ASSET_MANIFEST.md`. The matching `.dc.html` exports in `references/` are visual references. `docs/PRODUCT_SPEC.md` owns behavior and scope; `docs/ROADMAP.md` owns delivery sequencing; `BACKLOG.md` owns deferred ideas. Do not redesign or duplicate detailed visual tokens outside `design/`.

## Product and platform rules

Ship one Expo + React Native + TypeScript application with Expo Router and React Native Web. iOS, Android, and web share product behavior and component architecture; platform code is only for low-level concerns such as audio, permissions, safe areas, hover, files, and haptics. Recording state—not a user preference—selects the light or Dusk environment.

Voice commands may create, update, delete, clear, or undo **only active-session draft tasks**. Permanent tasks are never voice-mutated in V1. Validate AI-produced `SessionOperation` data with Zod, then apply it through a deterministic reducer; an AI model must never mutate persisted task state directly. Never expose Sarvam credentials in a client.

## Implementation discipline

Prefer strict TypeScript, small modules, accessible universal components, minimal dependencies, and testable reducers. Use React Native Reanimated only where motion quality needs it. Preserve the design’s calm UI, real (never decorative) audio metering, and no-review commit flow.

Do not silently implement later roadmap milestones or ideas in `BACKLOG.md`. Do not add projects, labels, priorities, collaboration, chat, calendar complexity, payments, GraphQL, or custom microservices without an approved requirement.

## Validation

Inspect surrounding code and existing tests before edits. Add or update focused tests for behavior changes, especially reducer transitions and session boundaries. Run the applicable formatter, typecheck, lint, and tests after changes; report any command that is unavailable or failing.
