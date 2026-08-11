import { initialTasks, mockedSessionTasks } from "@/src/domain/mockData";

import { appReducer, createInitialState } from "./appReducer";

describe("appReducer", () => {
  it("keeps permanent tasks intact while a mocked session is recording", () => {
    const initial = createInitialState(initialTasks);
    const next = appReducer(initial, { type: "startSession", startedAt: 1000 });

    expect(next.sessionStatus).toBe("recording");
    expect(next.sessionTasks).toEqual(mockedSessionTasks);
    expect(next.tasks).toEqual(initialTasks);
  });

  it("commits session drafts only after processing completes", () => {
    const recording = appReducer(createInitialState(initialTasks), {
      type: "startSession",
      startedAt: 1000,
    });
    const processing = appReducer(recording, { type: "stopSession" });
    const committed = appReducer(processing, { type: "finishProcessing" });

    expect(processing.sessionStatus).toBe("processing");
    expect(committed.sessionStatus).toBe("idle");
    expect(committed.sessionTasks).toEqual([]);
    expect(committed.savedCount).toBe(mockedSessionTasks.length);
    expect(committed.tasks).toHaveLength(initialTasks.length + mockedSessionTasks.length);
    expect(committed.tasks[0]?.sourceSessionId).toBe("mock-session");
  });

  it("toggles completion through deterministic UI state", () => {
    const initial = createInitialState(initialTasks);
    const toggled = appReducer(initial, { type: "toggleTask", id: "task-brief" });

    expect(toggled.tasks.find((task) => task.id === "task-brief")?.status).toBe("completed");
    expect(initial.tasks.find((task) => task.id === "task-brief")?.status).toBe("open");
  });
});
