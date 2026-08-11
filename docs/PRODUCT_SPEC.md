# Crisp Product Specification

## Purpose

Crisp is a voice-first personal task app for iOS, Android, and web. Its promise is: **“Tap once. Talk naturally. Change your mind while speaking. Your tasks fall into place.”** It optimizes for fast, calm task capture rather than feature breadth. Visual decisions, responsive behavior, assets, and motion are defined in [`../design/`](../design/), especially `DESIGN_HANDOFF.md`.

## Core flow

At rest, Crisp shows Today and Later with an immediately available microphone. One tap starts recording. While recording, the product enters the focused Dusk environment, existing tasks recede, and a temporary session board receives interpreted items. Tap Stop (or `Esc` on web) to end the session; later, continuous silence may do the same. Processing commits directly to permanent tasks, returns to the light environment, and gives brief `N added` or `Saved` feedback. There is no review, save, confirmation, chatbot, project selection, or priority selection.

## Task and recording session

A `Task` has an `id`, `title`, optional `dueDate` and `dueTime`, `status` (`open` or `completed`), `createdAt`, and optional `sourceSessionId`. A `VoiceSession` has an `id`, lifecycle status (`recording`, `processing`, `committed`, or `failed`), timing metadata, optional transcript, ordered `operations`, and temporary `draftTasks`.

`SessionOperation` is intentionally limited to `create`, `update`, `delete`, `clear`, and `undo`. Create supplies a reference and task data; update supplies a reference and title/date/time patch (where date/time may be cleared); delete supplies a reference. Do not expand this schema without an approved requirement.

## Session boundary and voice commands

Voice supports creating tasks and manipulating only items created in the active session: ordinal delete, correction, clear, and undo. For example, “Delete the second one” may target session item #2; “Delete the task I created yesterday” is unsupported in V1. Existing permanent tasks are never updated or deleted by voice. They can initially be edited through deterministic UI.

## Organization and completion

Committed open tasks appear in Today or Later. Completed is a separate reachable view for completed tasks; completion is reversible. Temporary task references disappear at commit, leaving ordinary aligned task rows. Persisted state must result only from validated operations applied by deterministic code.

## Cross-platform and error expectations

The flow, wording, and component architecture are the same across platforms. Platform-specific code may handle audio capture, permission, files, safe areas, pointer behavior, and haptics only. Errors are inline, calm, actionable, and preserve session drafts when possible—never modal, red-text-heavy, or destructive. Authentication must not block first use.

## UX principles and exclusions

Idle is calm; recording is alive; finished is organized. Keep chrome sparse, meter real microphone input rather than decorative animation, support accessibility and reduced motion, and avoid unnecessary steps. V1 excludes projects, labels, priorities, subtasks, collaboration, teams, complex calendar UI, payments, subscriptions, AI chat, meeting recording, knowledge base, GraphQL, and custom microservice architecture.
