# Crisp Product Specification

## Purpose

Crisp is a voice-first personal task app for iOS, Android, and web. Its promise is: **“Tap once. Talk naturally. Change your mind while speaking. Your tasks fall into place.”** It optimizes for fast, calm task capture rather than feature breadth. The original visual references in [`../design/`](../design/) inform the Crisp visual language, but this specification owns interaction decisions.

## Core flow

At rest, Crisp shows a persistent app shell: Today, Later, and Completed navigation on the left (or its responsive equivalent), with the task workspace on the right. One tap starts a session in that same workspace. Recording never opens a route, screen, modal, or dark-mode replacement. The bottom recorder gains a live audio meter; temporary numbered cards enter at the top of the existing task area in a loose zigzag. There is no finish ritual. A natural pause closes one spoken thought; Crisp transcribes and interprets it, then shows cards and automatically resumes listening. A longer quiet moment commits all draft cards directly to permanent tasks with brief `N added` feedback. Several tasks in one thought must become separate cards. Corrections such as “replace Raju with Rakesh” update the matching active-session card. There is no review, save, confirmation, chatbot, project selection, or priority selection.

## Task and recording session

A `Task` has an `id`, `title`, optional `dueDate` and `dueTime`, `status` (`open` or `completed`), `createdAt`, and optional `sourceSessionId`. A `VoiceSession` has an `id`, lifecycle status (`recording`, `processing`, `committed`, or `failed`), timing metadata, optional transcript, ordered `operations`, and temporary `draftTasks`.

`SessionOperation` is intentionally limited to `create`, `update`, `delete`, `clear`, and `undo`. Create supplies a reference and task data; update supplies a reference and title/date/time patch (where date/time may be cleared); delete supplies a reference. Do not expand this schema without an approved requirement.

## Session boundary and voice commands

Voice supports creating tasks and manipulating only items created in the active session: ordinal delete, correction, clear, and undo. For example, “Delete the second one” may target session item #2; “Delete the task I created yesterday” is unsupported in V1. Existing permanent tasks are never updated or deleted by voice. They can initially be edited through deterministic UI. Sarvam transcribes in the source language and its translated meaning is used only to interpret the operation; task titles retain the spoken script where possible.

## Organization and completion

Committed open tasks appear in Today or Later. Completed is a separate reachable view for completed tasks; completion is reversible. Temporary task references disappear at commit, leaving ordinary aligned task rows. Persisted state must result only from validated operations applied by deterministic code.

## Cross-platform and error expectations

The flow, wording, and component architecture are the same across platforms. Platform-specific code may handle audio capture, permission, files, safe areas, pointer behavior, and haptics only. A natural pause of roughly 1.1 seconds starts processing one thought; a continuous turn is bounded at roughly 12 seconds so an unreliable meter cannot leave it unsent; 30 seconds of quiet commits the session without a countdown. Errors are inline, calm, actionable, and preserve session drafts when possible—never modal, red-text-heavy, or destructive. A stopped retained recording may be recovered for retry after restart. Authentication and optional sync must not block first use.

## UX principles and exclusions

Idle is calm; recording is alive; finished is organized. Keep chrome sparse, metering real rather than decorative, controls smaller than the content they support, and completion explicit. Use comparable voice-capture interaction patterns as inspiration only; do not copy another product’s visual assets, wording, or implementation. Support accessibility and reduced motion, and avoid unnecessary steps. V1 excludes projects, labels, priorities, subtasks, collaboration, teams, complex calendar UI, payments, subscriptions, AI chat, meeting recording, knowledge base, GraphQL, and custom microservice architecture.
