import { initialTasks } from "@/src/domain/mockData";

import { appReducer, createInitialState } from "./appReducer";

describe("appReducer", () => {
  it("applies validated voice operations only to the active session", () => {
    const initial = createInitialState(initialTasks);
    const recording = appReducer(initial, {
      id: "session-1",
      startedAt: Date.UTC(2026, 7, 11, 9),
      type: "startSession",
    });
    const updated = appReducer(recording, {
      operations: [{ ref: "1", task: { dueDate: "tomorrow", dueTime: "3 PM", title: "Call Rahul" }, type: "create" }],
      receivedAt: new Date(2026, 7, 11, 9),
      type: "applySessionOperations",
    });

    expect(updated.sessionStatus).toBe("recording");
    expect(updated.session?.draftTasks).toEqual([
      expect.objectContaining({ dueDate: "2026-08-12", dueTime: "15:00", reference: "1", title: "Call Rahul" }),
    ]);
    expect(updated.tasks).toEqual(initialTasks);
  });

  it("commits only the interpreted active-session drafts after transcription", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      id: "session-1",
      startedAt: 1000,
      type: "startSession",
    });
    const processing = appReducer(recording, {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 2300,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      type: "recordingStopped",
    });
    const committed = appReducer(processing, {
      committedAt: new Date(2026, 7, 11, 9).getTime(),
      receivedAt: new Date(2026, 7, 11, 9),
      transcript: "Call Rahul tomorrow at 3 PM.",
      type: "transcriptionSucceeded",
    });

    expect(processing.sessionStatus).toBe("processing");
    expect(processing.lastRecording?.uri).toBe("file:///recording.m4a");
    expect(committed.sessionStatus).toBe("idle");
    expect(committed.lastRecording).toBeNull();
    expect(committed.savedCount).toBe(1);
    expect(committed.tasks).toHaveLength(initialTasks.length + 1);
    expect(committed.tasks.at(-1)).toEqual(expect.objectContaining({
      bucket: "later",
      sourceSessionId: "session-1",
      title: "Call Rahul",
    }));
  });

  it("does not commit any tasks if transcript interpretation fails", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      id: "session-1",
      startedAt: 1000,
      type: "startSession",
    });
    const processing = appReducer(recording, {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 1000,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      type: "recordingStopped",
    });
    const failed = appReducer(processing, {
      committedAt: 1000,
      transcript: "   ",
      type: "transcriptionSucceeded",
    });

    expect(failed.sessionStatus).toBe("failed");
    expect(failed.tasks).toEqual(initialTasks);
    expect(failed.processingError?.retryable).toBe(false);
  });

  it("shows each interpreted turn as a temporary card before quiet-time commit", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      id: "session-1",
      startedAt: 1000,
      type: "startSession",
    });
    const processing = appReducer(recording, {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 1000,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      type: "recordingStopped",
    });
    const live = appReducer(processing, {
      operations: [
        { ref: "1", task: { dueTime: "4 PM", title: "Call Raju" }, type: "create" },
        { ref: "2", task: { dueTime: "3 PM", title: "Call Abhishek" }, type: "create" },
        { ref: "3", task: { title: "Bring groceries on the way home" }, type: "create" },
      ],
      transcript: "Call Raju at 4 PM, call Abhishek at 3 PM, and bring groceries on the way home.",
      type: "turnProcessed",
    });
    const correctionProcessing = appReducer(live, {
      recording: {
        createdAt: "2026-08-11T09:00:02.000Z",
        durationMs: 800,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///correction.m4a",
      },
      type: "recordingStopped",
    });
    const changed = appReducer(correctionProcessing, {
      operations: [{ patch: { title: "Call Rakesh" }, ref: "1", type: "update" }],
      transcript: "Replace Raju with Rakesh.",
      type: "turnProcessed",
    });
    const committed = appReducer(changed, { committedAt: Date.UTC(2026, 7, 11, 9), type: "commitLiveSession" });

    expect(live.tasks).toEqual(initialTasks);
    expect(live.session?.draftTasks).toHaveLength(3);
    expect(changed.session?.draftTasks[0]).toEqual(expect.objectContaining({ title: "Call Rakesh" }));
    expect(committed.tasks.slice(-3).map((task) => task.title)).toEqual([
      "Call Rakesh",
      "Call Abhishek",
      "Bring groceries on the way home",
    ]);
  });

  it("does not change permanent tasks when a session operation is invalid", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      id: "session-1",
      startedAt: 1000,
      type: "startSession",
    });
    const invalid = appReducer(recording, {
      operations: [{ ref: "outside-session", type: "delete" }],
      type: "applySessionOperations",
    });

    expect(invalid.sessionError).toBe("Item outside-session is not in this session.");
    expect(invalid.tasks).toEqual(initialTasks);
  });

  it("restores a stopped session in a retryable state without changing tasks", () => {
    const restored = appReducer(createInitialState(initialTasks), {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 1200,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      session: {
        draftTasks: [],
        history: [],
        id: "session-1",
        operations: [],
        startedAt: "2026-08-11T09:00:00.000Z",
      },
      type: "restoreSession",
    });

    expect(restored.sessionStatus).toBe("failed");
    expect(restored.processingError?.retryable).toBe(true);
    expect(restored.tasks).toEqual(initialTasks);
  });

  it("lets a person discard an unrecoverable retained recording and begin again", () => {
    const restored = appReducer(createInitialState(initialTasks), {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 1200,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      session: {
        draftTasks: [], history: [], id: "session-1", operations: [], startedAt: "2026-08-11T09:00:00.000Z",
      },
      type: "restoreSession",
    });
    const cleared = appReducer(restored, { type: "discardSession" });

    expect(cleared.sessionStatus).toBe("idle");
    expect(cleared.session).toBeNull();
    expect(cleared.lastRecording).toBeNull();
  });

  it("interprets a transcript into temporary tasks after recording stops", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      id: "session-1",
      startedAt: 1000,
      type: "startSession",
    });
    const processing = appReducer(recording, {
      recording: {
        createdAt: "2026-08-11T09:00:00.000Z",
        durationMs: 1000,
        fileName: "crisp-recording.m4a",
        mimeType: "audio/m4a",
        uri: "file:///recording.m4a",
      },
      type: "recordingStopped",
    });
    const interpreted = appReducer(processing, {
      receivedAt: new Date(2026, 7, 11, 9),
      transcript: "Call Rahul tomorrow at 3 PM.",
      type: "applyTranscript",
    });

    expect(interpreted.session?.transcript).toBe("Call Rahul tomorrow at 3 PM.");
    expect(interpreted.session?.draftTasks[0]).toEqual(expect.objectContaining({ reference: "1", title: "Call Rahul" }));
    expect(interpreted.tasks).toEqual(initialTasks);
  });

  it("toggles completion through deterministic UI state", () => {
    const initial = createInitialState(initialTasks);
    const toggled = appReducer(initial, { type: "toggleTask", id: "task-brief" });

    expect(toggled.tasks.find((task) => task.id === "task-brief")?.status).toBe("completed");
    expect(initial.tasks.find((task) => task.id === "task-brief")?.status).toBe("open");
  });
});
