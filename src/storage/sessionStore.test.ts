import { createSessionStore } from "./sessionStore";

const recovered = {
  recording: {
    createdAt: "2026-08-11T09:00:00.000Z",
    durationMs: 1000,
    fileName: "crisp-recording.m4a",
    mimeType: "audio/m4a" as const,
    uri: "file:///recording.m4a",
  },
  session: {
    draftTasks: [],
    history: [],
    id: "session-1",
    operations: [],
    startedAt: "2026-08-11T09:00:00.000Z",
  },
};

describe("sessionStore", () => {
  it("keeps a stopped recording recoverable until it is resolved", async () => {
    const values = new Map<string, string>();
    const store = createSessionStore({
      getItem: jest.fn(async (key) => values.get(key) ?? null),
      removeItem: jest.fn(async (key) => { values.delete(key); }),
      setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    });

    await store.save(recovered);
    await expect(store.load()).resolves.toEqual(recovered);
    await store.clear();
    await expect(store.load()).resolves.toBeNull();
  });
});
