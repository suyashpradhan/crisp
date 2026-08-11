import { mergeTasks } from "./taskSync";

describe("mergeTasks", () => {
  it("keeps the most recently updated copy of each task", () => {
    const local = [{
      bucket: "today" as const, createdAt: "2026-08-11T09:00:00.000Z", id: "task-1", status: "open" as const, title: "Call Rahul", updatedAt: "2026-08-11T09:00:00.000Z",
    }];
    const remote = [{
      bucket: "today" as const, createdAt: "2026-08-11T09:00:00.000Z", id: "task-1", status: "completed" as const, title: "Call Rahul", updatedAt: "2026-08-11T10:00:00.000Z",
    }];

    expect(mergeTasks(local, remote)).toEqual(remote);
  });

  it("retains unsynced local tasks while adding remote tasks", () => {
    const local = [{ bucket: "today" as const, createdAt: "2026-08-11T09:00:00.000Z", id: "local", status: "open" as const, title: "Local" }];
    const remote = [{ bucket: "later" as const, createdAt: "2026-08-11T10:00:00.000Z", id: "remote", status: "open" as const, title: "Remote" }];

    expect(mergeTasks(local, remote).map((task) => task.id)).toEqual(["local", "remote"]);
  });
});
