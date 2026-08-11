import { createTaskStore, TaskStorageError } from "./taskStore";

const task = {
  bucket: "today" as const,
  createdAt: "2026-08-11T09:00:00.000Z",
  id: "task-1",
  status: "open" as const,
  title: "Call Rahul",
};

describe("taskStore", () => {
  it("returns null before any task has been persisted", async () => {
    const store = createTaskStore({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn() });

    await expect(store.load()).resolves.toBeNull();
  });

  it("validates persisted tasks before returning them", async () => {
    const store = createTaskStore({
      getItem: jest.fn().mockResolvedValue(JSON.stringify([task])),
      setItem: jest.fn(),
    });

    await expect(store.load()).resolves.toEqual([task]);
  });

  it("rejects malformed local data instead of accepting it as tasks", async () => {
    const store = createTaskStore({ getItem: jest.fn().mockResolvedValue('{"title": "missing"}'), setItem: jest.fn() });

    await expect(store.load()).rejects.toBeInstanceOf(TaskStorageError);
  });
});
